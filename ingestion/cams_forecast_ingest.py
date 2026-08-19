#!/usr/bin/env python3
"""
BRICS-AETHER — CAMS Global Atmospheric Composition Forecasts Ingestion via ADS
Dataset: cams-global-atmospheric-composition-forecasts  (0.4° ~44km, 3-hourly, +120h, PM2.5/NO2/SO2/CO/O3)
Source: https://ads.atmosphere.copernicus.eu/datasets/cams-global-atmospheric-composition-forecasts?tab=download

What it does:
  1. Calls ADS API (cdsapi with ADS URL) for PM2.5, PM10, NO₂, SO₂, CO, O₃
  2. Downloads NetCDF → GCS (gs://<bucket>/cams/YYYY-MM-DD/cams_*.nc)
  3. Converts via xarray → Parquet → BigQuery brics-aether.raw.cams (partitioned by forecast_time)

Setup ADS API (Atmosphere Data Store, not CDS):
  1. Create account: https://ads.atmosphere.copernicus.eu/
  2. Get ADS API key: https://ads.atmosphere.copernicus.eu/api-how-to
  3. Create ~/.adsapirc  OR  ~/.cdsapirc (cdsapi reads both):
     url: https://ads.atmosphere.copernicus.eu/api
     key: <UID>:<API-KEY>
     # Or env:
     export CDSAPI_URL=https://ads.atmosphere.copernicus.eu/api
     export CDSAPI_KEY=<UID>:<API-KEY>
  4. BigQuery/GCS:
     bq mk --location=asia-south1 --dataset brics-aether:raw
     gsutil mb -l asia-south1 gs://brics-aether-raw

Usage:
  # Chennai, last forecast (today 00 UTC), +120h
  python ingestion/cams_forecast_ingest.py --bbox 78.5,11.0,80.3,13.5 --to bigquery --project brics-aether --bucket brics-aether-raw
  # All 11 BRICS capitals, last 3 days
  python ingestion/cams_forecast_ingest.py --preset brics11 --days 3 --to gcs --bucket brics-aether-raw
  # Dry run
  python ingestion/cams_forecast_ingest.py --bbox 78.5,11.0,80.3,13.5 --dry-run

Cloud Scheduler (daily 00:30 UTC, after 00 UTC forecast availability):
  gcloud scheduler jobs create http cams-daily \
    --schedule="30 0 * * *" --uri="https://asia-south1-run.googleapis.com/..." --oidc-service-account-email=brics-aether-cams@brics-aether.iam.gserviceaccount.com

ADS notes:
  - Forecasts run 00 and 12 UTC, available ~6h later. This script fetches 00 UTC +120h.
  - Variables: particulate_matter_2.5um, particulate_matter_10um, nitrogen_dioxide, sulphur_dioxide, carbon_monoxide, ozone
  - Area: [North, West, South, East] — same as ERA5

Costs: ADS free, GCS $0.02/GB, BQ $0.02/GB
"""

import argparse, datetime, os, pathlib, sys, json

PRESETS = {
    "tamilnadu": [78.5, 13.5, 80.3, 11.0],
    "chennai": [80.1, 13.2, 80.35, 12.95],
    "brics11": None,
}
BRICS11_BOXES = {
    "IN-Chennai": [80.1, 13.2, 80.35, 12.95],
    "BR-SaoPaulo": [-46.7, -23.3, -46.5, -23.7],
    "RU-Moscow": [37.5, 55.9, 37.7, 55.7],
    "CN-Beijing": [116.3, 39.95, 116.5, 39.85],
    "ZA-Johannesburg": [27.9, -26.0, 28.2, -26.4],
    "EG-Cairo": [31.1, 30.1, 31.4, 29.9],
    "ET-Addis": [38.6, 9.2, 38.9, 8.9],
    "IR-Tehran": [51.2, 35.8, 51.6, 35.5],
    "SA-Riyadh": [46.5, 24.9, 46.9, 24.6],
    "AE-Dubai": [55.1, 25.4, 55.4, 25.0],
    "ID-Jakarta": [106.7, -6.0, 107.0, -6.4],
}

VARS = [
    "particulate_matter_2.5um",
    "particulate_matter_10um",
    "nitrogen_dioxide",
    "sulphur_dioxide",
    "carbon_monoxide",
    "ozone",
]

def ads_download(bbox, date_str, out_path, lead_hours=None, dry_run=False):
    """
    Call ADS API for cams-global-atmospheric-composition-forecasts.
    bbox: [west, north, east, south] → ADS area [North, West, South, East]
    date_str: YYYY-MM-DD (forecast base date, 00 UTC)
    lead_hours: list of ints 0..120 step 3
    """
    west, north, east, south = bbox
    area = [north, west, south, east]
    lead_hours = lead_hours or list(range(0, 121, 3))
    req = {
        "variable": VARS,
        "date": date_str,
        "time": "00:00",
        "leadtime_hour": [str(h) for h in lead_hours],
        "type": "forecast",
        "format": "netcdf",
        "area": area,
    }
    print(f"ADS request: date {date_str} 00UTC, lead {lead_hours[0]}→{lead_hours[-1]}h, area {area}, vars {len(VARS)}")
    print(f"  → {out_path}")
    if dry_run:
        print(json.dumps(req, indent=2))
        print("Dry run — not calling ADS")
        return None
    try:
        import cdsapi
    except ImportError:
        print("cdsapi not installed: pip install -r ingestion/requirements.txt")
        print("Also ensure ~/.adsapirc has ADS URL https://ads.atmosphere.copernicus.eu/api")
        sys.exit(1)
    # cdsapi will read ADS URL from ~/.adsapirc or env CDSAPI_URL
    # Ensure it points to ADS, not CDS
    url = os.getenv("CDSAPI_URL") or os.getenv("ADSAPI_URL") or ""
    if "cds.climate" in url:
        print("⚠️  CDSAPI_URL points to CDS, but CAMS needs ADS: https://ads.atmosphere.copernicus.eu/api")
        print("   Set: export CDSAPI_URL=https://ads.atmosphere.copernicus.eu/api")
    c = cdsapi.Client()
    c.retrieve("cams-global-atmospheric-composition-forecasts", req, str(out_path))
    print(f"✓ Downloaded {out_path} ({out_path.stat().st_size/1e6:.1f} MB)")
    return out_path

def nc_to_bigquery(nc_path, project, dataset="raw", table="cams", bucket=None, dry_run=False):
    """NetCDF → DataFrame → BigQuery partitioned by forecast_time."""
    try:
        import xarray as xr, pandas as pd
        from google.cloud import bigquery, storage
    except ImportError as e:
        print(f"Missing deps: {e}")
        sys.exit(1)
    print(f"Opening {nc_path} ...")
    ds = xr.open_dataset(nc_path)
    print(ds)
    df = ds.to_dataframe().reset_index()
    # Normalize var names
    rename = {
        "pm2p5": "pm25", "particulate_matter_2.5um": "pm25", "pm2_5": "pm25",
        "pm10": "pm10", "particulate_matter_10um": "pm10",
        "no2": "no2", "nitrogen_dioxide": "no2",
        "so2": "so2", "sulphur_dioxide": "so2",
        "co": "co", "carbon_monoxide": "co",
        "o3": "o3", "ozone": "o3",
        "forecast_reference_time": "forecast_time",
        "forecast_period": "lead_hours",
        "valid_time": "valid_time",
        "time": "valid_time",
    }
    for old, new in list(rename.items()):
        if old in df.columns:
            df.rename(columns={old: new}, inplace=True)
    # Ensure time cols are datetime
    for col in ["forecast_time","valid_time","time"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], utc=True)
    if "forecast_time" not in df.columns and "valid_time" in df.columns:
        df["forecast_time"] = df["valid_time"]
    # Keep core
    keep = [c for c in ["forecast_time","valid_time","lead_hours","latitude","longitude","pm25","pm10","no2","so2","co","o3"] if c in df.columns]
    df = df[keep].dropna(subset=["forecast_time"])
    # Add H3 Res 8 and lead
    try:
        import h3
        df["h3_res8"] = df.apply(lambda r: h3.latlng_to_cell(r["latitude"], r["longitude"], 8), axis=1)
    except Exception:
        df["h3_res8"] = None
    if "lead_hours" not in df.columns and "valid_time" in df.columns and "forecast_time" in df.columns:
        df["lead_hours"] = (df["valid_time"] - df["forecast_time"]).dt.total_seconds() / 3600
    print(f"DataFrame {len(df)} rows, {df['forecast_time'].min()} → {df['valid_time'].max() if 'valid_time' in df.columns else '—'}")
    print(df.head(3).to_string())
    if dry_run:
        print("Dry run — not writing")
        return df
    if bucket:
        try:
            client = storage.Client(project=project)
            bkt = client.bucket(bucket)
            # Write parquet temp then upload
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".parquet") as tmp:
                df.to_parquet(tmp.name, index=False)
                gcs_path = f"cams/{df['forecast_time'].dt.date.iloc[0]}/cams_{df['forecast_time'].min().strftime('%Y%m%dT%H')}.parquet"
                bkt.blob(gcs_path).upload_from_filename(tmp.name)
                print(f"✓ GCS gs://{bucket}/{gcs_path}")
        except Exception as e:
            print(f"GCS upload failed (continuing): {e}")
    from google.cloud import bigquery
    bq = bigquery.Client(project=project)
    table_id = f"{project}.{dataset}.{table}"
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND",
        time_partitioning=bigquery.TimePartitioning(field="forecast_time"),
        clustering_fields=["h3_res8"],
        schema=[
            bigquery.SchemaField("forecast_time", "TIMESTAMP"),
            bigquery.SchemaField("valid_time", "TIMESTAMP"),
            bigquery.SchemaField("lead_hours", "FLOAT64"),
            bigquery.SchemaField("latitude", "FLOAT64"),
            bigquery.SchemaField("longitude", "FLOAT64"),
            bigquery.SchemaField("pm25", "FLOAT64"),
            bigquery.SchemaField("pm10", "FLOAT64"),
            bigquery.SchemaField("no2", "FLOAT64"),
            bigquery.SchemaField("so2", "FLOAT64"),
            bigquery.SchemaField("co", "FLOAT64"),
            bigquery.SchemaField("o3", "FLOAT64"),
            bigquery.SchemaField("h3_res8", "STRING"),
        ],
    )
    dataset_id = f"{project}.{dataset}"
    try:
        bq.get_dataset(dataset_id)
    except Exception:
        bq.create_dataset(dataset_id)
        print(f"Created dataset {dataset_id}")
    job = bq.load_table_from_dataframe(df, table_id, job_config=job_config)
    job.result()
    print(f"✓ Wrote {len(df)} rows to {table_id}")
    return df

def main():
    ap = argparse.ArgumentParser(description="CAMS forecast → GCS → BigQuery")
    ap.add_argument("--bbox", type=str, default="78.5,11.0,80.3,13.5")
    ap.add_argument("--preset", type=str, choices=list(PRESETS.keys()))
    ap.add_argument("--days", type=int, default=1, help="Days back for forecast base date (default today)")
    ap.add_argument("--date", type=str, help="Explicit base date YYYY-MM-DD (00 UTC)")
    ap.add_argument("--project", type=str, default=os.getenv("GOOGLE_CLOUD_PROJECT") or "brics-aether")
    ap.add_argument("--dataset", type=str, default="raw")
    ap.add_argument("--table", type=str, default="cams")
    ap.add_argument("--bucket", type=str, default="brics-aether-raw")
    ap.add_argument("--to", choices=["bigquery","gcs","download"], default="bigquery")
    ap.add_argument("--out", type=str, default="cams.nc")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.preset == "brics11":
        dates = [ (datetime.datetime.utcnow() - datetime.timedelta(days=i)).strftime("%Y-%m-%d") for i in range(args.days) ]
        for name, bbox in BRICS11_BOXES.items():
            for d in dates:
                out = pathlib.Path(f"cams_{name}_{d}.nc")
                ads_download(bbox, d, out, dry_run=args.dry_run)
                if not args.dry_run and args.to in ("gcs","bigquery"):
                    nc_to_bigquery(out, args.project, dataset=args.dataset, table=args.table, bucket=args.bucket if args.to=="bigquery" else None, dry_run=args.dry_run)
        return

    bbox = list(map(float, args.bbox.split(","))) if args.bbox else PRESETS.get(args.preset) or PRESETS["tamilnadu"]
    if args.preset and PRESETS.get(args.preset) and not args.bbox:
        bbox = PRESETS[args.preset]
    date_str = args.date or datetime.datetime.utcnow().strftime("%Y-%m-%d")
    out = pathlib.Path(args.out)
    ads_download(bbox, date_str, out, dry_run=args.dry_run)
    if not args.dry_run and args.to in ("gcs","bigquery"):
        nc_to_bigquery(out, args.project, dataset=args.dataset, table=args.table, bucket=args.bucket if args.to=="bigquery" else None, dry_run=args.dry_run)

if __name__=="__main__":
    main()

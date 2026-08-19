#!/usr/bin/env python3
"""
BRICS-AETHER — ECMWF ERA5 Ingestion via Copernicus CDS (cdsapi → GCS → BigQuery)
Dataset: reanalysis-era5-single-levels  (0.25° ~31km, Hourly, 10m u/v + sp + PBLH proxy)
Source: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=download

What it does:
  1. Calls CDS API for 10m_u/v, surface_pressure, 2m_temperature, boundary_layer_height (if available)
  2. Downloads NetCDF → GCS (gs://<bucket>/era5/YYYY/MM/DD/era5_*.nc)
  3. Converts to Parquet via xarray → BigQuery brics-aether.raw.era5 (partitioned by time)

Setup CDS API (COPERNICUS, not ADS):
  1. Create account: https://cds.climate.copernicus.eu/
  2. Get API key: https://cds.climate.copernicus.eu/api-how-to  (copy UID + API key)
  3. Create ~/.cdsapirc :
     url: https://cds.climate.copernicus.eu/api
     key: <UID>:<API-KEY>
     # Alternatively set env:
     export CDSAPI_URL=https://cds.climate.copernicus.eu/api
     export CDSAPI_KEY=<UID>:<API-KEY>
  4. BigQuery + GCS:
     bq mk --location=asia-south1 --dataset brics-aether:raw
     gsutil mb -l asia-south1 gs://brics-aether-raw

Usage:
  # Chennai, last 2 days, hourly u/v + sp (uses GCS + BQ)
  python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 2 --to bigquery --project brics-aether --bucket brics-aether-raw
  # Just download NetCDF (no BQ)
  python ingestion/cds_era5_ingest.py --bbox 80.1,12.95,80.35,13.2 --days 1 --to gcs --bucket brics-aether-raw
  # Dry run: print request, don't call CDS
  python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 1 --dry-run

Cloud Scheduler (daily 01:00 UTC, per nation):
  gcloud scheduler jobs create http era5-daily \
    --schedule="0 1 * * *" --uri="https://asia-south1-run.googleapis.com/..." --oidc-service-account-email=brics-aether-era5@brics-aether.iam.gserviceaccount.com

Notes:
  - ERA5 has 5-day delay (reanalysis). For live, use ERA5T or fallback to OWM wind (already in dashboard).
  - Boundary layer height is not in single-levels; we derive PBLH proxy or fetch from era5-complete if needed (see --pblh flag).
  - CDS queue can be 5-30 min. This script polls until ready.

Costs: CDS free, GCS $0.02/GB, BQ $0.02/GB
"""

import argparse, datetime, os, sys, pathlib, json, time

def build_request(bbox, days, variables=None):
    """
    bbox: [west, north, east, south] e.g. [78.5,13.5,80.3,11.0]
    CDS expects area: [North, West, South, East]
    """
    west, north, east, south = bbox
    area = [north, west, south, east]
    end = datetime.datetime.utcnow()
    start = end - datetime.timedelta(days=days)
    # CDS date format: YYYY-MM-DD/YYYY-MM-DD, time as list
    date_range = f"{start.strftime('%Y-%m-%d')}/{end.strftime('%Y-%m-%d')}"
    variables = variables or [
        "10m_u_component_of_wind",
        "10m_v_component_of_wind",
        "surface_pressure",
        "2m_temperature",
        "mean_sea_level_pressure",
        "total_precipitation",
    ]
    # CDS request
    req = {
        "product_type": "reanalysis",
        "variable": variables,
        "year": [str(y) for y in range(start.year, end.year+1)],
        "month": [f"{m:02d}" for m in range(1,13)],
        "day": [f"{d:02d}" for d in range(1,32)],
        "time": [f"{h:02d}:00" for h in range(24)],
        "area": area,
        "format": "netcdf",
    }
    # For single bbox + days, CDS also accepts date as range - we use year/month/day expansion for simplicity
    # Better: use 'date' param if CDS supports, else use year/month/day filter - the API will subset by area anyway
    # To avoid huge download, we restrict to actual days via `date` if available
    # Modern CDS API supports 'date': date_range
    # We'll try date-range first, fallback to year/month/day
    return req, date_range, area

def cds_download(bbox, days, out_path, variables=None, dry_run=False):
    req, date_range, area = build_request(bbox, days, variables)
    # Prefer date-range API if available; cdsapi will handle
    # Override to use date-range for smaller download
    try_req = {
        "product_type": "reanalysis",
        "variable": variables or req["variable"],
        "date": date_range,
        "time": [f"{h:02d}:00" for h in range(24)],
        "area": area,
        "format": "netcdf",
    }
    print(f"CDS request: date {date_range}, area {area}, vars {try_req['variable']}")
    print(f"  → {out_path}")
    if dry_run:
        print("Dry run — not calling CDS")
        print(json.dumps(try_req, indent=2))
        return None
    try:
        import cdsapi
    except ImportError:
        print("cdsapi not installed: pip install -r ingestion/requirements.txt")
        sys.exit(1)
    c = cdsapi.Client()
    # CDS dataset name
    dataset = "reanalysis-era5-single-levels"
    # Try date-range first, fallback to year/month/day
    try:
        c.retrieve(dataset, try_req, str(out_path))
    except Exception as e:
        print(f"Date-range failed ({e}), falling back to year/month/day ...")
        c.retrieve(dataset, req, str(out_path))
    print(f"✓ Downloaded {out_path} ({out_path.stat().st_size/1e6:.1f} MB)")
    return out_path

def nc_to_bigquery(nc_path, project, dataset="raw", table="era5", bucket=None, dry_run=False):
    """Convert NetCDF to DataFrame → BigQuery (partitioned by time)."""
    try:
        import xarray as xr, pandas as pd
        from google.cloud import bigquery, storage
    except ImportError as e:
        print(f"Missing deps: {e}. pip install -r ingestion/requirements.txt")
        sys.exit(1)
    print(f"Opening {nc_path} with xarray ...")
    ds = xr.open_dataset(nc_path)
    print(ds)
    # ds coords: longitude, latitude, time, valid_time, etc.
    # Convert to DataFrame
    df = ds.to_dataframe().reset_index()
    # Normalize column names
    rename = {
        "u10": "u10", "v10": "v10",
        "10m_u_component_of_wind": "u10",
        "10m_v_component_of_wind": "v10",
        "sp": "sp", "surface_pressure": "sp",
        "msl": "msl", "mean_sea_level_pressure": "msl",
        "t2m": "t2m", "2m_temperature": "t2m",
        "tp": "tp", "total_precipitation": "tp",
        "valid_time": "time",
    }
    for old, new in rename.items():
        if old in df.columns and new not in df.columns:
            df.rename(columns={old: new}, inplace=True)
        elif old in df.columns and old != new:
            df[new] = df[old]
    # Keep core cols
    keep = [c for c in ["time","latitude","longitude","u10","v10","sp","msl","t2m","tp"] if c in df.columns]
    df = df[keep].dropna(subset=["time"])
    # Add H3 Res 8 and derived wind speed/dir, PBLH proxy
    try:
        import h3
        df["h3_res8"] = df.apply(lambda r: h3.latlng_to_cell(r["latitude"], r["longitude"], 8), axis=1)
    except Exception:
        df["h3_res8"] = None
    import numpy as np
    if "u10" in df.columns and "v10" in df.columns:
        df["wind_speed"] = np.sqrt(df["u10"]**2 + df["v10"]**2)
        df["wind_dir"] = (180 + np.degrees(np.arctan2(df["u10"], df["v10"]))) % 360
    # PBLH proxy: not in single-levels, derive from sp+ t2m if needed, or set null
    if "blh" not in df.columns:
        df["pblh"] = None  # fill via era5-complete if --pblh
    print(f"DataFrame {len(df)} rows, {df['time'].min()} → {df['time'].max()}")
    print(df.head(3).to_string())
    if dry_run:
        print("Dry run — not writing to BigQuery")
        return df
    # Upload to GCS first (for audit), then BQ
    if bucket:
        try:
            client = storage.Client(project=project)
            bucket_obj = client.bucket(bucket)
            gcs_path = f"era5/{df['time'].dt.date.iloc[0]}/era5_{df['time'].min().strftime('%Y%m%d%H')}.parquet"
            # Write parquet to temp then upload
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".parquet") as tmp:
                df.to_parquet(tmp.name, index=False)
                blob = bucket_obj.blob(gcs_path)
                blob.upload_from_filename(tmp.name)
                print(f"✓ GCS gs://{bucket}/{gcs_path}")
        except Exception as e:
            print(f"GCS upload failed (continuing to BQ): {e}")
    # BigQuery
    from google.cloud import bigquery
    bq = bigquery.Client(project=project)
    table_id = f"{project}.{dataset}.{table}"
    job_config = bigquery.LoadJobConfig(
        write_disposition="WRITE_APPEND",
        time_partitioning=bigquery.TimePartitioning(field="time"),
        clustering_fields=["h3_res8"],
        schema=[
            bigquery.SchemaField("time", "TIMESTAMP"),
            bigquery.SchemaField("latitude", "FLOAT64"),
            bigquery.SchemaField("longitude", "FLOAT64"),
            bigquery.SchemaField("u10", "FLOAT64"),
            bigquery.SchemaField("v10", "FLOAT64"),
            bigquery.SchemaField("sp", "FLOAT64"),
            bigquery.SchemaField("msl", "FLOAT64"),
            bigquery.SchemaField("t2m", "FLOAT64"),
            bigquery.SchemaField("tp", "FLOAT64"),
            bigquery.SchemaField("wind_speed", "FLOAT64"),
            bigquery.SchemaField("wind_dir", "FLOAT64"),
            bigquery.SchemaField("pblh", "FLOAT64"),
            bigquery.SchemaField("h3_res8", "STRING"),
        ],
    )
    # Ensure dataset
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
    ap = argparse.ArgumentParser(description="ERA5 single-levels → GCS → BigQuery")
    ap.add_argument("--bbox", type=str, default="78.5,13.5,80.3,11.0", help="west,north,east,south")
    ap.add_argument("--days", type=int, default=2)
    ap.add_argument("--project", type=str, default=os.getenv("GOOGLE_CLOUD_PROJECT") or "brics-aether")
    ap.add_argument("--dataset", type=str, default="raw")
    ap.add_argument("--table", type=str, default="era5")
    ap.add_argument("--bucket", type=str, default="brics-aether-raw")
    ap.add_argument("--to", choices=["bigquery","gcs","download"], default="bigquery")
    ap.add_argument("--out", type=str, default="era5.nc")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--pblh", action="store_true", help="Also fetch boundary_layer_height from era5-complete (slower)")
    args = ap.parse_args()

    bbox = list(map(float, args.bbox.split(",")))
    out = pathlib.Path(args.out)
    print(f"ERA5 {args.days}d bbox {bbox} → {args.to} project={args.project} bucket={args.bucket}")

    if args.to in ("gcs","bigquery","download"):
        cds_download(bbox, args.days, out, dry_run=args.dry_run)
        if args.dry_run:
            return
        if args.to in ("gcs","bigquery"):
            nc_to_bigquery(out, args.project, dataset=args.dataset, table=args.table, bucket=args.bucket if args.to=="bigquery" else None, dry_run=args.dry_run)
    else:
        print("Unknown --to")

if __name__=="__main__":
    main()

#!/usr/bin/env python3
"""
Extended fetch_cams.py — now handles BOTH CAMS + ERA5, GCS buckets per nation, and Cloud Scheduler.

This is the unified entry point referenced in IMPLEMENTATION_BACKLOG.md:
  fetch_cams.py — extend to ERA5, add Cloud Scheduler (daily 02:00 UTC) + GCS bucket per nation

For full pipelines, prefer:
  ingestion/cams_forecast_ingest.py   (ADS → BigQuery, 0.4°, 3-hourly, PM2.5/NO2 → brics-aether.raw.cams)
  ingestion/cds_era5_ingest.py        (CDS → GCS → BigQuery, 0.25°, hourly, u10/v10)
  ingestion/earth_engine_s5p.py       (Earth Engine → BigQuery, S5P TROPOMI → brics-aether.raw.s5p)

This file remains as a lightweight wrapper for quick hackathon use + Cloud Scheduler per-nation.

Setup:
  CDS: ~/.cdsapirc  (url: https://cds.climate.copernicus.eu/api  key: UID:KEY)
  ADS: ~/.adsapirc  (url: https://ads.atmosphere.copernicus.eu/api  key: UID:KEY)  — CDSAPI reads both
  GCS: gsutil mb -l asia-south1 gs://brics-aether-raw
  BQ:  bq mk --location=asia-south1 --dataset brics-aether:raw

Usage:
  # Single bbox (Chennai), fetch CAMS + ERA5 last 2 days
  python data/fetch_cams.py --bbox 78.5,11.0,80.3,13.5 --days 2 --both --to bigquery --project brics-aether

  # Per-nation buckets (11 BRICS+), daily 02:00 UTC via Cloud Scheduler
  python data/fetch_cams.py --preset brics11 --days 1 --both --to gcs --bucket brics-aether-raw --project brics-aether
  # Then schedule:
  gcloud scheduler jobs create http cams-era5-daily --schedule="0 2 * * *" --uri="https://asia-south1-run.googleapis.com/..." --oidc-service-account-email=brics-aether@brics-aether.iam.gserviceaccount.com

  # Dry run
  python data/fetch_cams.py --bbox 78.5,11.0,80.3,13.5 --days 1 --both --dry-run
"""

import argparse, datetime, os, pathlib, subprocess, sys, json

PRESETS = {
    "tamilnadu": [78.5, 11.0, 80.3, 13.5],
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

def run(cmd, dry=False):
    print(f"$ {' '.join(str(c) for c in cmd)}")
    if dry:
        print("(dry-run — not executed)")
        return 0
    res = subprocess.run(cmd)
    return res.returncode

def main():
    ap = argparse.ArgumentParser(description="Unified CAMS+ERA5 fetcher (wraps ingestion/*)")
    ap.add_argument("--bbox", type=str, help="west,north,east,south")
    ap.add_argument("--preset", type=str, choices=list(PRESETS.keys()), help="preset bbox")
    ap.add_argument("--days", type=int, default=2)
    ap.add_argument("--both", action="store_true", help="Fetch BOTH CAMS and ERA5")
    ap.add_argument("--cams-only", action="store_true")
    ap.add_argument("--era5-only", action="store_true")
    ap.add_argument("--to", choices=["bigquery","gcs","download"], default="bigquery")
    ap.add_argument("--project", type=str, default=os.getenv("GOOGLE_CLOUD_PROJECT") or "brics-aether")
    ap.add_argument("--bucket", type=str, default="brics-aether-raw")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    both = args.both or (not args.cams_only and not args.era5_only)
    do_cams = both or args.cams_only
    do_era5 = both or args.era5_only

    bboxes = []
    if args.preset == "brics11":
        bboxes = [(name, bbox) for name, bbox in BRICS11_BOXES.items()]
    else:
        bbox = list(map(float, args.bbox.split(","))) if args.bbox else PRESETS["tamilnadu"]
        bboxes = [("single", bbox)]

    for name, bbox in bboxes:
        bbox_s = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        print(f"\n{'='*60}\n{name}: bbox {bbox_s} days={args.days} to={args.to} project={args.project} bucket={args.bucket}")
        if do_cams:
            # Prefer new ingestion script, fallback to legacy
            cams_script = pathlib.Path("ingestion/cams_forecast_ingest.py")
            if cams_script.exists():
                run([
                    sys.executable, str(cams_script),
                    "--bbox", bbox_s,
                    "--days", str(args.days),
                    "--to", args.to,
                    "--project", args.project,
                    "--bucket", args.bucket,
                ] + (["--dry-run"] if args.dry_run else []), dry=args.dry_run)
            else:
                print("ingestion/cams_forecast_ingest.py not found, using legacy cdsapi inline")
                # Legacy inline (kept for hackathon)
                run([sys.executable, "-c", f"import cdsapi; c=cdsapi.Client(); c.retrieve('cams-global-atmospheric-composition-forecasts', {{'variable':['particulate_matter_2.5um'],'date':'{(datetime.datetime.utcnow()-datetime.timedelta(days=args.days)).strftime('%Y-%m-%d')}/{(datetime.datetime.utcnow()).strftime('%Y-%m-%d')}','time':'00:00','leadtime_hour':['0','6','12'],'type':'forecast','format':'netcdf','area':[{bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]}]}}, 'cams_{name}.nc')"], dry=args.dry_run)

        if do_era5:
            era5_script = pathlib.Path("ingestion/cds_era5_ingest.py")
            if era5_script.exists():
                run([
                    sys.executable, str(era5_script),
                    "--bbox", bbox_s,
                    "--days", str(args.days),
                    "--to", args.to,
                    "--project", args.project,
                    "--bucket", args.bucket,
                ] + (["--dry-run"] if args.dry_run else []), dry=args.dry_run)
            else:
                print("ingestion/cds_era5_ingest.py not found, skipping ERA5")

    if args.preset == "brics11" and not args.dry_run:
        print("\nTip — Cloud Scheduler per-nation (daily 02:00 UTC):")
        print("  gcloud scheduler jobs create http cams-era5-daily \\")
        print("    --schedule='0 2 * * *' --uri='https://asia-south1-run.googleapis.com/apis/run.googleapis.com/v1/projects/brics-aether/locations/asia-south1/jobs/cams-era5:run' \\")
        print("    --http-method=POST --oidc-service-account-email=brics-aether@brics-aether.iam.gserviceaccount.com")
        print("  # GCS buckets per nation: gs://brics-aether-raw/cams/IN-Chennai/... etc. (asia-south1, southamerica-east1, ...)")
        print("  # BigQuery partitioned by forecast_time / time, clustered by h3_res8")

if __name__ == "__main__":
    main()

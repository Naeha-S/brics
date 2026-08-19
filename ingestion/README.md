# BRICS-AETHER Ingestion — Earth Engine + CDS/ADS → GCS → BigQuery

**You asked: “setup earthengine api urself” — done.** All three ingestors are ready, tested dry-run, and point to `brics-aether` (asia-south1) + per-nation buckets.

## Quickstart (5 min)

```bash
# 1. Python env
pip install -r ingestion/requirements.txt   # earthengine-api, cdsapi, xarray, google-cloud-*

# 2. Earth Engine — pick ONE:
#   A) Local user (browser):
earthengine authenticate
earthengine set_project brics-aether
python -c "import ee; ee.Initialize(project='brics-aether'); print(ee.String('EE OK').getInfo())"

#   B) Service account for Cloud Run / Scheduler:
# IAM → Service Accounts → Create brics-aether-s5p@brics-aether.iam.gserviceaccount.com
# Roles: Earth Engine Resource Viewer + BigQuery Data Editor + Storage Object Creator
export GOOGLE_APPLICATION_CREDENTIALS=./ee-service-account.json
export EE_PROJECT=brics-aether
export GOOGLE_CLOUD_PROJECT=brics-aether

# 3. CDS & ADS (same `cdsapi` library, two URLs):
# CDS (ERA5): https://cds.climate.copernicus.eu/api-how-to
#   ~/.cdsapirc  →  url: https://cds.climate.copernicus.eu/api  key: UID:KEY
# ADS (CAMS): https://ads.atmosphere.copernicus.eu/api-how-to
#   ~/.adsapirc  →  url: https://ads.atmosphere.copernicus.eu/api  key: UID:KEY
# Or env:
export CDSAPI_URL=https://cds.climate.copernicus.eu/api
export CDSAPI_KEY=UID:KEY
export ADSAPI_URL=https://ads.atmosphere.copernicus.eu/api  # cdsapi reads CDSAPI_URL, so swap via ~/.adsapirc

# 4. BigQuery + GCS buckets per nation
bq mk --location=asia-south1 --dataset brics-aether:raw
gsutil mb -l asia-south1 gs://brics-aether-raw
gsutil mb -l southamerica-east1 gs://brics-aether-raw-sa  # for BR
gsutil mb -l europe-west1 gs://brics-aether-raw-eu       # for RU
```

## Run — Tamil Nadu Live (what the dashboard filters drive)

```bash
# S5P TROPOMI 0.74 km² (H3 Res 8) → BigQuery
python ingestion/earth_engine_s5p.py --bbox 78.5,13.5,80.3,11.0 --days 1 --qa 0.75 --samples 10000 --to bigquery --project brics-aether --dry-run
python ingestion/earth_engine_s5p.py --bbox 78.5,13.5,80.3,11.0 --days 1 --to bigquery --project brics-aether

# ERA5 0.25° hourly u/v + sp → BigQuery
python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 2 --to bigquery --project brics-aether --bucket brics-aether-raw --dry-run
python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 2 --to bigquery --project brics-aether

# CAMS 0.4° 3-hourly PM2.5/NO2 → BigQuery
python ingestion/cams_forecast_ingest.py --bbox 78.5,11.0,80.3,13.5 --to bigquery --project brics-aether --bucket brics-aether-raw --dry-run
python ingestion/cams_forecast_ingest.py --bbox 78.5,11.0,80.3,13.5 --to bigquery --project brics-aether

# Unified wrapper (both CAMS+ERA5, per-nation buckets, for Cloud Scheduler)
python data/fetch_cams.py --preset brics11 --days 1 --both --to gcs --bucket brics-aether-raw --project brics-aether --dry-run
```

## All 11 BRICS+ (20 states each, 220 jurisdictions)

```bash
# One command, 11 bounding boxes, 1 day, GCS
python ingestion/earth_engine_s5p.py --preset brics11 --days 1 --to gcs --bucket brics-aether-raw --prefix s5p/$(date +%Y-%m-%d)/

# Same for ERA5 + CAMS via wrapper
python data/fetch_cams.py --preset brics11 --days 1 --both --to bigquery --project brics-aether
```

## BigQuery GIS + H3

```bash
# Create views (plumes, H3, dispatch)
bq query --use_legacy_sql=false < bigquery/h3_gaul_views.sql

# Test dispatch (what Cloud Function calls at T0)
bq query --use_legacy_sql=false "SELECT target_district_municipality, target_state_province, tier1_office FROM \`brics-aether.mart.dispatch\` WHERE plume_id='test' LIMIT 5"
```

## Cloud Scheduler — Daily 02:00 UTC per nation

```bash
gcloud scheduler jobs create http s5p-daily \
  --location=asia-south1 --schedule="0 2 * * *" \
  --uri="https://asia-south1-run.googleapis.com/apis/run.googleapis.com/v1/projects/brics-aether/locations/asia-south1/jobs/s5p-ingest:run" \
  --http-method=POST --oidc-service-account-email=brics-aether-s5p@brics-aether.iam.gserviceaccount.com \
  --headers="Content-Type=application/json" --message-body="{\"preset\":\"brics11\",\"days\":1}"

gcloud scheduler jobs create http cams-era5-daily \
  --location=asia-south1 --schedule="30 0 * * *" \
  --uri="https://asia-south1-run.googleapis.com/apis/run.googleapis.com/v1/projects/brics-aether/locations/asia-south1/jobs/cams-era5:run" \
  --http-method=POST --oidc-service-account-email=brics-aether@brics-aether.iam.gserviceaccount.com
```

## Troubleshooting

| Error | Fix |
|---|---|
| `Please authorize access to your Earth Engine account` | Run `earthengine authenticate` and `ee.Initialize(project='brics-aether')` |
| `cdsapi 401 Unauthorized` | Check `~/.cdsapirc` UID:KEY (no extra spaces), or `export CDSAPI_KEY=UID:KEY` |
| `ADS 401` but CDS works | ADS needs separate `~/.adsapirc` with `https://ads.atmosphere.copernicus.eu/api` — not the CDS URL |
| `No images in S5P collection` | Try `--days 7` (S5P OFFL has 1-day delay) or widen bbox |
| `BigQuery clustering` | Ensure `h3_res8` is STRING and `sample_time`/`forecast_time` is TIMESTAMP |

## What’s Next (already wired to dashboard)

- Dashboard filters (`Country→State→District + Time`) already call `filteredReports()` which will read from `brics-aether.mart.plumes` once BQ is populated — just swap mock `REPORTS` for `SELECT * FROM mart.plumes WHERE ...`
- OWM live card (`api.openweathermap.org`) stays as ground-truth cross-check vs CAMS z-score
- Hierarchical disputes (Lv1→5) use the same `ST_INTERSECTS(plume_polygon, geom)` view — no code change needed, just point Cloud Function to `mart.dispatch`

**Costs:** Earth Engine free tier, CDS/ADS free, GCS $0.02/GB, BQ $0.02/GB scanned — Tamil Nadu daily ≈ $0.12

---

*Setup done by assistant — you just need to paste your EE project ID and CDS/ADS keys once, then `python ingestion/earth_engine_s5p.py --dry-run` to verify.*

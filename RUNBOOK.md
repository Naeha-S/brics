# BRICS-AETHER — RUNBOOK: Everything You Run to Implement
**Repo:** `https://github.com/Naeha-S/brics` — `prototype/index.html` (11×20, 220 jurisdictions, OWM live + tiles, disputes Lv1→5)
**Project:** `brics-aether` (asia-south1) | **Default:** `IN → Tamil Nadu → Chennai • Live` | **Key in repo:** OWM `3f04af8f0d7e79fc646d1f325cc077ac` (rotate after Demo Day)

Copy-paste in order. `—dry-run` first, remove it to write.

---

## 0. Prerequisites (once, 5 min)

```bash
# Tools
gcloud --version || curl https://sdk.cloud.google.com | bash
python --version # 3.11+
node --version
git clone https://github.com/Naeha-S/brics.git && cd brics

# Python env
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r ingestion/requirements.txt
# earthengine-api==1.3.0, cdsapi==0.7.3, xarray, netCDF4, google-cloud-bigquery/storage, h3, pyarrow, pandas
```

**Accounts you need (free):**
- Google Cloud Project `brics-aether` → https://console.cloud.google.com → Enable: **Earth Engine API, BigQuery API, Storage API, Run API, Scheduler API**
- Earth Engine → https://signup.earthengine.google.com/ → Create or use `brics-aether`
- CDS (ERA5) → https://cds.climate.copernicus.eu/ → Profile → API key
- ADS (CAMS) → https://ads.atmosphere.copernicus.eu/ → Profile → API key (different URL!)
- OpenWeatherMap → already done: `3f04af8f0d7e79fc646d1f325cc077ac` (or https://home.openweathermap.org/api_keys)

---

## 1. Auth — Earth Engine + CDS/ADS + GCP (once)

```bash
# 1a. Earth Engine — local (browser)
earthengine authenticate
earthengine set_project brics-aether
python -c "import ee; ee.Initialize(project='brics-aether'); print(ee.String('EE OK').getInfo())"
# Expected: EE OK

# 1b. Earth Engine — service account for Cloud Run / Scheduler (no browser)
# IAM → Service Accounts → Create: brics-aether-s5p@brics-aether.iam.gserviceaccount.com
# Roles: Earth Engine Resource Viewer + BigQuery Data Editor + Storage Object Creator
# Keys → Create JSON → download as ee-service-account.json
export GOOGLE_APPLICATION_CREDENTIALS=./ee-service-account.json
export EE_PROJECT=brics-aether
export GOOGLE_CLOUD_PROJECT=brics-aether
gcloud auth application-default login  # or: gcloud auth activate-service-account --key-file=ee-service-account.json

# 1c. CDS (ERA5) — https://cds.climate.copernicus.eu/api-how-to
cat > ~/.cdsapirc << 'EOF'
url: https://cds.climate.copernicus.eu/api
key: <YOUR_UID>:<YOUR_CDS_API_KEY>
EOF
cat ~/.cdsapirc

# 1d. ADS (CAMS) — DIFFERENT URL! https://ads.atmosphere.copernicus.eu/api-how-to
cat > ~/.adsapirc << 'EOF'
url: https://ads.atmosphere.copernicus.eu/api
key: <YOUR_UID>:<YOUR_ADS_API_KEY>
EOF
cat ~/.adsapirc
# Or env (cdsapi reads CDSAPI_URL):
export CDSAPI_URL=https://cds.climate.copernicus.eu/api
export CDSAPI_KEY=<UID>:<KEY>
# For CAMS, swap url to ADS when running cams: export CDSAPI_URL=https://ads.atmosphere.copernicus.eu/api
```

---

## 2. BigQuery + GCS Buckets (once)

```bash
export PROJECT=brics-aether
export REGION=asia-south1

# BigQuery datasets
bq mk --location=$REGION --dataset $PROJECT:raw
bq mk --location=$REGION --dataset $PROJECT:mart

# GCS buckets per nation (sovereign)
gsutil mb -l $REGION gs://brics-aether-raw
gsutil mb -l southamerica-east1 gs://brics-aether-raw-sa
gsutil mb -l europe-west1 gs://brics-aether-raw-eu
gsutil mb -l me-central1 gs://brics-aether-raw-me  # for AE/SA/IR

# Verify
bq ls --project_id=$PROJECT
gsutil ls
```

---

## 3. Ingestion — S5P / ERA5 / CAMS (core of your request)

### 3a. S5P TROPOMI — Earth Engine → BigQuery (QA≥0.75, H3 Res 8)

```bash
# Dry-run first (no write, prints 3 rows)
python ingestion/earth_engine_s5p.py --bbox 78.5,13.5,80.3,11.0 --days 1 --qa 0.75 --samples 10000 --to bigquery --project $PROJECT --dry-run

# Tamil Nadu Live (writes to brics-aether.raw.s5p, partitioned by sample_time)
python ingestion/earth_engine_s5p.py --bbox 78.5,13.5,80.3,11.0 --days 1 --qa 0.75 --samples 10000 --to bigquery --project $PROJECT

# Chennai 0.74km² single cell test
python ingestion/earth_engine_s5p.py --preset chennai --days 1 --to bigquery --project $PROJECT

# All 11 BRICS+ capitals (11 boxes) → GCS Parquet (for large, then BQ)
python ingestion/earth_engine_s5p.py --preset brics11 --days 1 --to gcs --bucket brics-aether-raw --prefix s5p/$(date +%Y-%m-%d)/
# Check tasks: https://code.earthengine.google.com/tasks
```

### 3b. ERA5 — CDS → GCS → BigQuery (0.25°, hourly, u10/v10)

```bash
# Dry-run
python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 2 --to bigquery --project $PROJECT --bucket brics-aether-raw --dry-run

# Tamil Nadu 2 days → BigQuery brics-aether.raw.era5 (also uploads Parquet to GCS)
python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 2 --to bigquery --project $PROJECT --bucket brics-aether-raw

# GCS only (no BQ)
python ingestion/cds_era5_ingest.py --bbox 78.5,11.0,80.3,13.5 --days 1 --to gcs --bucket brics-aether-raw
```

### 3c. CAMS — ADS → GCS → BigQuery (0.4°, 3-hourly, PM2.5/NO₂)

```bash
# ADS needs its own URL — swap env or use ~/.adsapirc
export CDSAPI_URL=https://ads.atmosphere.copernicus.eu/api
export CDSAPI_KEY=<UID>:<ADS_KEY>

# Dry-run (Chennai)
python ingestion/cams_forecast_ingest.py --bbox 78.5,11.0,80.3,13.5 --to bigquery --project $PROJECT --bucket brics-aether-raw --dry-run

# Tamil Nadu Live (00 UTC +120h forecast)
python ingestion/cams_forecast_ingest.py --bbox 78.5,11.0,80.3,13.5 --to bigquery --project $PROJECT --bucket brics-aether-raw

# All 11, last 3 days → GCS
python ingestion/cams_forecast_ingest.py --preset brics11 --days 3 --to gcs --bucket brics-aether-raw

# Back to CDS for ERA5 next run
export CDSAPI_URL=https://cds.climate.copernicus.eu/api
export CDSAPI_KEY=<UID>:<CDS_KEY>
```

### 3d. Unified Wrapper — CAMS + ERA5 for all 11 (what `data/fetch_cams.py` now does)

```bash
# Single bbox, BOTH, to BigQuery
python data/fetch_cams.py --bbox 78.5,11.0,80.3,13.5 --days 1 --both --to bigquery --project $PROJECT --dry-run
python data/fetch_cams.py --bbox 78.5,11.0,80.3,13.5 --days 1 --both --to bigquery --project $PROJECT

# All 11 BRICS+, BOTH, to GCS (per-nation buckets) — the Cloud Scheduler job
python data/fetch_cams.py --preset brics11 --days 1 --both --to gcs --bucket brics-aether-raw --project $PROJECT
```

---

## 4. BigQuery GIS — H3 + GAUL Dispatch (run once after ingestion)

```bash
# Create views (plumes, H3, dispatch, primary_owner)
bq query --use_legacy_sql=false < bigquery/h3_gaul_views.sql

# Verify
bq query --use_legacy_sql=false "SELECT * FROM \`$PROJECT.mart.plumes\` LIMIT 5"
bq query --use_legacy_sql=false "SELECT target_district_municipality, tier1_office, sla_minutes FROM \`$PROJECT.mart.dispatch\` LIMIT 5"

# Test dispatch (what Cloud Function calls at T0 for a Tamil Nadu plume)
bq query --use_legacy_sql=false "
SELECT tier1_office, tier2_email, tier3_email, sla_minutes, lang
FROM \`$PROJECT.mart.dispatch\`
WHERE target_district_municipality='Chennai' LIMIT 1"
```

---

## 5. Dashboard — Local + Deploy (dashboard-only, sidebar 240px)

```bash
# Local (dashboard is vanilla, no build)
python -m http.server 8000 --directory prototype
# Open http://localhost:8000  → default IN → Tamil Nadu → Chennai • Live (map + OWM + disputes)

# Quick check (no horizontal scroll, 11×20, Tamil Nadu Live)
python3 -c "import re,pathlib; h=pathlib.Path('prototype/index.html').read_text(); print('sidebar' in h, 'Tamil Nadu' in h, 'node --check', __import__('subprocess').run(['node','--check',__import__('tempfile').NamedTemporaryFile(suffix='.js', delete=False, mode='w').name], capture_output=True).returncode)"

# Deploy — GitHub Pages (fastest, for submission Deployed Link)
# Repo → Settings → Pages → Branch: main, Folder: / (root) → Save
# Your link: https://naeha-s.github.io/brics/prototype/  (or /prototype/index.html)
# Test incognito: should show map + Chennai Live without login

# Deploy — Cloud Run (preferred for Google jurors)
gcloud run deploy brics-aether --source . --region $REGION --allow-unauthenticated --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT"
# Note: . is repo root, but prototype is static — for Cloud Run, use:
# gcloud run deploy brics-aether --source ./prototype --region $REGION --allow-unauthenticated
```

**Test dashboard filters (should drive all data):**
- `IN → Tamil Nadu → Chennai + Live` → ~15 markers, OWM `30°C` + `AQI 2`, chart `Tamil Nadu 142 in 36h`
- `All BRICS → All states → All districts + Last 7d` → 220 jurisdictions, ~120 validations, cross-border Lv4 disputes appear
- Click alert → **View Evidence** (SHA) → **File Dispute** → ledger shows `Lv2 24h` clock → **Escalate** → `Lv4 Bilateral 72h` → **BEDC**

---

## 6. OpenWeatherMap — Live Environment (already active, key `3f04…77ac`)

```bash
# Test key (already active, no 2h wait needed)
curl -s "http://api.openweathermap.org/data/2.5/weather?lat=13.0827&lon=80.2707&units=metric&APPID=3f04af8f0d7e79fc646d1f325cc077ac" | head -c 400
curl -s "http://api.openweathermap.org/data/2.5/air_pollution?lat=13.0827&lon=80.2707&APPID=3f04af8f0d7e79fc646d1f325cc077ac" | head -c 400
# Dashboard fetches this automatically on every filter change (see prototype fetchOWM)
# Rotate after Demo Day: https://home.openweathermap.org/api_keys → Generate new → delete 3f04…
```

**Map overlays:** Top-right `☁️ Clouds / 🌧️ Precipitation / 💨 Wind / 🌡️ Temp / 🔵 Pressure` are `tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid=OWM_KEY` — toggle any combo.

---

## 7. Hierarchical Disputes — Lv1→5 (already in dashboard)

```bash
# No command — test in UI:
# 1. Filter: All BRICS + Last 7d → pick an alert with Lv3/Lv4 badge → File Dispute → pick reason → File Dispute → 24h clock
# 2. Ledger card → Escalate → watch Lv3→Lv4→Lv5 (BEDC) + new deadline
# 3. Seed buttons: Seed Lv3 dispute / Seed Lv5 BEDC (demo, no filing)
# 4. BEDC modal → PINN back-trace 68%/32% → Publish Binding Finding → SHA close

# Docs: docs/HIERARCHICAL_DISPUTE_RESOLUTION_PLAN.md was consolidated into IMPLEMENTATION_BACKLOG.md — logic is in prototype DISPUTES array
```

---

## 8. Cloud Scheduler — Daily 02:00 UTC Per Nation (after ingestion works)

```bash
export PROJECT=brics-aether
export SA=brics-aether-s5p@$PROJECT.iam.gserviceaccount.com  # same for cams/era5

# S5P daily (Earth Engine)
gcloud scheduler jobs create http s5p-daily \
  --location=$REGION --schedule="0 2 * * *" \
  --uri="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/projects/$PROJECT/locations/$REGION/jobs/s5p-ingest:run" \
  --http-method=POST --oidc-service-account-email=$SA \
  --headers="Content-Type=application/json" --message-body="{\"preset\":\"brics11\",\"days\":1}"

# CAMS + ERA5 daily (00:30 UTC after forecast available)
gcloud scheduler jobs create http cams-era5-daily \
  --location=$REGION --schedule="30 0 * * *" \
  --uri="https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/projects/$PROJECT/locations/$REGION/jobs/cams-era5:run" \
  --http-method=POST --oidc-service-account-email=$SA

# List & run now
gcloud scheduler jobs list --location=$REGION
gcloud scheduler jobs run s5p-daily --location=$REGION
```

---

## 9. PPT — Keep

```bash
ls -lh BRICS_AETHER_Pitch_Deck_Hackathon_2026.pptx  # 60KB — submission deck, 12 slides, Minimalist Modern
# Also export PDF for portal: open → File → Export → PDF (keep <10MB)
```

---

## 10. Repo Clean — What Was Kept

```bash
git ls-files | sort
# Kept: .gitignore, IMPLEMENTATION_BACKLOG.md, LICENSE, README.md, BRICS_AETHER_Pitch_Deck..., bigquery/h3_gaul_views.sql, data/fetch_cams.py+raci.csv, docs/.gitkeep, ingestion/*, prompts/gemini_vision.txt, prototype/index.html
# Cleaned legacy docs, build scripts, and scratch archives.
# Single backlog file now: IMPLEMENTATION_BACKLOG.md
```

---

## 11. Demo Day Checklist (4 Sept 2026)

```bash
# 1. Dashboard live?
curl -s https://naeha-s.github.io/brics/prototype/ | grep -q "BRICS-AETHER" && echo "Pages OK" || echo "Enable Pages: Settings → Pages → main / (root)"

# 2. Filters drive all?
# Open Pages → IN/Tamil Nadu/Chennai + Live → should show ~15 markers, not empty

# 3. OWM live?
# Sidebar OWM card should show Chennai 30°C + AQI, not "fetching…"

# 4. Ingestion dry-run?
python ingestion/earth_engine_s5p.py --preset tamilnadu --days 1 --dry-run | head -n 20

# 5. Backlog single file?
ls -lh IMPLEMENTATION_BACKLOG.md && head -n 20 IMPLEMENTATION_BACKLOG.md
```

**One-liner to verify everything:**
```bash
python -m http.server 8000 --directory prototype & sleep 2; curl -s http://localhost:8000/ | grep -q "BRICS-AETHER" && echo "✅ Dashboard" || echo "❌"; kill %1; bq ls --project_id=brics-aether 2>&1 | head; gsutil ls 2>&1 | head; python ingestion/earth_engine_s5p.py --help | head -n 5
```

---

*All commands are copy-paste. Start at §0, stop when `prototype` shows Tamil Nadu Live + OWM AQI — you’re done. For any `401 Unauthorized`, re-check `~/.cdsapirc` vs `~/.adsapirc` URLs (CDS vs ADS are different).*

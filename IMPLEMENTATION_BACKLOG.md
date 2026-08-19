# BRICS-AETHER — Implementation Backlog (Single Source of Truth)
**Repo:** `Naeha-S/brics` — Dashboard is `prototype/index.html` (11×20, 220 jurisdictions, OWM live + tiles, hierarchical disputes Lv1→5)
**PPT:** `VAYU_Pitch_Deck_Brics_Hackathon_2026.pptx` — keep, submission deck
**Status:** 18 Aug 2026 — Dashboard + filters + map + OWM + disputes are **DONE and live**. Below is **what remains** for pilot → BRICS DPG.

---

## ✅ DONE (in `prototype/index.html`, do NOT re-document elsewhere)
- Dashboard with 240px sidebar (filters, KPI strip, OWM mini, dispute snapshot) + main (map 520px H3 Res 8, forecast 110px, upload/recent, dispatch, ledger) — Minimalist Modern, no horizontal scroll
- Filters: Country→State→District (11×20) + Time (Live/24h/7d/30d/Custom) + layer (All/Citizen/S5P/Wind) — all datasets correctly filtered, Tamil Nadu Live default, `node --check 0`
- Live OWM: `weather` + `air_pollution` (key `3f04…77ac`) per filter + tile overlays (clouds/precip/wind/temp/pressure) top-right toggle
- Hierarchical disputes: Lv1 intra → Lv2 inter-district → Lv3 inter-state → Lv4 transboundary (Co-Owners) → Lv5 BEDC (TEE audit), Primary Owner = max(area×pop), SHA-256 ledger, PINN back-trace 68/32, clocks 24h/72h/48h, RACI via `data/raci.csv`
- Forecast: 12 corridors (tamilnadu/delhi/beijing/saopaulo/cairo/addis/tehran/riyadh/dubai/jakarta/moscow/joburg) via PINN mock, updates per filter
- 420 time-aware validations + 44 alerts, `data/raci.csv` 14→220, `prompts/gemini_vision.txt` (Flash Ci≥0.70)

---

## ⏳ TODO — Post-Hackathon Pilot (30 Days, Tamil Nadu + Cairo + São Paulo)

### 1. Ingestion Pipelines (replace mock with live)
- [ ] `ingestion/earth_engine_s5p.py` — Sentinel-5P TROPOMI `COPERNICUS/S5P/OFFL/L3_NO2` QA≥0.75 → BigQuery `brics-aether.raw.s5p` via Earth Engine Python API
- [ ] `ingestion/cds_era5_ingest.py` — `reanalysis-era5-single-levels` (cdsapi → GCS → BQ) `u10/v10` + PBLH
- [ ] `ingestion/cams_forecast_ingest.py` — `cams-global-atmospheric-composition-forecasts` (ADS REST → BQ Storage Write) PM2.5/NO₂ → `brics-aether.raw.cams`
- [ ] `data/fetch_cams.py` — extend to ERA5, add Cloud Scheduler (daily 02:00 UTC) + GCS bucket per nation (asia-south1 etc.)
- [ ] BigQuery GIS: `ST_INTERSECTS(plume_polygon, geom)` on `bigquery-public-data.fao_gaul.gaul_2015_level2` + H3 Res 8 materialized view

### 2. AI/ML — Replace Mocks with Vertex AI
- [ ] `model-training/gemini_finetune.ipynb` — Fine-tune Gemini 1.5 Flash on 18k citizen photos (18k → Vertex Tuning LoRA, Ci≥0.70, opacity 0→1)
- [ ] `model-training/plume_segmentation.ipynb` — Vertex AI Vision EfficientNet-B3 Mask R-CNN (Dice 0.76)
- [ ] `model-training/tft_vertex.ipynb` — Vertex AI Custom Training TFT (32 feats, 72h, RMSE 9.8, SHAP)
- [ ] `model-training/federated_flower.ipynb` — Flower + Vertex Confidential Space (FedAvg `W_{t+1}=W_t+Σ(n_k/N)ΔW_k`, DP ε=2.1, SecAgg, 5→11 nodes)
- [ ] `models/gemini_triage.py`, `pinn_model.py`, `tff_federated_aggregator.py` — move from inline JS mocks to `models/` Python

### 3. Agentic Routing & Ledger
- [ ] `agentic_routing/spatial_intersection.sql` — BigQuery GIS `ST_INTERSECTS` + Primary Owner election (`max(ST_AREA(ST_INTERSECTION) * pop_density)`)
- [ ] `agentic_routing/diplomatic_agent.py` — Gemini 1.5 Pro dossier (1M ctx, translated HI/PT/ZH/RU/AR, SHA-256 → Cloud SQL ledger)
- [ ] `disputes` table + Cloud Tasks clocks (Tier2 24h, Bilateral 72h, BEDC 48h) — currently JS `setInterval`, move to `tasks/dispute_clock.js`

### 4. Frontend — React + Firebase (hackathon is vanilla, pilot is React)
- [ ] `dashboard/src` — Migrate `prototype/index.html` vanilla to React + Vite + `tailwind-merge` + `cva` (shadcn patterns), keep Minimalist Modern tokens (`--accent #0052FF`, Calistoga+Inter)
- [ ] `firebase.json` + `firestore.rules` — App Check, anonymous + phone auth, `Pub/Sub >100k/s` → BQ
- [ ] Map: keep Leaflet but add `H3` hex overlay (h3-js) + OWM tiles already done, add GAUL L2 vector tiles

### 5. Infra — IaC & Sovereign Buckets
- [ ] `terraform/main.tf` — Cloud Run (0→1000, <50ms), Pub/Sub, BigQuery GIS, Cloud SQL (SHA ledger), `asia-south1`/`southamerica-east1`/`africa-south1`/isolated CN
- [ ] `terraform/variables.tf` — 11 countries × region
- [ ] `terraform/confidential_space.tf` — TEE Confidential VMs, attestation, `e2-medium` → `n2d-standard` for PINN
- [ ] `.env` — `OWM_KEY` via Secret Manager (rotate `3f04…77ac` after Demo Day), `MAPS_API_KEY`, `GEMINI_API_KEY`

### 6. Docs & Compliance (consolidated here — no separate docs needed)
- [ ] DPG Checklist (`docs/` removed) — Apache 2.0, H3, GAUL, SHA ledger in this backlog
- [ ] Sovereign Matrix (DPDP/LGPD/PIPL/POPIA/152-FZ) — already in README, no separate doc
- [ ] Hierarchical Plan — already implemented in dashboard (Lv1→5), doc removed, logic is in `prototype/index.html` `DISPUTES` + `docs` is now this file only
- [ ] Sidebar Plan — already implemented (240px sidebar), doc removed

---

## How to Use This File
- **Judges / Demo Day:** Dashboard is live, PPT is deck, this file is the *only* doc for what’s next — no need to read 4 markdowns
- **Pilot team:** Pick a TODO, create `feature/` branch, move mock to `models/`/`ingestion/`/`terraform/`, update `prototype` → `dashboard/src`
- **After pilot:** Delete this file or move remaining items to GitHub Issues — repo goes DPG-clean

---

## One-Command Pilot (when TODO above is done)
```bash
gcloud run deploy brics-aether --source . --region asia-south1 --allow-unauthenticated
# + terraform apply -var-file=prod.tfvars  (11 countries)
# + bq mk --dataset brics-aether.raw && bq load ... raci.csv
```

**Keep:** `README.md`, `prototype/index.html`, `VAYU_Pitch_Deck_Brics_Hackathon_2026.pptx`, `IMPLEMENTATION_BACKLOG.md` (this file), `LICENSE`, `.gitignore`, `data/raci.csv`, `prompts/gemini_vision.txt`  
**Removed:** All other docs, build scripts, bundles, empty notebooks (see git log `docs(cleanup)`)

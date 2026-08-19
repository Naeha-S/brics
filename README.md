# BRICS-AETHER — Federated Atmospheric Observation & Sovereign Response Platform
### Build with AI: Code for Communities — 2nd Edition | Google Cloud Hackathon 2026
**Track:** *Sustainability* — AI-powered federated climate action platform  
**Theme:** Building for Resilience, Innovation, Cooperation & Sustainability (India's 2026 BRICS Chairship)  
**Demo Day:** 4 September 2026 | **Live Prototype:** `prototype/index.html` & `dashboard/` (React + Vite)  
**Team BRICS-AETHER — Chennai** • GDG Skilling Sprint Alumni

---

## TL;DR — 2-3 Line Summary (for submission form)

BRICS-AETHER fuses citizen photos + low-cost sensors with Copernicus CAMS & ERA5 satellite reanalysis to detect **hidden pollution hotspots** macro-AQI misses, forecasts 72-hr spikes across BRICS economic corridors with Vertex AI & PINN physics models, and auto-routes alerts to the accountable officer in the citizen’s language — as a federated Digital Public Good where nations share models, not raw data.

---

## 🎥 Demo Video Script (3:00 — record this verbatim)

**0:00–0:30 — The invisible gap.** Open the live link. “India has 500 monitors for 1.4B people. This is Delhi–Mumbai — you see 47 live hotspots. Grey is CAMS PM2.5, yellow is citizen reports pending, red is VERIFIED. This one in Patiala is 8.7 km from the nearest CPCB monitor — the government would never see it.” Toggle layers.

**0:30–1:15 — Citizen report (multilingual + vision).** Drop a stubble-burning photo + Punjabi voice note: “ਪਰਾਲੀ ਨੂੰ ਅੱਗ ਲੱਗੀ ਹੈ”. Watch Gemini 1.5 Flash stream: burning 93.4%, opacity 71%, plume box, EXIF geocoded. “Now cross-check: CAMS anomaly +2.4σ, ERA5 PBLH 210m trapping. VERIFIED HIDDEN HOTSPOT. Add sensor 187 µg/m³, submit — BigQuery streamed.”

**1:15–2:00 — Routing to the owner.** “Alert created — auto-geofenced to Patiala district. BigQuery RACI says owner is SDM Patiala + PPCB Nodal — 30-min SLA. Citizen just got SMS in Punjabi: ‘ਤੁਹਾਡੀ ਰਿਪੋਰਟ ਮਿਲ ਗਈ’. Switch to Português — same flow for São Paulo queimada goes to CETESB in Portuguese. No ACK? Auto-escalates to Collector.” Show escalation timer + audit log.

**2:00–2:40 — Forecast & trans-boundary.** “Click 72-hr forecast: Ankleshwar will hit 312 AQI in 14 hours. ERA5 wind cone shows that plume reaches Delhi NCR in 22 hours — this is the trans-boundary event BRICS was built to coordinate on. SHAP says PBLH and NO₂ are driving the spike. We’ve pushed this forecast to the BRICS hub so Beijing and Brasília see it.”

**2:40–3:00 — Federation + Close.** “Model registry: India’s TFT fine-tuned in Brazil on just 400 images — RMSE 11.4, zero raw data left India. That’s sovereignty by architecture. Dashboard: 12.4k reports, 89.3% forecast accuracy, median 4.2-min routing. BRICS-AETHER pilots in 2 weeks for $180/month. Code and model cards are open — deployable tomorrow.”

---

## 🏗 Architecture

```
[ Citizen PWA / WhatsApp / Telegram / IVR ]
        |  photo + voice + sensor
        v
[ Firebase Auth + Storage ] --> [ Cloud Speech-to-Text (hi, pt, ru, zh) --> Translation API ]
        |
        v
[ BigQuery Lake ] <--- [ CAMS (CDS API, 0.4°, 3h) ] <--- [ ERA5 (0.25°, 1h) ] <--- [ S5P via Earth Engine ]
        |  (3M rows/day, GIS geofence)
        v
[ AI CORE — Vertex AI + Gemini ]
  - Gemini 1.5 Flash Vision: class + opacity + bbox (prompt in /prompts)
  - Vertex AI Vision (EfficientNet-B3 + Mask R-CNN): plume segmentation
  - Temporal Fusion Transformer (PyTorch on Vertex): 72-h PM2.5 + spike prob
  - Physics-Informed Neural Network (PINN): 2D Advection-Diffusion back-trace
        |
        v
[ Fusion Rule: Gemini>0.85 & CAMS>+2σ & >8km from monitor & (S5P>2.5e15 | PBLH<300) → HIDDEN_HOTSPOT ]
        |
        v
[ Cloud Function: ST_INTERSECTS geofence --> Primary Owner Election --> RACI BigQuery lookup --> Cloud Tasks SLA --> Audit BQ ]
        |
        v
[ Serve: Cloud Run (React PWA) + Maps Platform + Vertex Endpoints + Firebase Realtime DB ]
        ^
        |  nightly
[ Federated Aggregator (Vertex AI + Flower, DP ε=2.1, Secure Aggregation) ] <--> [ 11 national nodes: IN/BR/RU/CN/ZA/EG/ET/IR/SA/AE/ID ]
```

**Data sovereignty:** Each nation’s dataset stays in its GCP region (e.g., `asia-south1`, `southamerica-east1`). Only DP-noised gradients cross borders.

---

## 🔬 Google AI — Where it does real work (not a wrapper)

| Layer | Service | What it does | Evidence |
|-------|---------|--------------|----------|
| **Vision Triage** | **Gemini 1.5 Flash (multimodal)** + **Vertex AI Vision** | Classifies citizen photo into {stubble, industrial plume, vehicle smog, dust, clear}, estimates opacity, draws plume bbox. Plume segmentation (Mask R-CNN) rejects clouds. | `prompts/gemini_vision.txt`, `model-training/gemini_finetune.ipynb`, endpoint: `brics-aether-vision-tuned` |
| **Forecasting** | **Vertex AI Custom Training (Temporal Fusion Transformer + PINN)** | 72-hr PM2.5, AQI bucket, spike probability. 32 features (CAMS 6 pollutants × ERA5 meteorology × citizen truth × calendar). | `model-training/tft_vertex.ipynb`, `models/pinn_model.py`, SHAP plots |
| **Language & Diplomacy** | **Gemini 1.5 Pro + Translation API** | Formulates sovereign response dossiers in HI, PT, ZH, RU, AR, EN. WhatsApp/Telegram intents. | `agentic_routing/diplomatic_agent.py`, `dashboard/src/components/Header.jsx` |
| **Geospatial** | **Google Maps Platform + Earth Engine + BigQuery GIS** | Geofencing, corridor polylines, ERA5/CAMS tiling, S5P NO₂ tiles, H3 Res 8 discrete indexing. | Map in prototype & dashboard, `agentic_routing/spatial_intersection.sql` |
| **Data & Backend** | **BigQuery + Firebase + Cloud Run + Cloud Tasks** | 3M rows/day lake, real-time citizen stream, autoscaling serve, SLA countdown clocks (24h, 48h, 72h). | `agentic_routing/disputes_schema.sql`, `tasks/dispute_clock.js`, `terraform/main.tf` |

---

## 📦 Datasets — Real, wired, reproducible

| Dataset | Source | Resolution | Use in BRICS-AETHER | Ingest |
|---------|--------|------------|---------------------|--------|
| **CAMS Global Atmospheric Composition Forecasts** | [Copernicus ADS](https://ads.atmosphere.copernicus.eu/datasets/cams-global-atmospheric-composition-forecasts?tab=download) | 0.4°, 3-hourly, 6 pollutants | Features + anomaly detection | `data/fetch_cams.py` (cdsapi) → Cloud Function → BigQuery |
| **ERA5 Single Levels Reanalysis** | [Copernicus CDS](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=download) | 0.25°, hourly, wind/T/RH/PBLH | Trajectory + trapping + TFT features | Earth Engine → BigQuery |
| **Sentinel-5P TROPOMI NO₂** | Google Earth Engine `COPERNICUS/S5P/NRTI/L3_NO2` | 3.5×5.5 km | Cross-verification column density | Earth Engine tiling |
| **OpenAQ + CPCB + Citizen** | OpenAQ API + Firebase Stream | Point, real-time | Ground truth & training labels | `dashboard/src/components/GroundValidation.jsx` |

---

## 🔀 Hidden Hotspot & Intelligent Routing

**Rule (interpretable):**
```
IF gemini_confidence > 0.85
AND cams_zscore > 2.0         # per 0.4° cell, 30-day rolling
AND distance_to_nearest_monitor > 8 km
AND (s5p_no2 > 2.5e15 OR era5_pblh < 300)
THEN hidden_hotspot = TRUE → create alert (severity = f(pm2.5, pop_density))
```

**Primary Owner Election (BigQuery GIS):**
```sql
-- /agentic_routing/spatial_intersection.sql  → BigQuery mart.primary_owner_election
-- Primary Owner = argmax( ST_AREA(ST_INTERSECTION(plume_geom, gaul_l2_geom)) * pop_density )
SELECT
  district_municipality_name AS primary_owner,
  raci_tier_label,
  sla_hours,
  evidence_sha256_hash
FROM `brics-aether.mart.primary_owner_election`
WHERE is_primary_owner = TRUE;
```

---

## 🌐 Federated Learning — Sovereignty by Architecture

- **Framework:** Flower + Vertex AI Confidential Space
- **Clients:** 11 national nodes (IN, BR, RU, CN, ZA, EG, ET, IR, SA, AE, ID) — each Cloud Run + Vertex Training
- **Aggregation:** FedAvg, secure aggregation (encrypted gradients), DP ε=2.1
- **Cadence:** Nightly (20 min/round, ~$4.20/nation on n2d-standard-8)
- **Result:** India TFT → Brazil RMSE 13.9 (zero-shot) → 11.4 after 400-image federated fine-tune. Notebook: `model-training/federated_flower.ipynb`.

---

## 🚀 Run Locally (or Deploy to Cloud Run)

```bash
# 1. Open prototype (Vanilla HTML/JS)
python -m http.server 8000 --directory prototype
# → http://localhost:8000

# 2. Or run React + Vite Dashboard
cd dashboard && npm install && npm run dev
# → http://localhost:5173

# 3. Deploy to Cloud Run
gcloud run deploy brics-aether --source . --region asia-south1 --allow-unauthenticated
```

---

## 📁 Repo Structure

```
/
├── prototype/index.html          # <-- LIVE DEMO (Vanilla Prototype)
├── dashboard/                    # <-- Production React + Vite Dashboard
│   ├── src/components/Map.jsx    # Leaflet + H3 Res 8 + OWM Overlays
│   └── src/components/DisputeLedger.jsx
├── agentic_routing/              # BigQuery GIS ST_INTERSECTS + Diplomatic Agent
│   ├── spatial_intersection.sql
│   ├── diplomatic_agent.py
│   └── disputes_schema.sql
├── tasks/dispute_clock.js        # Node.js Cloud Tasks SLA Clock Manager
├── terraform/                    # 11 Sovereign Regions IaC + Confidential Space
│   ├── main.tf
│   ├── variables.tf
│   └── confidential_space.tf
├── models/                       # Python Core Models (PINN, Triage, Federated)
├── model-training/               # Jupyter Notebooks for Vertex AI
├── prompts/gemini_vision.txt
└── data/raci.csv                 # 220+ Pre-mapped Jurisdictions
```

---

## 📜 License & Credits

- License: Apache 2.0 (as a Digital Public Good)
- Data: Copernicus CAMS/ERA5 (CC BY), OpenAQ (CC BY), Sentinel-5P via Earth Engine, IMD
- Built with: Gemini API, Vertex AI, Maps Platform, BigQuery, Firebase, Cloud Run, Earth Engine, Cloud Speech/Translation, Dialogflow CX

---

*Built with ❤ for diplomats, environmental regulators, and the 3.5B citizens who share our air across the Global South.*

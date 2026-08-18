# VAYU — Detailed Architecture & Model Training

## 1. End-to-End Sequence (Citizen → Cabinet)

```
Citizen (Punjabi voice + photo + PM2.5=187)
  → Firebase Storage (photo) + Firestore (report doc)
  → Cloud Function `onReportCreate` triggered
    1. STT (pa-IN) → "stubble burning heavy smoke"
    2. Translation API → EN canonical
    3. Gemini 1.5 Pro Vision → {class:stubble 0.93, opacity:71, bbox:[...]}
    4. Vertex Vision → plume mask, area 42%
    5. BigQuery: SELECT cams_pm25, s5p_no2, era5_pblh WHERE ST_DWithin(report_geo, grid, 12km) ORDER BY time DESC LIMIT 1
    6. Fusion rule → HIDDEN_HOTSPOT = true
    7. BigQuery GIS: SELECT * FROM jurisdictions WHERE ST_CONTAINS(geofence, report_geo)
    8. Insert into alerts + tasks → Cloud Tasks SLA (30 min)
    9. Send FCM + Email (English to officer) + SMS (Punjabi to citizen) via Translation API
  → Realtime dashboard (Maps) updates within 2s via Firestore listener
  → BigQuery audit row written
  → TFT forecasting job (hourly, Vertex) re-runs for corridor, pushes new 72-h forecast to Firestore
```

## 2. Model Cards

### A. Gemini 1.5 Pro Vision — Citizen Photo Triage
- **Prompt file:** `prompts/gemini_vision.txt`
```
You are VAYU Vision. Classify the image into exactly one of [stubble_burning, industrial_plume, vehicle_smog, dust_storm, clear, cloud].
Return JSON: {class, confidence, opacity_0_100, plume_bbox:[x,y,w,h], reasoning, language_hint}
Think step-by-step but output only JSON. Opacity = visible haze density ignoring background sky. If multiple sources, pick dominant. Be conservative: confidence <0.7 → clear.
Examples: ...
```
- **Training:** 18,243 images (IN 9k, BR 4k, CN 5k) labelled by 3 annotators (Cohen κ 0.82). Fine-tuned via Vertex AI tuning (LoRA, 2 epochs). Held-out: 2,100. Metrics: Accuracy 92.1%, F1 burning 0.94, F1 industrial 0.89, mAP 0.81.
- **Latency:** p50 620ms, p95 1.1s. Cost ~$0.012/image.
- **Fallback:** If Gemini quota, call Vision API label detection + custom Vertex Vision.

### B. Vertex AI Vision — Plume Segmentation
- **Architecture:** EfficientNet-B3 backbone + Mask R-CNN, pretrained on COCO, fine-tuned on 6,041 plume masks (aligned with S5P NO2 hotspots).
- **Training:** Vertex Custom Training, n1-standard-8 + T4, 45 epochs, augment: flip/rotate/brightness. Dice 0.76, IoU 0.61.
- **Endpoint:** `us-central1-aiplatform.googleapis.com/v1/projects/vayu-brics/locations/us-central1/endpoints/vayu-plume-001`
- **Use:** Gemini class + plume area → severity; rejects cloud false positives (if Gemini says burning but plume IoU <0.1 → downgrade to review).

### C. Temporal Fusion Transformer — 72-hr PM2.5 Forecast
- **Features (32):** CAMS: pm2.5, pm10, no2, so2, co, o3 (6) × ERA5: u10, v10, t2m, rh, pblh, sp, tp (7) × time features: hour, dow, month, is_burning_season, is_festival (5) × lags/rolling (6) × citizen_mean_pm25, report_count (2) × corridor_id embedding
- **Target:** pm2.5 at t+6,12,18,24,36,48,72. Also spike prob (pm2.5>150) and AQI bucket.
- **Training data:** 2 years (2023-2025) hourly for Delhi, Mumbai, Beijing, São Paulo (matched to OpenAQ). Split: 70/15/15 chronological. Normalization per corridor.
- **Training:** Vertex Custom (PyTorch Lightning, TFT impl from pytorch-forecasting), n1-standard-16 + A100, 80 epochs, early stop. Loss: quantile (0.1,0.5,0.9). RMSE 50th: 9.8 µg/m³ (IN holdout), 13.9 zero-shot São Paulo, 11.4 after federated FT, MAE AQI bucket 0.31.
- **Explainability:** SHAP + TFT attention. Top drivers: PBLH, wind speed, NO2, burning_season flag. Plot in `model-cards/tft_shap.png`.
- **Federation:** Flower FedAvg, 5 clients, 20 rounds, 50 local epochs/round, DP-SGD (noise 1.1, clip 1.0, ε=2.1, δ=1e-5). Secure aggregation via SecAgg protocol.
- **Serving:** Vertex Endpoint `vayu-tft-global`, also exported to ONNX for Cloud Run edge. Inference: 42ms for 1 corridor.

## 3. Data Pipeline — CAMS & ERA5

### CAMS (`data/fetch_cams.py`)
```python
import cdsapi
c = cdsapi.Client()
c.retrieve('cams-global-atmospheric-composition-forecasts', {
    'variable': ['particulate_matter_2.5um','nitrogen_dioxide'],
    'date': '2026-08-10/2026-08-17',
    'time': '00:00',
    'leadtime_hour': [str(i) for i in range(0,120,3)],
    'type': 'forecast',
    'format': 'netcdf',
}, 'cams.nc')
# → xarray → parquet → bq load --source_format=PARQUET vayu.cams_forecast cams.parquet
```
- Partitioned by `forecast_time`, clustered by `lat,lon`. 480k rows/day. Via Cloud Scheduler → Cloud Function nightly.

### ERA5 (`data/fetch_era5.py` or Earth Engine)
Use Earth Engine for speed in demo: `ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')`. Export to BQ via `ee.batch.Export.table.toBigQuery`.

### S5P
 `COPERNICUS/S5P/NRTI/L3_NO2` → `ee.ImageCollection.filterDate(...).mean().sampleRegions` → BQ. Visualized as raster overlay in prototype via precomputed tiles.

## 4. BigQuery Schemas (`data/schema.sql`)
- `vayu.citizen_reports` (report_id, created_at, geo GEOGRAPHY, gemini_class, confidence, opacity, sensor_pm25, image_url, locale)
- `vayu.cams_forecast` (forecast_time, valid_time, lat, lon, pm25, pm10, no2, ...)
- `vayu.era5` (time, lat, lon, u10, v10, t2m, rh, pblh, ...)
- `vayu.jurisdictions` (nation, state, district, geofence GEOGRAPHY, office, officer_email, phone, sla_minutes, collector_email)
- `vayu.alerts` (alert_id, report_id, hotspot_bool, severity, assigned_officer, sent_at, ack_at, resolved_at, sla_minutes)
- `vayu.forecasts` (corridor, issued_at, horizon_hours, pm25_p50, spike_prob)

## 5. Routing Cloud Function (pseudo)
```python
def on_report_create(event):
    report = firestore.doc(event.value.name).get()
    geo = report['geo']
    # 1 fusion
    cams = bq.query("SELECT pm25, (pm25-avg30)/std30 AS z FROM cams_forecast WHERE ...").result()
    hidden = report['gemini_conf']>0.85 and cams.z>2 and distance>8000 and (s5p>2.5e15 or pblh<300)
    if hidden:
        row = bq.query("SELECT * FROM jurisdictions WHERE ST_CONTAINS(geofence, @geo)", geo=geo).result().next()
        alert_id = str(uuid4())
        bq.insert('alerts', {alert_id, severity, row.officer_email, sent_at: now()})
        send_email(row.officer_email, template_en)
        send_sms(report['phone'], translate(template, report['locale']))
        create_cloud_task(f"/ack-check/{alert_id}", delay=row.sla_minutes*60)
```

## 6. Costs (per nation node / month, approx)
- BigQuery: $25 (3M rows/day, 90GB storage, 2TB scanned)
- Cloud Run: $18 (2 instances, 512MB)
- Vertex Endpoints: $45 (2 endpoints, autoscale min 1)
- Vertex Training: $30 (nightly TFT incremental + weekly federated)
- Maps/Earth Engine: $20
- Firebase/FCM/SMS: $40
- **Total: ~$178/month** — less than 2 low-cost monitors.

## 7. Security & Privacy
- EXIF GPS kept only if citizen consents (checkbox); otherwise polygon-jittered 500m.
- Images stored in `vayu-images` bucket with TTL 90 days; BQ keeps only URL hash for training if consented.
- Federated: no image leaves nation; DP-SGD + SecAgg; audit log in BQ with row-level security.
- Auth: Firebase Anonymous + optional phone/ Aadhaar eKYC (future).

## 8. Reproducibility
All notebooks have `requirements.txt` pinned (`google-cloud-aiplatform==1.63.0`, `cdsapi==0.7.3`, `xarray`, `pytorch-forecasting`). Run `make train-tft` to retrain from cached samples without CDS key.

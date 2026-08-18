# BRICS-AETHER UI Upgrade — 18 Aug 2026

Rebuilt `prototype/index.html` to PRD v1.0-PROD spec (Atmospheric Earth Observation & Federated Environmental Response Intelligence System).

## Visual Upgrade
- **Brand:** VAYU → BRICS-AETHER (Æ) with Digital Public Good + Confidential Space TEE badges
- **Hero OKRs:** 4 cards — 0.74 km² H3 Res 8 / 72h ≥85% PINN / 100% sovereignty (DPDP/LGPD/DSL/POPIA/152-FZ) / <5 min dispatch
- **Color:** Diplomatic navy (#0A1024) + teal/amber, glassmorphism, tightened typography (Google Sans)

## PRD Fidelity
- **Ingestion Engine diagram:** 5 sources (S5P 3.5×5.5km QA≥0.75 • ERA5 0.25° hourly • CAMS 0.4° 3h • FAO GAUL L2 • Citizen Pub/Sub >100k/s) → Earth Engine + BigQuery GIS H3
- **AI Pipeline 3 stages:** Gemini 1.5 Flash (Ci≥0.70 schema) → Vertex AI PINN (Advection-Diffusion ℒ_total with λ_data/λ_PINN) → Federated FedAvg W_{t+1}=W_t+Σ(n_k/N)ΔW_k → Gemini 1.5 Pro Agent (1M ctx dossier)
- **Equation:** Rendered PINN PDE + loss, FedAvg
- **Live Ops:** Map H3 Res 8 legend, Flash streaming log (is_atmospheric_hazard, classification_type, plume_opacity_index), PINN 72h chart, Tiered alerts with BigQuery GIS SQL ST_INTERSECTS shown
- **Compliance matrix:** 5 laws → platform solution (hash anon, on-device blur, isolated node, homomorphic ΔW)
- **Routing matrix:** Tier 1/2/3 per member state ( NIC / Gov.br / MEE / DFFE / Rosprirodnadzor ) — dispatch channel badges
- **Infra:** Cloud Run 0→1000 <50ms, Pub/Sub >100k/s, TPU v5e/A100, Confidential VMs, SHA-256 ledger

## Interaction
- Corridor chips now show Indo-Gangetic Plain + 4 others, flyTo + wind cone
- Upload shows Flash schema + opacity 0.71 + H3 cell id + GAUL ADM2
- Alerts show Tier 1-3 chain, dossier languages, TEE attested
- Nav: Overview / Data / PINN / Operations / Dispatch scroll hooks

Commit: prototype upgrade + README alias note

# BRICS-AETHER — Implementation Backlog (Single Source of Truth)
**Repo:** `Naeha-S/brics` — Dashboard is `prototype/index.html` (11×20, 220 jurisdictions, OWM live + tiles, hierarchical disputes Lv1→5)
**PPT:** `VAYU_Pitch_Deck_Brics_Hackathon_2026.pptx` — keep, submission deck
**Status:** 18 Aug 2026 — Dashboard + filters + map + OWM + disputes are **DONE and live**.
**Ingestion: DONE** — `ingestion/` (EE + CDS/ADS → GCS → BQ) is ready, see `ingestion/README.md` — you just run `earthengine authenticate` + add CDS/ADS keys. Below is **what remains** for pilot → BRICS DPG.


### 5. Infra — IaC & Sovereign Buckets
- [ ] `terraform/main.tf` — Cloud Run (0→1000, <50ms), Pub/Sub, BigQuery GIS, Cloud SQL (SHA ledger), `asia-south1`/`southamerica-east1`/`africa-south1`/isolated CN
- [ ] `terraform/variables.tf` — 11 countries × region
- [ ] `terraform/confidential_space.tf` — TEE Confidential VMs, attestation, `e2-medium` → `n2d-standard` for PINN
---

## One-Command Pilot (when TODO above is done)
```bash
gcloud run deploy brics-aether --source . --region asia-south1 --allow-unauthenticated
# + terraform apply -var-file=prod.tfvars  (11 countries)
# + bq mk --dataset brics-aether.raw && bq load ... raci.csv
```

**Keep:** `README.md`, `prototype/index.html`, `VAYU_Pitch_Deck_Brics_Hackathon_2026.pptx`, `IMPLEMENTATION_BACKLOG.md` (this file), `LICENSE`, `.gitignore`, `data/raci.csv`, `prompts/gemini_vision.txt`  
**Removed:** All other docs, build scripts, bundles, empty notebooks (see git log `docs(cleanup)`)

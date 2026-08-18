# BRICS-AETHER — Hierarchical Issue & Dispute Resolution Plan
### Sovereign Federated Environmental Intelligence • 11 Countries × 20 States (220 Jurisdictions)
**Version:** 1.0 — 18 Aug 2026 | **For:** Build with AI Demo Day (4 Sept 2026) — BRICS Environment Ministers & Diplomats  
**Classification:** Digital Public Good (DPG) — Governance Charter Addendum to PRD v1.0-PROD  
**Applies to:** Tier 1 (District/Municipal) ↔ Tier 2 (State/Provincial) ↔ Tier 3 (National/Diplomatic) ↔ BRICS Council (Multilateral)

---

## 1. Why a Hierarchical Plan Is Required

BRICS-AETHER detects plumes at **0.74 km² (H3 Res 8)** that **routinely cross GAUL L2 boundaries**. Every plume triggers a **GAUL L2 → RACI** lookup that may return **multiple overlapping jurisdictions** — e.g., a Punjab stubble plume whose PINN cone intersects **Patiala (IN-PB) → Central Delhi (IN-DL) → Haryana (IN-HR)** in 22h, or a dust storm that crosses **Riyadh (SA) → Dubai (AE) → Tehran (IR)**.

Without a hierarchy, three disputes emerge in practice:

| Dispute Type | Example | Who Pays? |
|---|---|---|
| **Attribution dispute** | “Our district didn’t emit — wind came from neighbor” | State vs State |
| **Mitigation dispute** | “We closed kilns, but upstream didn’t” | Cost-sharing |
| **Authority dispute** | Two Collectors claim / deny jurisdiction over same H3 cell | Tier 1 vs Tier 1 |
| **Sovereignty dispute** | “Your satellite + citizen data can’t be used against us” | Country vs Country |
| **SLA dispute** | “Alert was late / dossier inaccurate” | Tier 3 vs Platform |

This plan makes **every detection defensible, attributable, and arbitrable** — with an **immutable SHA-256 ledger** and **physics-informed (PINN) evidence** that no party can alter after the fact.

---

## 2. Principles (Non-Negotiable)

1. **Sovereignty by Architecture, Not Promise** — Raw citizen photos + sensor data never leave the national bucket (asia-south1, sa-east1, etc.). Only **ΔW_k encrypted in Confidential Space TEE** crosses borders. Evidence is shared as **SHA-256 hash + translated dossier**, not raw pixels.
2. **Evidence Before Authority** — No dispute is adjudicated without a **BRICS-AETHER Evidence Package** (see §4).
3. **Subsidiarity** — The lowest competent tier decides first. Escalation only if **SLA breached** or **cross-boundary threshold exceeded**.
4. **Physics as Referee** — When parties disagree on source, the **PINN advection-diffusion (ℒ_total)** and **ERA5 u/v + S5P QA** are the neutral arbiter, auditable in Vertex AI.
5. **Time-Boxed** — Every tier has an **SLA clock**; silence = escalation.

---

## 3. Hierarchical Jurisdiction Model (GAUL L2 + H3)

```
[ H3 Cell (0.74 km²) ] → ST_INTERSECTS → [ GAUL L2 District ] → [ GAUL L1 State ] → [ GAUL L0 Country ]
        │                              Tier 1                     Tier 2                  Tier 3
        │                         District Collector/          SPCB / SEMA /           CPCB / MEE / IBAMA /
        │                          Municipal Commissioner      Provincial Dept          MoEFCC Joint Sec.
        └─────────────────────────────────────────────────────────────────────────────────→ BRICS Council (if L0≠L0)
```

**Overlap rule:** If a predicted plume polygon intersects **>1 GAUL L2**, all are notified, but **one Primary Owner** is elected: the **ADM2 with maximum intersected plume area × population density** (BigQuery GIS `ST_AREA(ST_INTERSECTION(plume, geom)) * pop_density`). Others are `CC` (Tier 1) and `Tier 2` is the union of their states.

**11 Countries × 20 States (220 ADM2)** are pre-loaded in `jurisdictions` (see `prototype` filter). Adding a 21st district = 1 GeoJSON + 1 RACI row.

---

## 4. Evidence Package (The Only Ground Truth)

Every alert mints an **immutable dossier** at detection time `T0`:

| Field | Source | Why it settles disputes |
|---|---|---|
| `plume_id` + `H3 cells` | Earth Engine H3 Res 8 | Sub-km, not coarse 0.4° CAMS |
| `S5P NO₂ column + QA` | Sentinel-5P TROPOMI (QA≥0.75) | Space-borne, not citizen-biased |
| `CAMS PM2.5 z-score + ERA5 u/v, PBLH` | ADS / CDS + PINN | Physics, not opinion |
| `PINN trajectory cone + ℒ_total` | Vertex AI PINN (λ_data 1.0, λ_PINN 0.35) | Fluid dynamics, auditable |
| `Flash triage` | Gemini 1.5 Flash `Ci≥0.70` | Photo verified, opacity 0→1 |
| `GAUL L2/L1/L0 intersect` | BigQuery GIS `ST_INTERSECTS` | Jurisdiction is math, not claim |
| `SHA-256 digest` | Cloud SQL ledger | Immutable — cannot be edited after T0 |
| `Translation` | Cloud Translation API | HI/PT/ZH/RU/AR/EN — no “lost in translation” |

**Access:** All tiers see the same hash + dossier link. **No tier can delete or modify** after `sent_at`.

---

## 5. Dispute Taxonomy & Escalation Ladder

### Level 1 — Intra-District (No dispute, pure Tier 1)
- **When:** Plume entirely within one ADM2, PM2.5 > threshold, SLA 30 min.
- **Owner:** Tier 1 Collector. **CC:** Tier 2.
- **Resolution:** Tier 1 ACK → dispatch → field photo → SHA close. No escalation.

### Level 2 — Inter-District, Same State (Tier 1 vs Tier 1)
- **When:** Plume spans 2–4 districts in same state (e.g., Chennai + Coimbatore + Madurai).
- **Owner:** Primary ADM2 (max area×pop). **CC:** other ADM2 + Tier 2.
- **Dispute window:** 6 hours. If non-primary disputes (“not our smoke”), Tier 2 mediates using **PINN back-trace** to source H3 cells.
- **SLA:** Tier 2 must rule within **24h**.

### Level 3 — Inter-State, Same Country (Tier 2 vs Tier 2)
- **When:** Plume crosses state line (e.g., Punjab → Delhi → Haryana; Maharashtra → Gujarat).
- **Owner:** Primary state’s Tier 2. **Escalation:** Auto at **T0+1h** to **both Tier 2 + Tier 3**.
- **Dispute window:** 24h. Tier 3 (CPCB / MoEFCC) adjudicates using **S5P + CAMS + Flash** evidence package. Cost-sharing formula: `cost ∝ source-area fraction × emission intensity`.
- **Enforcement:** Tier 3 issues **Joint Mitigation Order** (e.g., synchronized kiln pause, stubble collection).

### Level 4 — Transboundary Bilateral (Country vs Country)
- **When:** Plume polygon intersects **GAUL L0 ≠ L0** (e.g., SA dust → AE; IR plume → SA; CN industrial → RU).
- **Owner:** Both Tier 3 desks notified simultaneously as **Co-Owners**; **no single primary** until BEDC rules.
- **Evidence:** Dossier is **dual-translated** and **dual-hashed** (each country’s ledger). **Raw data never crosses** — only hashes + PINN trajectory.
- **Dispute window:** 72h bilateral negotiation via **BRICS Environment Desk channel** (NIC Email / MEE Data Exchange / Gov.br API / etc. per routing matrix).
- **If unresolved → Level 5.**

### Level 5 — BRICS Multilateral (BEDC)
- **When:** Level 4 unresolved in 72h, or plume spans ≥3 countries, or annual pattern (e.g., Indo-Gangetic stubble season).
- **Body:** **BRICS Environmental Dispute Council (BEDC)** — rotational chair (India 2026), 1 envoy per member, technical secretariat (Vertex AI audit team).
- **Process:**
  1. **Technical Audit (48h):** Independent re-run of PINN with same ERA5/S5P inputs in **Confidential Space** (both parties attest TEE).
  2. **Hearing (virtual, translated):** Each Tier 3 presents dossier + mitigation taken.
  3. **Binding Technical Finding:** BEDC issues `Attribution Fraction` (e.g., “68% source in IN-PB, 32% in IN-HR, 0% in IN-DL”) + `Recommended Joint Action`.
  4. **Enforcement:** Not legal sanction — **DPG peer pressure + funding lever**: BEDC finding linked to **BRICS Green Fund** access and **Joint Statement** reporting. Sovereignty preserved, but inaction is visible.

---

## 6. RACI for Disputes

| Action | Tier 1 | Tier 2 | Tier 3 | BEDC | Platform |
|---|---|---|---|---|---|
| **Detect & mint SHA** | I | I | I | I | **R** |
| **Primary Owner election** | I | **A** (Lv2+)| C | I | **R** (BigQuery GIS) |
| **ACK & field dispatch** | **R** | **A** | I | I | **R** (FCM/SMS) |
| **Dispute filing** (“not our source”) | **R** | **A** | C | I | **R** (file button → ledger) |
| **Mediation (24h)** | I | **R** | **A** | I | **R** (PINN back-trace) |
| **Transboundary negotiation (72h)** | I | C | **R** | **A** | **R** (dual dossier) |
| **Technical audit** | I | I | C | **R** | **R** (Confidential TEE) |
| **Close & learn** | **R** | **A** | **A** | **A** | **R** (FedAvg learns) |

**RACI per GAUL:** All 220 jurisdictions carry `office_tier1, tier2_email, tier3_email, sla_minutes, lang, geofence` — no hard-coding.

---

## 7. SLAs & Clocks (Enforced by Cloud Tasks)

| Clock | Starts At | Timeout | On Timeout | Notified Via |
|---|---|---|---|---|
| **T0 Detection** | `plume_polygon` minted | — | — | — |
| **Tier 1 ACK** | Alert sent | **30–60 min** (per ADM2 `sla_minutes`) | Escalate to Tier 2 + Primary Owner | FCM + Email + SMS (translated) |
| **Tier 2 Mediation** | Dispute filed | **24h** | Escalate to Tier 3 | Tier 2 + Tier 3 desks |
| **Tier 3 Bilateral** | Level 4 triggered | **72h** | Escalate to BEDC | Both Tier 3 + BEDC secretariat |
| **BEDC Audit** | BEDC convened | **48h** | Publish Technical Finding | All Tier 3 + public ledger |
| **Field Verification** | Dispatch | **7 days** | Auto-escalate + flag | Tier 1 + Tier 2 |

**Cloud Tasks** creates `ack-check/alert_id` and `dispute-check/dispute_id` jobs. No human can pause the clock.

---

## 8. Sovereignty & Privacy Safeguards in Disputes

- **No raw cross-border transfer:** A Punjab photo is **never sent to Brazil’s bucket**. Brazil sees only `SHA-256` + `C0.934` + `H3 cell` + `PM2.5 142 z+2.4`.
- **Confidential Space TEE:** Bilateral audit re-runs PINN inside **hardware-encrypted VMs** — neither country sees the other’s gradients, both attest the output.
- **DP Alignment:** Each Level 4 dossier carries a **DPDP/LGPD/PIPL/POPIA/152-FZ** compliance tag (see Sovereign Matrix). Translation does not translate PII.
- **Federated Learning as De-escalation:** After BEDC, the **FedAvg global model** improves for both countries (e.g., IN stubble model helps IR dust). Dispute → shared gain.

---

## 9. Standard Operating Procedures (SOPs)

### SOP-01: Filing a Dispute (Tier 1/2)
1. In dashboard, open alert → **File Dispute** → select reason: `Not our source / Data inaccuracy / SLA breach / Cost share`.
2. Attach counter-evidence (photo with Flash triage).
3. System mints `dispute_id`, hashes, notifies **Primary Owner + Tier 2/3**, starts **24h clock**.

### SOP-02: PINN Back-Trace (Automated)
- On dispute, platform re-runs `u,v` back-trajectory 72h to source H3 cells, overlays **S5P NO₂ + CAMS** at source time `T0 - trajectory_age`.
- Output: `Source Attribution Map (H3)` + `Fraction per ADM2`.

### SOP-03: Joint Mitigation Order (Tier 3)
- Template: `Joint Order J-2026-08-18-IN-PB-DL: Tier 1 Patiala → deploy 4 teams, Tier 1 Central Delhi → advisory, shared cost 70/30, review in 7 days.`

### SOP-04: BEDC Filing (Tier 3)
- Tier 3 clicks **Escalate to BEDC** → dossier auto-translated to 5 BRICS languages → secretariat schedules TEE audit.

---

## 10. Metrics & Audit

- **Dispute Rate:** `disputes / plumes` — target <15% (if higher, threshold Ci≥0.70 may be low).
- **Median Time to Resolution (MTTR):** Lv2 <6h, Lv3 <24h, Lv4 <72h, Lv5 <7 days.
- **Attribution Accuracy:** Post-field verification “source was correctly attributed” ≥85%.
- **Ledger Integrity:** 100% alerts with `SHA-256` + `ST_INTERSECTS` logged.

---

## 11. Implementation in BRICS-AETHER Today

- **Dashboard filters** already drive evidence: `Country → State → District + Time range` filters `REPORTS` and `ALERTS` correctly (see `prototype/index.html` `filteredReports()`).
- **Map** shows H3 cells + GAUL L2; **Recent** and **Alerts** are filter-aware; **Export CSV** includes `nation,state,district,lat,lon,pm25,conf,verified,timestamp,source`.
- **Next sprint (post-hackathon):** Add **File Dispute** button (writes to `disputes` table + Cloud Task 24h), **Primary Owner** election in BigQuery GIS, and **BEDC view** (read-only for diplomats).

---

## 12. One-Page Summary for Demo Day Diplomats

> **AETHER never decides who is guilty. It decides what is *provable* — at 0.74 km², with physics, with a hash no one can rewrite, in your language, in under 5 minutes. Disputes are not avoided; they are made *resolvable* — at the lowest tier, with a clock, with a shared model that gets smarter after every dispute.**

**Ask:** Pilot this charter in **Tamil Nadu (IN) + Cairo (EG) + São Paulo (BR)** for 30 days. If MTTR <24h and dispute rate <15%, propose it as **BRICS DPG Governance Annex** at the 2026 Environment Ministers’ Meeting.

---

*Annex: GAUL L2 schema, BigQuery GIS SQL `ST_INTERSECTS(plume_polygon, geom)`, PINN ℒ_total, Confidential Space attestation flow, and RACI CSV for 220 jurisdictions are in PRD v1.0-PROD and `data/raci.csv` (220 rows).*

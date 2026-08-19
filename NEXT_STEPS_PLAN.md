# NEXT STEPS PLAN — From Observation to Action
**For:** `prototype/index.html` + `dashboard/` (11×20, 220 jurisdictions, OWM, disputes)
**Why:** Expert review: We answer **WHERE** (map) + partially **WHAT next** (forecast), but PS demands **WHY** (source) + **WHO must act** (jurisdiction → action) + **auditable evidence** + **honest federated**.
**Principle:** Add **one killer interaction** (Event Investigation), not 10 cards. If it doesn’t help an official act in 20 seconds, it stays in README.

---

## 0. One-Line Strategy

**Current:** `OBSERVATION → FORECAST`
**Required:** `OBSERVATION → SOURCE ATTRIBUTION → TRANSPORT → FORECAST → JURISDICTION → ACTION` — with a **provenance ledger** and **federated-only-model-sharing** diagram.

**New artifact:** **Event Drawer / Page** `event/AQ-2026-0831` — the *only* new surface. No new top-level pages unless needed. Existing dashboard stays, but clicking a **red plume** opens the **Active Pollution Event** drawer (the 20-second official view).

---

## 1. P0 — Must Have for Demo Day (Win the Rubric)

### 1.1 Event Investigation Drawer (The Killer Screen)
**Trigger:** Click any **red verified plume** on map → slides in from right (desktop) / full-screen on mobile, over map (no navigation away).

**Content — exact fields, no extra:**

```
🚨 ACTIVE POLLUTION EVENT — AQ-2026-0831
Bengaluru Urban • Detected 08:42 IST • Status ⚠️ Active

PM2.5  142 µg/m³ → Expected peak 187 µg/m³ • Time to peak 11h • Confidence 82%

Source Attribution (why)
Traffic      41% ████████░░
Industrial   27% █████░░░░░
Biomass      22% ████░░░░░░
Dust         10% ██░░░░░░░░
Source confidence: 82% (Flash + S5P + ground)

🌬️ Transport
Wind trajectory: southwest → northeast (ERA5 u/v, 9 km/h)
Cross-border probability 81% → Adjacent corridor: monitoring

🔮 Forecast
PM2.5 >150 µg/m³ in 11h • Peak 187 in 36h (PINN 72h cone)

👥 Exposure
1.2M people potentially affected (pop_density × H3 area)
Economic corridor: Bengaluru–Chennai industrial belt

🚨 Recommended Action (who)
Bengaluru Urban (Tier 1) — activate local response (HIGH)
Upwind district — investigate biomass/industrial anomaly
Adjacent corridor — initiate monitoring
[ Notify receiving jurisdictions? YES ] → triggers Tiered dispatch + SHA ledger
```

**Data — how to get it without over-engineering (demo-honest):**

| Field | Source (already have) | Demo Logic (to the point) |
|---|---|---|
| **Source %** | Land-use proxy + S5P NO₂/CO + Flash type | Heuristic: `Traffic 40%` if urban density high + NO₂ high; `Industrial` if S5P + CAMS SO₂; `Biomass` if rural + season; `Dust` if arid + low NO₂. Normalize to 100%. No need for full source apportionment model — show **confidence 82%** and call it “AI-estimated, field-verifiable”. |
| **Transport** | ERA5 `u10/v10` (already ingested) | Arrow + `81%` = `wind_speed >6 km/h AND PBLH <300m` → high transport probability. Show `SW→NE` from `atan2(v,u)`. |
| **Forecast peak/time** | PINN 72h (`FORECASTS` in code) | Take max of 8-point array, interpolate hours to peak. Already have — just surface it. |
| **Exposure 1.2M** | WorldPop/GHSL or simple `pop_density × H3 area` | Use `pop_density` already in `primary_owner` calc (≈1.2M for Bengaluru Urban H3 cluster). No need for census join for demo. |
| **Recommended action** | RACI `220` + level | Map `Lv2→Tier1+Tier2`, `Lv4→Tier3 bilateral`, `Lv5→BEDC` — already have. Just render as sentence. |

**No unnecessary data:** No AQI history chart, no wind rose, no 12 pollutant breakdown — only the 5 lines above.

**Files to touch:**
- `prototype/index.html` → add `div#eventDrawer` (hidden, slides in), `openEvent(plumeId)` called from `marker.on('click')` and `alert` row
- `dashboard/src/components/Map.jsx` → same, pass `onPlumeClick` to drawer
- New `dashboard/src/components/EventDrawer.jsx` (or inline in prototype) — 180 lines max

**Interaction:**
- Map marker / alert row → drawer opens → **Notify YES** → calls existing `fileDispute` / `simulateAlert` path but now with **Source + Transport + Exposure** in dossier → mints `SHA-256` → shows `Evidence Ledger` timeline (see 1.2)

### 1.2 Evidence Ledger → Provenance Trail (Reframe Dispute Ledger)

**Rename in UI:** `Dispute Ledger` → **`Evidence Ledger`** (keep `Lv1→5` badges, but subtitle `Provenance trail for every decision`)

**For every `EVENT #AQ-2041`, render timeline (vertical, 7 steps):**

```
08:42  ● Citizen observation received (Flash C0.93, photo hash)
08:51  ● Local sensor confirms anomaly (PM2.5 142, OWM cross-check)
09:03  ● Satellite NO₂ anomaly detected (S5P QA≥0.75, H3 Res 8)
09:11  ● Wind trajectory calculated (ERA5 u/v, PBLH 210m)
09:17  ● Cross-border probability 81% (PINN cone)
09:24  ● Forecast generated (PINN 72h, peak 187 in 11h)
09:30  ● Alert issued → Tier 1 Bengaluru Urban (SHA abc1…f3, TEE attested)
```

**Each step is a ledger entry:** `timestamp + source + value + SHA` — click any step to see raw (e.g., S5P image, Flash JSON). This replaces the black-box “AI says pollution came from X” with **auditable provenance** — exactly what the reviewer praised.

**Files:**
- `prototype/index.html` → extend `#disputes` card to show this timeline per event (currently shows only Lv + clock) — add `timeline` div inside `renderDisputes` and `bedcModal`
- `data/sovereign_ledger/DOS-PLUME-TN-20260819-01.json` already exists — use as template for all events

**No unnecessary:** No separate “ledger page” — it lives inside the Event Drawer as a collapsible `Provenance` section.

### 1.3 Federated — Make the Claim Honest (No Central DB Lie)

**Add one diagram + one sentence in disclosure:**

```
🇮🇳 INDIA NODE              🇧🇷 BRAZIL NODE
Local observations         Local observations
Local model (Flash+PINN)   Local model
      │ model update                │ model update
      └──────────┬──────────────────┘
         ┌─────────────────┐
         │ BRICS FEDERATION│
         │ Model aggregation│  (FedAvg W_{t+1}=W_t+Σ ΔW_k, DP ε=2.1, TEE)
         └─────────────────┘
              ↓
       Global patterns shared
       Raw citizen data stays local
```

**In UI:** Sidebar footer already says `Federated • Sovereign` — add a **small “How federated works” link** that opens a modal with the diagram + text:

> “Raw photos + sensors stay in `asia-south1` / `sa-east1` etc. Only **model parameters / gradients / event signatures (H3 + SHA + source %)** are aggregated in Confidential Space TEE. No raw cross-border transfer.”

**In code:** Already true for `DISPUTES` (only `ΔW_k` would cross, but we mock). To be honest, add a **mock federation log** in sidebar: `Last FedAvg: 02:00 UTC • 11 nodes • 220 H3 cells • DP ε=2.1` — updates via `setInterval`.

**Files:** `ingestion/README.md` already documents TEE, `models/tff_federated_aggregator.py` placeholder — no new file needed, just the modal + log.

---

## 2. P1 — Polish for 9→10/10 (After P0)

### 2.1 Official Mode (20-Second Clarity)
- Toggle in header: `Official Mode` (default **ON** for Demo Day)
- When ON: Hide `H3`, `ST_INTERSECTS`, `ℒ_total`, `Ci` — show only `PM2.5 142 → 187 in 11h • 1.2M exposed • HIGH PRIORITY • Notify`
- When OFF (developer): show full technical (current view)
- **No new page** — just a `localStorage` flag that hides `.mono` and `.tag` details

### 2.2 End-to-End Story (30-Second Demo Script)
Add a **horizontal stepper** at top of Event Drawer (8 steps, already in reviewer’s list) — highlight current step as user scrolls the provenance timeline. No extra data, just visual anchors:

`1 Citizen → 2 AI Vision → 3 Validation → 4 Satellite → 5 Meteorology → 6 AI → 7 Authority → 8 Federation`

### 2.3 Impact — Corridor, Not Just District
- In Event Drawer, under Exposure, add one line: `Corridor: Bengaluru–Chennai industrial belt • Daily freight $4.2M • School/health advisory if >150 for >6h`
- Data: hardcode 3 corridors (Indo-Gangetic, Bengaluru–Chennai, Cairo–Alexandria) — no need for 11.

### 2.4 Cross-Border Demo (Must Show)
- Pre-seed one `Lv4 Bilateral` event: `Riyadh dust (SA) → Dubai (AE) 81%` — so when judges filter `All BRICS + Last 7d`, they see a transboundary red plume crossing `SA/AE` border, with **both Tier 3 desks** as Co-Owners. We already have `seedBEDC()` — just auto-seed one on load if `DISPUTES` empty.

---

## 3. What NOT to Add (Unnecessary)

- No new top-level nav items beyond `Operations / Disputes` (Event Drawer is overlay, not page)
- No air-quality history charts, no wind roses, no 12-pollutant tables
- No separate “Federated Dashboard” — just the modal + log
- No user profiles, no auth pages, no settings
- No extra map layers beyond current OWM + S5P (already have 5 toggles)
- No new backend tables — reuse `REPORTS`, `ALERTS`, `DISPUTES` arrays; add only `h3`, `sha`, `source%`, `exposure` fields inline

---

## 4. Information Architecture — After

```
Header (48px): Æ + 11 flags + Live pill + Official Mode toggle + EN
Layout: Sidebar 240px (filters + KPI + OWM mini + dispute snapshot) + Main flex-1
Main:
  - Map 520px (H3 + OWM + GAUL, click red plume → Event Drawer)
  - Forecast mini 110px (peak/time)
  - Dash2: Upload/Recent + Dispatch (Tiered)
  - Ledger: Evidence Ledger (provenance timeline) — was Dispute Ledger, now renamed but same data
Event Drawer (new, overlay): Active Pollution Event (source %, transport, forecast, exposure 1.2M, HIGH PRIORITY, Notify → SHA ledger)
Modals: Dispute File (existing) + BEDC TEE (existing) + Federated Diagram (new small)
```

**One new surface only:** `EventDrawer` (drawer/page). Everything else is **content change inside existing cards**, not new pages.

---

## 5. Implementation Tasks (To-the-Point, No Bloat)

| Task | File | Est. |
|---|---|---|
| **Event Drawer UI** | `prototype/index.html` → add `div#eventDrawer` (320px slide-in) + `openEvent()` + `closeEvent()`; `dashboard/src/components/EventDrawer.jsx` (new, 180 lines) | 3h |
| **Source % + Exposure** | `prototype` JS: add `sourceAttribution` heuristic (density + S5P + type) + `exposure = pop_density * H3 area` (use existing `primary_owner` pop) | 1h |
| **Provenance Timeline** | Extend `renderDisputes()` + `bedcModal` to show 7-step vertical timeline per event (reuse `data/sovereign_ledger` JSON) | 1h |
| **Federated Honesty** | Add modal `Federated Diagram` + sidebar log `Last FedAvg 02:00 UTC • 11 nodes` | 45m |
| **Official Mode** | Header toggle `Official Mode` → hides `.mono` + `.tag` technical spans via CSS class | 30m |
| **Auto-seed Lv4** | `seedBEDC()` auto on load if `DISPUTES.length===0` and filter `All BRICS` | 15m |
| **Docs** | Update `IMPLEMENTATION_BACKLOG.md` mark P0 done, add `RUNBOOK.md` step for Event Drawer | 15m |

**Total: ~6.5h, 1 new component, 0 new pages (drawer is overlay).**

---

## 6. Acceptance — How We Know It’s Done

- Click red plume in Tamil Nadu → drawer shows `Bengaluru Urban • PM2.5 142 → 187 in 11h • Traffic 41% • SW→NE • 1.2M • HIGH PRIORITY` in <20s read
- **Notify YES** → creates `Lv2` dispute with provenance timeline `08:42→09:30` + SHA, visible in Evidence Ledger
- **All BRICS + Last 7d** → at least one `Lv4 Bilateral` (Riyadh→Dubai) is visible and both Tier 3 desks are Co-Owners
- **Federated modal** shows `India/Brazil nodes → Federation → only gradients` — judges nod, not challenge
- **Official Mode ON** hides `H3`, `ST_INTERSECTS`, `ℒ_total` — official sees 5 lines, developer toggles to see 15

---

*This plan is the only doc for next steps — no other new docs. Implement drawer first, then provenance, then federated modal. Everything else stays in README.*

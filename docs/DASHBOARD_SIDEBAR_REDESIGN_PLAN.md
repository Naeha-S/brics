# BRICS-AETHER — Dashboard Redesign Plan: Proper Sidebar, Professional, To-the-Point
**For:** `prototype/index.html` — 11 Countries × 20 States (220 Jurisdictions) • 420 Validations • Live OWM + PINN
**Goal:** Make it a **proper dashboard** — sidebar for neatness, professional, minimal. No explanatory bloat.
**Principle:** *If it doesn't help an operator dispatch in <5 min, it belongs in README, not in code.*

---

## 1. Problem With Current (Why You Feel Congested)

| Current | Issue | Fix in Plan |
|---|---|---|
| Filters as top card + stats + meta bar + legend + map-bar | 4 horizontal bands before you see the map — pushes map below fold, feels heavy | Move **all filters + live meta** into **left sidebar** (stacked vertically), map starts at top of main |
| Stats as 4 cards across top | Useful but competes with map; repeats meta bar | Merge into **sidebar KPI strip** (4 compact rows, mono) + keep only `Validations / Plumes` in main header |
| Right stack has 3 cards (upload + OWM + dispatch + disputes) | Right column scrolls long, map + chart feel cramped | **Sidebar holds filters + OWM mini + dispute count**; **main holds only Map + Forecast mini + Upload/Recent + Dispatch/Disputes** in a clean 2-column split that never scrolls past viewport |
| Header nav has 5+ buttons + flags + pill | Noisy, not needed for dashboard-only | Sidebar nav = single source of truth for nav; header becomes **slim 48px** with only `Æ BRICS-AETHER • Live` + language |
| No clear IA | User scans top → stats → map → stack → chart | **Sidebar (240px) = control**, **Main (flex-1) = operate** — eye goes left→right once, then stays on map |

**Result now:** 3 scrolls to see disputes. **After:** Everything visible in **one viewport (100vh, no page scroll on desktop)** — map is king.

---

## 2. Information Architecture — To the Point

### Sidebar (240px, fixed left, `var(--card)` + `1px border-right`)
**Purpose: Control & Context — never operate**
```
[ 240px SIDEBAR — scrolls internally if needed, sticky ]
┌─────────────────────────────────┐
│ Æ BRICS-AETHER                  │  ← Mark + 11 flags row (16px, muted)
│ Dashboard • Sovereign           │     + Live pill
├─────────────────────────────────┤
│ NAV (2 items only)              │  ← Operations (map) / Disputes (ledger)
│ ● Operations — Map, Upload, OWM │     Active = bg var(--fg) color #fff
│ ○ Disputes — Ledger, BEDC       │     No other nav — to the point
├─────────────────────────────────┤
│ FILTERS (stacked, 1 column)     │  ← Country * / State * / District / Time range
│ [ India (IN)        ▼ ]         │     + Custom dates (shows only if Time=Custom)
│ [ Tamil Nadu        ▼ ]         │     + Reset / Export CSV (row)
│ [ All districts     ▼ ]         │     All selects 100% width, 32px height
│ [ Live — last 3h    ▼ ]         │
│ [ Reset ] [Export CSV]          │
├─────────────────────────────────┤
│ LIVE META (1 line)              │  ← Showing 18 • 5 plumes • Tamil Nadu • Live
│ Showing 18 validations • ...    │     Mono 10px, truncated
├─────────────────────────────────┤
│ KPI STRIP (4 rows, not cards)   │  ← Validations 18 (12 verified)
│ Validations  18                 │     Plumes 5 • H3 0.74km²
│ Plumes        5                 │     72h ≥85% • Median 4.2min
│ 72h acc    ≥85%                 │     No big cards — 1px dividers, 10px mono labels
│ Dispatch  4.2 min                │
├─────────────────────────────────┤
│ OWM MINI (compact, 1 card)      │  ← Icon + 24°C light rain + Wind 4.1 m/s
│ ⛅ 24°C  light rain            │     PM2.5 18.2 • AQI 2 Fair • Chennai
│ Wind 4.1 m/s • 79% • 1009 hPa  │     Updates on filter — same fetchOWM
│ PM2.5 18.2 • AQI 2 Fair         │     No separate page — 80px tall max
├─────────────────────────────────┤
│ DISPUTE SNAPSHOT (if >0)        │  ← Lv3 Inter-State • OVERDUE 2h • Primary Chennai
│ 2 active • 1 Lv5 BEDC          │     Click → scrolls main to Disputes card
│ [ View Ledger → ]               │
└─────────────────────────────────┘
```
- **Collapsed on <980px:** Sidebar becomes **bottom sheet** or **off-canvas drawer** (hamburger) — no horizontal scroll
- **No explanatory text:** No “How it works”, no pipeline, no matrices — those are in README/PRD

### Main (flex-1, `var(--bg)`, no extra chrome)
```
[  MAIN — 12px gap, 14px padding, max 1 viewport tall, internal scroll only where needed ]
┌──────────────────────────────────────────────────────────────┐
│ Map Card (55% height)                                       │  ← Header: H3 Res 8 • GAUL L2 + Tabs All/Citizen/S5P/Wind
│ #map 520px (desktop) / 400px (mobile) • Legend bottom-left │     + Top-right OWM layer control (☁️🌧️💨🌡️)
│ Bottom bar: corridor chips (scrollable, 10) + OWM badge    │     Chips: Tamil Nadu (active) … Jakarta — scroll, no wrap
├──────────────────────────────────────────────────────────────┤
│ Forecast Mini (110px, not huge)                             │  ← 72h PINN — Tamil Nadu • 142 in 36h • Chart 110px
│ [ PINN line + CAMS dashed ]  OWM PM2.5 18.2 cross-check    │
├──────────────────────────────────────────────────────────────┤
│ Two-column below map (only if Operations nav active)         │
│ ┌─────────────────────┐ ┌─────────────────────────────┐     │
│ │ Upload + Recent (8) │ │ Tiered Dispatch (6) +       │     │
│ │ Drop hazard photo   │ │ Dispute Ledger (8)          │     │
│ │ Flash Ci≥0.70 •     │ │ Lv badges + Primary/CC +    │     │
│ │ Recent validations  │ │ SHA… + Escalate/Resolve     │     │
│ └─────────────────────┘ └─────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```
- **Disputes nav active:** Main shows **only** Dispute Ledger full-width + BEDC view — map stays but shrinks to 300px
- **No page scroll on desktop:** Map + below panels fit `100vh - header(48px) - 12px gaps` — sidebar scrolls internally if tall

---

## 3. What We Remove (Unnecessary → README)

- ❌ Inverted stats section (now sidebar KPI rows)
- ❌ “Why cities miss…” 3 failure cards
- ❌ Ingestion pipeline diagram (5 sources → hub)
- ❌ AI 3-step timeline with equations (keep `PINN back-trace` button only)
- ❌ Sovereign / Routing matrices (tables) — keep 1-line `ST_INTERSECTS` note under map
- ❌ CTA inverted section
- ❌ Duplicate meta bars

**Kept in code (to the point):** Map + filters + forecast mini + upload/recent + dispatch/disputes + OWM mini (all filtered, all live). **Everything else is one click away in README.**

---

## 4. Visual Spec — Minimalist Modern, Tight

| Token | Value | Where |
|---|---|---|
| Sidebar | `240px` fixed, `border-right 1px var(--border)`, `bg var(--card)`, `padding 14px` | Filters stack `gap 10px`, KPI `gap 8px`, OWM `80px` |
| Main | `padding 14px`, `gap 12px`, `bg var(--bg)` | Map card `radius 14px`, `shadow var(--shadow)`, `border 1px var(--border)` |
| Header | `48px`, `bg rgba(250,250,250,.92)`, `backdrop-blur` | Mark `32px` + flags `16px`, nav hidden (sidebar nav is truth) |
| Typography | Sidebar labels `JetBrains Mono 10px .08em UPPERCASE`, values `Inter 13px 500` | Map title `11px 700 .07em UPPERCASE` |
| Flags | Sidebar top row 11 flags `16px` + gap `3px`, muted | Not in header — header has only `Æ + Live` |
| Paddings | Sidebar `14px`, cards `12px`, map `11px 14px`, chart `10px` | No `py-28` — dashboard is dense *where needed*, airy *where not* |
| Scroll | `html overflow-x:hidden`, `body 100vh`, `main overflow:auto` (desktop) | Mobile: sidebar drawer, main single column, no horizontal scroll |

---

## 5. Responsive — Neat at Every Width

- **≥980px:** Sidebar `240px` fixed left + Main `flex-1` (your current `1.55fr/.9fr` becomes `Main 2-col` inside)
- **768–979px:** Sidebar collapses to **56px icon rail** (Æ + filter icon + dispute badge) — click expands drawer over map
- **<768px:** Sidebar hidden, **hamburger** top-left opens full-screen drawer; map `400px`, forecast `110px`, stack single column, chips scroll

---

## 6. Implementation Steps (1 Day, No Bloat)

1. **Layout shell (2h):** Wrap current `page` in `display:flex; height: calc(100vh - 48px)` → `aside.sidebar 240px` + `main.content flex-1 overflow:auto` — move existing `.filters`, `.stats`, `#owmCard` (mini), dispute snapshot into sidebar; keep `.dash` (map + chart + upload/dispatch) in main. Keep all IDs — no JS break.
2. **Header slim (30m):** Remove nav from header, keep only mark + `Live` pill + language; sidebar becomes nav truth (`Operations` / `Disputes` scroll main)
3. **KPI + OWM compact (1h):** Convert 4 stat cards → 4 row KPI strip in sidebar (`grid 1fr`, dividers), OWM 2×2 grid → sidebar mini (icon+temp left, AQI right, 4 pills below)
4. **Map+Chart keep (30m):** No logic change — just move inside main, keep `updateDashboard()` wiring (it already drives map/chart/recent/alerts/disputes from filters)
5. **QA (1h):** Test `IN → Tamil Nadu → Chennai + Live` (should still show ~15 markers, wind overlay toggles, dispute file → ledger), `All BRICS + Last 7d` (220 jurisdictions, 420 reports, no empty unless truly empty), `node --check` 0, no horizontal scroll at 320/768/1240.

**No new dependencies, no new datasets, no pipeline changes** — purely layout + move existing nodes.

---

## 7. What Success Looks Like

- **First paint:** Eye hits **map at top of main** within 400px of top — not after 3 bands
- **One-hand operate:** Left hand on filters (sidebar), right hand on map/disputes (main) — no scrolling to find controls
- **Professional:** White sidebar, light main, `1px #E2E8F0` everywhere, `Electric Blue #0052FF` only for primary, `Calistoga 22px` title only once
- **To the point:** If a diplomat opens it, they see **map + Tamil Nadu Live + 1 dispute** and can dispatch in 30s

---

## 8. Next Step

If this plan feels right, I’ll **implement it next push** — same `prototype/index.html`, same 11×20 datasets, same OWM tiles + disputes + PINN, just **re-parented into sidebar shell**. No new concepts, no unnecessary sections.

**Approve?** Reply “Implement sidebar” and I’ll ship the refactored dashboard (still dashboard-only, still minimal, but proper with sidebar).

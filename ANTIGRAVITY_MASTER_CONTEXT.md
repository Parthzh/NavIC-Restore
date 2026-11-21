# NAVIC RESTORE — Master Project & AI-Agent Operating Context

> **HOW TO USE THIS FILE (FOR ALL 4 TEAMMATES):**
> Place this file in the root of `https://github.com/Parthzh/NavIC-Restore` (and attach/pin it in every teammate's Antigravity IDE chat at the start of every session). It is the single source of truth for **Team Hypervisors** during the **ASTRA 2026 Overnight Hackathon**.

---

## 1. CRITICAL AI-AGENT RULES (READ & OBEY BEFORE DOING ANYTHING)

1. **NON-CODING TEAM — FULL AI OWNERSHIP:**
   - All 4 team members are **non-coders** focused purely on creativity, product ideation, UX feedback, and pitch storytelling.
   - **You (the AI agent) must handle 100% of coding, debugging, dependency installation, server running, testing, and Git commands.**
   - Never ask a teammate to manually edit a code file or debug a traceback. Explain what you did and what they should check visually in simple, friendly, plain English (or Hinglish if they speak in Hinglish).

2. **MANDATORY PRE-WORK REPO SYNC (NEVER CODE BLIND):**
   - Because **4 teammates' IDEs are working concurrently on ONE GitHub repository** (`https://github.com/Parthzh/NavIC-Restore`), you MUST run these steps **before** writing or modifying any file:
     1. Run `git fetch origin && git status && git pull --rebase origin main`.
     2. Read `SYNC_STATUS.md` (at repo root) and inspect the latest `git log -n 5 --stat` plus any files touched by other teammates.
     3. Verify that your planned change matches the existing folder structure and API contracts in `shared/contracts.json` so **nothing breaks** for other members.

3. **MANDATORY SAFE PUSH & ORGANIC COMMIT PROMPT (NEVER AUTO-PUSH SILENTLY):**
   - Before every `git push`:
     1. Verify the app/module still runs cleanly (Python syntax/import check or `npm run build` / endpoint smoke test).
     2. Update `SYNC_STATUS.md` with a concise 2-line log: `[Timestamp] | [Lane/Feature] | [Files changed & new endpoints/props]`.
     3. Run `git pull --rebase origin main` to safely integrate any teammate's latest push and resolve any conflicts cleanly.
     4. **STOP and prompt the user for an organic commit message:** Show them a 1-sentence plain-English summary of what was just built, suggest **2–3 natural, human-written commit message options** (e.g., `"Added dry-ridge filter so drone beacon never spawns in flooded water"`), and ask them to pick one or type their own comment.
     5. Commit with the user's chosen organic message and push to `origin main`.

4. **4-PERSON NON-OVERLAPPING OWNERSHIP LANES (PREVENT MERGE CONFLICTS):**
   When a teammate starts a session, ask which lane they are working on and keep edits strictly inside their lane (coordinate via `shared/contracts.json` if an API shape changes):
   - **Lane 1 — Flood Data & Terrain (`data/`, `backend/flood/`):** EOS-04 SAR flood polygons, water-depth grids, Bhuvan Cartosat-1 DEM terrain elevation grids, candidate dry-ridge masks, and pre-cached demo scenarios.
   - **Lane 2 — NavIC Orbits & Math Engine (`backend/navic/`):** CelesTrak IRNSS/NVS TLE fetching + offline fallback TLEs, Skyfield ECEF propagation, $G$-matrix, $G_{\text{aug}}$ (Pseudolite), $G_{\text{alt}}$ (Barometer/DEM), terrain horizon masking, GDOP/PDOP/HDOP/VDOP calculation, and flood-aware dry-ridge beacon optimizer.
   - **Lane 3 — FastAPI Backend & Benchmarks (`backend/api/`, `shared/`):** FastAPI REST endpoints, CORS, `shared/contracts.json`, 24-hour error timeseries generator, and validation/benchmark logging.
   - **Lane 4 — Interactive Web UI & Demo Polish (`frontend/`):** React + Vite + Leaflet interactive map, flood-depth/dry-ground/GDOP heatmap layers, satellite kill-switches, draggable tethered-drone beacon, Mode 01/02/03 toggle, 24-hr error chart, modeled-uncertainty callout, and one-click demo presets.

---

## 2. PROJECT IDENTITY & HACKATHON GOALS

- **Project Name:** **NavIC Restore**
- **Team Name:** **Team Hypervisors** (4 members, VIT Bhopal University)
- **Event:** **ASTRA 2026 Ideathon & Overnight Hackathon** (AnteriX Club, VIT Bhopal)
- **GitHub Repository:** `https://github.com/Parthzh/NavIC-Restore`
- **Combined Domains (Submitted in Final PPT):**
  - **Domain 03 — Space-Based Disaster Management:** Satellite observations and geospatial data for flood preparedness, monitoring, and response.
  - **Domain 04 — Satellite Communication, Navigation & Connectivity:** Positioning and emergency coordination where conventional mobile networks are unavailable.
- **Evaluation Priority (Bonus Points):** Projects meaningfully using **Indian satellite missions** and **official Indian Space Data Portals**:
  - **Bhoonidhi** (`https://bhoonidhi.nrsc.gov.in/`) — EOS-04 (RISAT-1A) C-band SAR imagery.
  - **Bhuvan** (`https://bhuvan.nrsc.gov.in/`) — Cartosat-1 Digital Elevation Model (DEM) & road/village base layers.
  - **NavIC / IRNSS** (live orbits via `https://celestrak.org/` `IRNSS`/`NVS` TLEs) — India's indigenous regional navigation constellation.
- **Target Audience:** State Disaster Management Authorities (SDMAs), NDRF rescue coordinators, and emergency mapping task forces.

---

## 3. THE UNIFIED PROBLEM & SOLUTION ARCHITECTURE

### The Dual Real-World Failure
During severe Indian monsoon floods or Himalayan cloudbursts, rescue teams face two simultaneous space-tech failures:
1. **Earth Observation Gap:** Monsoon clouds blind optical satellites, and flat 2D flood maps do not tell NDRF teams water depth (ambulance-passable `<0.3 m` vs. boat-only `>0.5 m`) or where safe dry ridges exist.
2. **Navigation Gap:** A 3D position fix $(x, y, z)$ plus receiver clock bias ($\delta t_u$) requires **at least 4 visible satellites**. Because NavIC has experienced degraded 3–4 active satellite states and steep Himalayan valleys block low-elevation signals, rescue boats and drones suffer **high GDOP (>10), multipath errors (>15 m), or complete loss of fix (No Fix)**.

### The Killer Differentiator ("Flood-Aware Navigation")
We **feed SAR flood layers directly into the positioning geometry solver**:
- You cannot deploy a ground pseudolite beacon inside 2 meters of floodwater.
- Our **EOS-04 SAR + Bhuvan DEM** flood layer acts as a **physical no-go mask**, excluding submerged pixels so the **NavIC-Restore optimizer** searches *only* **SAR-verified dry ridges** to deploy **1 tethered-drone pseudolite**, flipping the flooded rescue corridor from **Red (No Fix / >15 m)** to **Green (Target Sub-5 m)**.

### The 3 Operating Modes (Must All Work Live in the Demo)
1. **Mode 01 · Baseline (Degraded Satellites):** 3–4 active NavIC satellites + valley terrain shadow → high DOP, multipath, or total No Fix (`>15 m` uncertainty).
2. **Mode 02 · Proposed Augmentation (Tethered Pseudolite):** A tethered drone beacon anchored on **SAR-verified dry ground** (configurable height: `10 m` tower to `150 m` tethered drone) transmits a local ranging signal → adds 4th row to geometry matrix → modeled **sub-5 m fix** (subject to terrain Line-of-Sight & hardware timing sync).
3. **Mode 03 · Failsafe (Barometer/DEM Fallback):** Where terrain blocks the beacon's Line-of-Sight, local barometric pressure + Bhuvan DEM surface elevation clamps the receiver's vertical altitude → removes vertical DOP ambiguity so 3 satellites still yield a usable fix.

### The 4-Step Pipeline (Matches Submitted PPT Slide 4)
1. **01 · Ingest SAR:** Combine Bhoonidhi EOS-04 C-band SAR + Bhuvan DEM (pre-cached for the overnight sprint) to output flood extent, estimated water depth, passable vs. submerged channels, and candidate dry ridges.
2. **02 · Model NavIC:** Propagate live NavIC (`IRNSS`/`NVS`) orbital ephemeris via `skyfield`, compute topographic signal shadow from DEM, and calculate GDOP/PDOP/HDOP/VDOP across the flooded grid.
3. **03 · Optimize Beacon:** Algorithmically select the single optimal dry-ground staging node $(x_p, y_p, z_p)$ for tethered-drone deployment, accounting for flood exclusion, terrain Line-of-Sight, and RF Near-Far bounds.
4. **04 · Synthesize Plan:** Display interactive map layers (flood depth, dry ridges, red-to-green navigation quality, candidate rescue channels, Mode 03 barometer fallback coverage) with explicit **modeled uncertainty** disclaimers.

---

## 4. EXACT MATHEMATICAL SPECIFICATION (FOR `backend/navic/`)

### 4.1 Pseudorange & Linearized Geometry Matrix ($G$)
For $N$ visible NavIC satellites at ECEF coordinates $(x_i, y_i, z_i)$ and initial user estimate $\mathbf{x}_0 = [x_0, y_0, z_0, b_0]^T$:
- Geometric range: $r_i = \sqrt{(x_i - x_0)^2 + (y_i - y_0)^2 + (z_i - z_0)^2}$
- Row $i$ of $G$ ($N \times 4$): $\left[ -\frac{x_i - x_0}{r_i},\ -\frac{y_i - y_0}{r_i},\ -\frac{z_i - z_0}{r_i},\ 1 \right]$
- **3-Satellite Breakdown:** When $N = 3$, $G^T G$ ($4 \times 4$) has rank $\le 3$ (singular / non-invertible → **No Fix**).

### 4.2 Mode 02: Tethered Pseudolite Row ($G_{\text{aug}}$)
For a beacon at dry-ridge ECEF $(x_p, y_p, z_p)$ with range $r_p = \|\mathbf{p} - \mathbf{x}_0\|_2$:
- Append row: $\left[ -\frac{x_p - x_0}{r_p},\ -\frac{y_p - y_0}{r_p},\ -\frac{z_p - z_0}{r_p},\ 1 \right]$
- Restores full rank $4 \times 4$ (when non-coplanar with the 3 satellites).

### 4.3 Mode 03: Barometer / DEM Altitude Constraint ($G_{\text{alt}}$)
For known altitude $h_{\text{known}}$ (barometer/DEM) with $r_0 = \sqrt{x_0^2 + y_0^2 + z_0^2}$:
- Append clock-independent row (4th column = `0`): $\left[ \frac{x_0}{r_0},\ \frac{y_0}{r_0},\ \frac{z_0}{r_0},\ 0 \right]$

### 4.4 ENU Rotation, DOP Metrics & Expected Error
Rotate spatial columns of $G$ into local East-North-Up (ENU) via $R_{\text{ENU}}$:
- $G_{\text{ENU}} = G \begin{bmatrix} R_{\text{ENU}}^T & \mathbf{0} \\ \mathbf{0}^T & 1 \end{bmatrix}$, and cofactor matrix $Q = (G_{\text{ENU}}^T G_{\text{ENU}})^{-1}$.
- $\text{GDOP} = \sqrt{q_{EE} + q_{NN} + q_{UU} + q_{tt}}$, $\text{PDOP} = \sqrt{q_{EE} + q_{NN} + q_{UU}}$, $\text{HDOP} = \sqrt{q_{EE} + q_{NN}}$, $\text{VDOP} = \sqrt{q_{UU}}$, $\text{TDOP} = \sqrt{q_{tt}}$.
- Expected 3D error: $\sigma_{\text{pos}} = \text{PDOP} \times \sigma_{\text{UERE}}$ (use $\sigma_{\text{UERE}} = 3.0\text{ m}$ default, slider `2–5 m`).
- Handle singular matrices cleanly (`np.linalg.cond(GtG) > 1e8` → return `status: "NO_FIX"`, `gdop: null`, `error_m: null`).

### 4.5 Flood-Aware Beacon Placement Objective
Over $M$ flooded rescue grid points $\{\mathbf{u}_1, \dots, \mathbf{u}_M\}$, choose optimal beacon $\mathbf{p}^*$:
$$\mathbf{p}^* = \arg\min_{\mathbf{p} \in \Omega_{\text{Dry}} \cap \Omega_{\text{LoS}}} \left( \frac{1}{M} \sum_{k=1}^{M} \text{GDOP}(\mathbf{u}_k, \mathbf{p}) \right) \quad \text{s.t.} \quad r_{\min} \le \|\mathbf{u}_k - \mathbf{p}\|_2 \le r_{\max}$$
- **Critical constraint:** $\Omega_{\text{Dry}}$ strictly excludes all pixels where `flood_depth_m > 0.05`.
- Default RF Near-Far bounds: $r_{\min} = 200\text{ m}$, $r_{\max} = 15,000\text{ m}$.

---

## 5. OFFICIAL RESEARCH BENCHMARKS & HONESTY DISCLAIMERS

Our prototype improves on these verified papers (keep citations in UI "About / Science" drawer):
1. **Sai Bhageerath et al. (NRSC/ISRO, Oct 2025, *JWCC*):** EOS-04 SAR flood mapping (`98.8%` acc, `95.7%` recall, `85 s`). *Our twist:* Uses flood mask + uncertainty as a live spatial constraint for dry staging ridges.
2. **Chimata et al. (NRSC/ISRO, Jul 2025, *NHESS*):** EOS-04 SAR + HAND (`<15 m`) + Trend Surface Analysis flood depth (`0.805 m` RMSE vs. `5.23 m` FwDET). *Our twist:* Open-source Python pipeline + ambulance (`<0.3 m`) vs. boat (`>0.5 m`) channel classification.
3. **IRNSS Pseudolite Augmentation (*J. Navigation*, 2010) & ISRO Lunar S-Band Pseudolite (2026):** Proved pseudolites lower GDOP. *Our twist:* Live degraded 3–4 satellite CelesTrak states + automated flood- & terrain-aware optimizer in an interactive web app.
4. **DRDO Standalone NavIC Eval (2025) & MDPI Barometer GNSS (2022):** Measured NavIC gaps & barometer aiding. *Our twist:* Unified live comparator across Mode 01 / Mode 02 / Mode 03.

**Required Engineering Honesty Disclaimers (Match Submitted PPT):**
- Display subtle badge/note in UI: *"Simulated architecture for prototype evaluation. Modeled routes are computational estimates and do not substitute for on-ground hydrological verification; physical pseudolite deployment requires timing sync & RF licensing."*

---

## 6. RECOMMENDED REPOSITORY STRUCTURE & TECH STACK

```text
NavIC-Restore/
├── ANTIGRAVITY_MASTER_CONTEXT.md   # This file (always read first)
├── SYNC_STATUS.md                  # Live coordination log updated on every push
├── shared/
│   └── contracts.json              # Shared API request/response schemas
├── data/
│   ├── scenarios/
│   │   ├── chamoli_uttarakhand.json   # Flagship Scenario 1: Steep Himalayan flash-flood valley
│   │   └── godavari_floodplain.json   # Scenario 2: Wide river floodplain + ambulance/boat routes
│   └── fallback_navic_tle.txt      # Cached IRNSS/NVS TLEs if Wi-Fi fails during judging
├── backend/
│   ├── requirements.txt            # fastapi, uvicorn, numpy, scipy, skyfield, requests
│   ├── flood/                      # Lane 1: EOS-04 SAR / Bhuvan DEM processing & scenario builder
│   ├── navic/                      # Lane 2: Orbit propagation, terrain mask, DOP solver, optimizer
│   └── api/
│       └── main.py                 # Lane 3: FastAPI app + CORS + endpoints
└── frontend/                       # Lane 4: React + Vite + Leaflet + Recharts
    ├── package.json
    └── src/
```

### Core FastAPI Endpoints (`backend/api/main.py`)
- `GET /api/scenarios` — Lists pre-cached Indian flood scenarios (metadata, bounding box, flood depth GeoJSON, dry-ridge candidates, rescue channels).
- `GET /api/satellites?timestamp=...` — Returns live (or cached-fallback) NavIC (`IRNSS`/`NVS`) satellite list with azimuth, elevation, and default active status.
- `POST /api/dop-grid` — Inputs: `scenario_id`, `active_satellites[]`, `mode` (`baseline` | `pseudolite` | `barometer`), `beacon` (`lat`, `lon`, `height_m`), `uere_m`. Returns: grid of `(lat, lon, visible_sats, gdop, pdop, hdop, vdop, error_m, status, is_flooded)`.
- `POST /api/optimize-beacon` — Runs the flood-aware dry-ridge optimizer (`Omega_Dry` ∩ `Omega_LoS`) and returns optimal `(lat, lon, elevation_m, height_m)` + before/after average GDOP & error reduction.
- `POST /api/timeseries-24h` — Returns 24-hour hourly error curve (meters) comparing Mode 01 vs. Mode 02 vs. Mode 03 at a selected rescue point.

---

## 7. OVERNIGHT HACKATHON SPRINT PLAN (12-HOUR BUILD + DEMO SAFETY)

1. **Hours 0–2 (Foundation & Cache — First Push!):**
   - Scaffold the exact folder tree above + `SYNC_STATUS.md` + `shared/contracts.json`.
   - Build 2 realistic, pre-cached Indian flood scenario JSONs (`chamoli_uttarakhand.json` and `godavari_floodplain.json`) grounded in real Indian coordinates, Bhuvan elevation profiles, flood-depth polygons, and dry ridges, plus `fallback_navic_tle.txt`.
2. **Hours 2–6 (Core Engines + Interactive Map):**
   - Implement `backend/navic/` (`skyfield` orbits, $G / G_{\text{aug}} / G_{\text{alt}}$, terrain elevation mask, dry-ridge optimizer).
   - Wire FastAPI endpoints and build the React + Leaflet map showing: Flood Depth layer, Dry Ridges layer, Red/Yellow/Green GDOP heatmap, and Satellite On/Off toggles.
3. **Hours 6–10 (Interactive "Wow" Features):**
   - Add one-click **"Auto-Optimize Beacon on Dry Ground"** button + draggable tethered-drone marker with height slider (`10 m–150 m`).
   - Add **Mode 01 / Mode 02 / Mode 03** live comparison panel + **24-Hour Positioning Error Chart** (`Recharts`) + **Modeled Uncertainty** toggle.
4. **Hours 10–12 (Bulletproof Demo & Deployment):**
   - Add a single-command startup script (`start_demo.sh` / `start_demo.bat`) so the demo runs 100% locally with zero internet dependency if venue Wi-Fi drops, plus optional cloud deploy (Render for FastAPI + Vercel for React).
   - Test every button, kill-switch, and scenario end-to-end so the 3-minute live demo flips the map from **Red (No Fix)** to **Green (Sub-5 m)** smoothly on the first click.

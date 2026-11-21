# NAVIC-RESTORE — COMPREHENSIVE FRONTEND OVERHAUL MASTER CONTEXT

> **HOW TO USE THIS PROMPT:**
> Feed this entire document to an advanced AI model (Claude 3.7 Sonnet / Opus, GPT-4.5 / o3, Gemini Pro) as its primary system prompt. It contains 100% of the project context, mathematical formulas, data schemas, backend endpoints, and visual design requirements needed to completely rebuild the frontend into a world-class, photorealistic 3D GIS Mission Control application.

---

## 1. PROJECT IDENTITY & MISSION

- **Project Name:** **NavIC Restore**
- **Team:** **Team Hypervisors** (VIT Bhopal University)
- **Event:** **ASTRA 2026 Overnight Hackathon** (AnteriX Club, Space & Defense Track)
- **Core Pitch:** *Space-Based Disaster Navigation: Augmenting Degraded NavIC Satellite Geometry via Flood-Aware Tethered-Drone Pseudolites on SAR-Verified Dry Ridges.*
- **Combined Hackathon Domains:**
  - **Domain 03 — Space-Based Disaster Management:** Integrating ISRO **EOS-04 C-band SAR** radar flood observations and **Bhuvan Cartosat-1 DEM** terrain elevation models.
  - **Domain 04 — Satellite Communication, Navigation & Connectivity:** NavIC (**IRNSS/NVS**) satellite orbital tracking, solving dilution of precision (DOP) breakdowns in mountain canyons and floodplains.

---

## 2. THE SCIENTIFIC & TECHNICAL CORE

### The Real-World Disaster Problem
During catastrophic floods in India (e.g., Himalayan cloudbursts in Chamoli or Godavari river basin floods):
1. **Terrestrial infrastructure (cell towers, power) drowns and dies.**
2. Emergency responders (NDRF rescue boats, ambulances, surveillance drones) rely completely on satellite positioning (NavIC / GPS).
3. In deep mountain canyons or dense cloud/rain attenuation, steep terrain creates a **25°–35° horizon mask**, hiding low-elevation satellites.
4. When visible satellites drop to **3 satellites**, the 3D positioning geometry matrix $G$ becomes **rank-deficient (singular / non-invertible)**. Receivers suffer from **"NO FIX" or positional error spikes $>15–50\text{ m}$**. In pitch darkness or flooded terrain, steering a rescue boat with a 30m error is fatal.

### Our Solution ("Flood-Aware Augmentation")
1. **You cannot deploy ground signal towers inside 2 meters of rushing floodwater.**
2. Our pipeline ingests **ISRO EOS-04 SAR** flood imagery to establish a **physical no-go mask**, excluding all submerged coordinates.
3. It identifies **SAR-verified Dry Ridges** ($\Omega_{\text{Dry}}$ where `flood_depth_m == 0.00`).
4. Our algorithm selects the single optimal dry ridge to launch a **tethered drone pseudolite** (transmitting a local NavIC-compatible ranging signal at $10\text{ m} \text{--} 150\text{ m}$ altitude).
5. This adds a **4th row to the geometry matrix ($G_{\text{aug}}$)**, restoring full mathematical rank and flipping the positioning accuracy across the rescue corridor from **Red (NO FIX / >15m)** to **Green (Sub-5 meter target fix)**!

### The 3 Operating Modes (Must All Be Demonstrated Live)
- **Mode 01 · Baseline (Degraded Satellites):** 3 active NavIC satellites + valley terrain shadow $\to$ High GDOP / singular matrix $\to$ **NO FIX (Red Alert)**.
- **Mode 02 · Proposed Augmentation (Tethered Pseudolite):** 1 drone beacon anchored on dry ground $\to$ Appends $G_{\text{aug}}$ row $\to$ Restores rank 4 $\to$ **Sub-5m Fix (Vibrant Green)**.
- **Mode 03 · Failsafe (Barometer / DEM Altitude Clamping):** Where terrain blocks the drone's line-of-sight, receiver barometric pressure + Bhuvan DEM clamps altitude $\to$ Appends $G_{\text{alt}}$ row (clock-independent) $\to$ **Usable 2D Fix (Yellow/Amber)**.

---

## 3. CURRENT TECH STACK & ARCHITECTURE

The repository structure is structured as follows:

```text
NavIC-Restore/
├── backend/
│   ├── flood/                  # Lane 1: ISRO SAR flood data, DEM profiles, scenario loaders
│   ├── navic/                  # Lane 2: Skyfield satellite orbit propagator, DOP matrix solver, optimizer
│   └── api/
│       └── main.py             # Lane 3: FastAPI REST server (running on http://127.0.0.1:8000)
├── shared/
│   └── contracts.json          # Universal API JSON schemas
├── frontend/                   # Lane 4: React + Vite + Tailwind CSS (running on http://localhost:5173)
│   ├── package.json
│   ├── vite.config.js          # Proxies '/api' -> 'http://127.0.0.1:8000'
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── SatelliteBar.jsx
│       │   ├── MapComponent.jsx
│       │   ├── Terrain3DViewer.jsx
│       │   ├── MetricsDrawer.jsx
│       │   ├── TimeseriesChart.jsx
│       │   └── ScienceModal.jsx
│       ├── services/
│       │   ├── api.js
│       │   └── standaloneEngine.js  # In-browser client-side math fallback!
│       └── data/
│           ├── chamoli_uttarakhand.json
│           └── godavari_floodplain.json
```

---

## 4. BACKEND API CONTRACTS & REST ENDPOINTS

The FastAPI backend is operational on `http://127.0.0.1:8000`. Vite automatically proxies any request starting with `/api` to the backend.

### 1. `GET /api/scenarios`
Returns metadata list of scenarios:
```json
[
  {
    "id": "chamoli_uttarakhand",
    "name": "Chamoli Flash Flood (Rishi Ganga Gorge)",
    "terrain_type": "mountain_canyon",
    "center": { "lat": 30.535, "lon": 79.565 },
    "grid_resolution_m": 250,
    "satellite_sources": ["ISRO EOS-04 SAR", "Bhuvan Cartosat-1 DEM"]
  },
  {
    "id": "godavari_floodplain",
    "name": "Godavari River Floodplain (Bhadrachalam Basin)",
    "terrain_type": "river_floodplain",
    "center": { "lat": 17.67, "lon": 80.89 },
    "grid_resolution_m": 400,
    "satellite_sources": ["ISRO EOS-04 SAR", "Chimata et al. 2025 Hand Model"]
  }
]
```

### 2. `GET /api/scenarios/{id}`
Returns scenario details with full grid, dry ridges, and rescue channels:
- `grid`: Array of cells:
  ```json
  {
    "lat": 30.535,
    "lon": 79.565,
    "elevation_m": 1850.5,
    "flood_depth_m": 2.4,
    "is_flooded": true,
    "passable_type": "boat_only", // "dry" | "ambulance_passable" (<0.3m) | "boat_only" (>0.5m)
    "horizon_mask_deg": 32.5
  }
  ```
- `dry_ridges`: Array of candidate staging zones:
  ```json
  {
    "id": "dhak_crest",
    "name": "Dhak Village Crest",
    "lat": 30.525,
    "lon": 79.552,
    "elevation_m": 2980.0,
    "is_recommended": true,
    "recommended_tether_height_m": 50.0,
    "flood_depth_m": 0.00
  }
  ```
- `rescue_channels`: Array of polylines:
  ```json
  {
    "id": "ch_ambulance",
    "name": "Joshimath-Tapovan Evac Road",
    "channel_type": "ambulance", // "ambulance" | "boat"
    "avg_depth_m": 0.15,
    "path": [[30.55, 79.54], [30.54, 79.56], ...]
  }
  ```

### 3. `GET /api/satellites?observer_lat=...&observer_lon=...`
Returns real-time NavIC constellation:
```json
[
  { "prn": "IRNSS-1A", "azimuth_deg": 41.9, "elevation_deg": 42.1, "is_active": true, "orbit_type": "GEO" },
  { "prn": "IRNSS-1B", "azimuth_deg": 48.4, "elevation_deg": 48.2, "is_active": true, "orbit_type": "GSO" },
  { "prn": "IRNSS-1C", "azimuth_deg": 53.6, "elevation_deg": 53.1, "is_active": true, "orbit_type": "GEO" },
  { "prn": "IRNSS-1E", "azimuth_deg": 61.6, "elevation_deg": 61.2, "is_active": true, "orbit_type": "GSO" },
  { "prn": "IRNSS-1G", "azimuth_deg": 27.6, "elevation_deg": 27.2, "is_active": true, "orbit_type": "GEO" },
  { "prn": "IRNSS-1I", "azimuth_deg": 38.5, "elevation_deg": 38.1, "is_active": true, "orbit_type": "GSO" },
  { "prn": "NVS-01",   "azimuth_deg": 24.6, "elevation_deg": 24.2, "is_active": true, "orbit_type": "GSO" }
]
```

### 4. `POST /api/dop-grid`
Payload:
```json
{
  "scenario_id": "chamoli_uttarakhand",
  "active_satellites": ["IRNSS-1A", "IRNSS-1B", "IRNSS-1C"],
  "mode": "pseudolite", // "baseline" | "pseudolite" | "barometer"
  "beacon": { "lat": 30.525, "lon": 79.552, "elevation_m": 2980.0, "height_m": 50.0 },
  "uere_m": 3.0
}
```
Returns array of computed DOP metrics for each cell:
```json
[
  {
    "id": "c_0",
    "lat": 30.535,
    "lon": 79.565,
    "status": "SUB_5M", // "SUB_5M" (<5m) | "DEGRADED" (5-15m) | "NO_FIX" (>15m)
    "gdop": 3.82,
    "pdop": 3.21,
    "hdop": 2.14,
    "vdop": 2.39,
    "error_m": 3.8,
    "visible_sats": 4,
    "is_flooded": true
  }
]
```

### 5. `POST /api/optimize-beacon`
Runs dry-ridge optimizer algorithm and returns winning beacon coordinates and percentage improvement (e.g. 73.3% reduction in error).

### 6. `POST /api/timeseries-24h`
Returns 24 hourly points comparing Mode 01 vs Mode 02 vs Mode 03.

---

## 5. WHAT IS WRONG WITH THE CURRENT FRONTEND & WHAT NEEDS TO BE OVERHAULED

### Current Defects:
1. **Lacks Cinematic Realism:** The current 3D attempt uses a simple procedural canvas with basic lighting. It does not feel like an authentic, high-end defense/space GIS tool (like Palantir Gotham, Cesium Ion, or NASA WorldWind).
2. **Water Depth is Not Instantly Intuitive:** A viewer should be able to immediately grasp the flood dynamics at a glance—seeing deep, turbulent river currents in deep gorge cuts vs shallow passable flood fringes vs bone-dry ridges.
3. **Terrain Shading & Relief:** Mountain slopes need photorealistic elevation color ramps, PBR normal-mapped rock displacement, snow caps on high peaks, realistic alpine vegetation on mid-slopes, and riverbed talus.
4. **UI Clutter vs Modern Glassmorphism:** Controls should be sleek, floating, semi-transparent glass panels with crisp typography, military-spec coordinate telemetry, and zero visual noise.

---

## 6. THE TARGET FRONTEND VISION & REQUIREMENTS

You are tasked with redesigning and rewriting the frontend to look like an **authentic ISRO Disaster Mission Control & Autonomous Navigation Simulation**:

### Requirement 1: Photorealistic 3D Terrain Engine (Three.js / WebGL)
- **True 3D Topographic Mesh:** 
  - Constructed using the real Cartosat-1 DEM elevation data ($15 \times 15$ grid in Chamoli with $1,850\text{ m} \text{ to } 3,203\text{ m}$ elevation; $16 \times 16$ grid in Godavari).
  - Smooth bilinear/bicubic surface interpolation ($64 \times 64$ or higher resolution) so slopes are rugged and natural.
  - Realistic vertex normal lighting, dramatic directional sun casting long shadows across the canyon, and an atmospheric rim light.
- **Satellite Texture / Material:**
  - High-resolution procedural PBR shader combining:
    - High-altitude snow and jagged granite rock peaks (>2,800m).
    - Alpine pine / coniferous forest gradients (2,200m–2,800m).
    - Talus, gravel, and silt along the canyon base.
    - Subtle topographic contour lines etched at $100\text{ m}$ elevation intervals.
- **Physical 3D Volumetric Water Simulation:**
  - Realistic water body sitting in the valley floor.
  - Animated specular surface with refractive ripples and flow vectors.
  - Water depth gradient: deep translucent navy in boat channels ($>0.5\text{ m}$), bright crystal turquoise/cyan in shallow passable waters ($<0.3\text{ m}$).
  - Visible riverbed beneath the water; bone-dry rocky cliffs rising above the flood line.

### Requirement 2: 3D Interactive Tactical Overlay
- **SAR-Verified Dry Ridge Staging Pads:**
  - Futuristic illuminated landing pads on the mountain crests (*Tapovan Spur*, *Dhak Crest*, *Subhai Spur*).
  - Rotating holographic antennas, glowing landing markings, and floating 3D tactical tags (`SAFE DRY RIDGE · 0.00m FLOODWATER`).
  - Clicking a ridge immediately deploys the tethered drone there.
- **The Tethered Drone Beacon:**
  - Realistic 3D drone quadcopter hovering at `tether_height_m` ($10\text{ m} \text{--} 150\text{ m}$).
  - Physical glowing high-voltage tether cable connecting the drone down to the base station on the ridge.
  - Expanding translucent signal pulse dome across the valley floor.
- **NavIC Constellation & Mountain Line-of-Sight Rays:**
  - Satellites orbiting in the 3D sky dome (`IRNSS-1A` through `NVS-01`).
  - Laser line-of-sight beams down to the rescue area:
    - 🟢 Green laser when clear.
    - 🔴 Red laser that physically collides with the mountain peak when the satellite is obscured by canyon terrain ($<28^\circ \text{ horizon angle}$)!
- **DOP Accuracy Projection Mode:**
  - A toggle to project the Red/Yellow/Green positioning accuracy directly onto the 3D terrain surface, showing the red blackout zone shrink to vibrant green when the drone is deployed.

### Requirement 3: Professional Mission Control HUD & Controls
- **Navbar:** Clean dark header with NavIC-Restore branding, ISRO mission badges (EOS-04 SAR, Cartosat-1 DEM, NavIC), scenario selector, Mode 01/02/03 switcher, and "Auto-Deploy Drone on Dry Ground" button.
- **Satellite Kill-Switch Bar:** Interactive toggle chips for all 7 satellites. Clicking a satellite turns it off and instantly updates the 3D terrain in real time.
- **Right-Hand Telemetry Drawer:**
  - Real-time GDOP, PDOP, HDOP, VDOP readouts.
  - Predicted 3D positioning error in meters.
  - Drone tether height slider ($10\text{ m} \text{--} 150\text{ m}$) and UERE range error slider ($2\text{ m} \text{--} 5\text{ m}$).
  - 24-Hour Diurnal Error Chart (Recharts) comparing Mode 01 vs Mode 02 vs Mode 03.
  - Hackathon Engineering Honesty Disclaimer.
- **3D Camera Presets & Controls:**
  - Orbit, pan, zoom with mouse.
  - Quick camera buttons: "Canyon Overview", "Drone Staging View", "Top-Down Tactical".
  - "Cinematic Orbit" toggle for hands-free presentation during judging.
- **Dual-Mode Safety Net (`standaloneEngine.js`):**
  - The UI must talk to `/api/...`, but if the backend server is ever stopped, the browser client-side engine must seamlessly take over so the demo **never crashes or freezes**.

---

## 7. FILES TO REWRITE & DELIVER

When generating the overhaul, please provide the complete, working code for:
1. `frontend/src/components/Terrain3DViewer.jsx` (The Three.js 3D Terrain & Water Engine)
2. `frontend/src/components/MapComponent.jsx` (The Map Container with 3D/2D switcher)
3. `frontend/src/components/Navbar.jsx` (The Mission Control Header)
4. `frontend/src/components/SatelliteBar.jsx` (Interactive Satellite Constellation Bar)
5. `frontend/src/components/MetricsDrawer.jsx` (Right-Hand Telemetry HUD)
6. `frontend/src/App.jsx` (Main Application State & Wiring)

Ensure all imports from `three`, `three/examples/jsm/controls/OrbitControls.js`, `lucide-react`, `recharts`, and local services match the existing project structure.

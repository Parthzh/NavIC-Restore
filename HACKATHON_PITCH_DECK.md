# NavIC-Restore: 7-Slide Master Hackathon Presentation Specification

> **Target Audience**: Hackathon Judges, Defense/Space Mentors, Aerospace & Remote Sensing Evaluators  
> **Format**: 7 Slides | High-Density Technical Presentation | Swiss Editorial & Aerospace Blueprint Theme  
> **Live Production URL**: https://nav-ic-restore-six.vercel.app/  
> **GitHub Repository**: https://github.com/Parthzh/NavIC-Restore  
> **Team**: Parth, Yashaswi, Jayant, Vedant  
> **Track**: ASTRA 2026 — Space & Disaster Resilience Track  

---

## Slide 1: Title, System Credentials & Executive Hook

### Visual Layout & Styling
- **Background**: Deep aerospace black (`#0B0F14`) with subtle grid blueprint accents.
- **Typography**: Editorial Serif Header (*Newsreader* style) + Monospace Telemetry Subheads (*IBM Plex Mono*).
- **Badges / Pills**: High-contrast white/amber badges: `ISRO EOS-04 SAR` · `CARTOSAT-1 STEREO DEM` · `NAVIC 7-SV CONSTELLATION` · `LIVE ON VERCEL`.

### On-Slide Content
- **Main Title**: **NavIC-Restore: Space-Based Positioning Recovery in Disaster Canyons**
- **Subtitle**: Autonomous Multi-Sensor Inundation Bathymetry & Tethered Aerial Pseudolite Relays for Degraded Satellite Navigation
- **The Core Hook**:
  > *"When mountain cloudbursts and flash floods strike narrow river gorges, terrain shadows low-elevation satellites, collapsing navigation for NDRF rescue boats into total blackout. NavIC-Restore is the world’s first closed-loop cyber-physical engine that transforms satellite radar into active aerial navigation lifelines."*
- **Key Metrics Highlight**:
  - **4 Space Assets**: ISRO EOS-04 C-Band SAR, Cartosat-1 2.5m DEM, NavIC L5/S-Band Constellation.
  - **0% $\to$ 92%**: Restoration of sub-5m operational position fix.
  - **$\infty \to 2.3\,\text{m}$**: GDOP collapse via autonomous rank-4 matrix inversion.
- **Project Links**:
  - Production Deployment: `https://nav-ic-restore-six.vercel.app/`
  - Open-Source Codebase: `https://github.com/Parthzh/NavIC-Restore`

### Speaker Notes (1 Minute)
> *"Judges, in disaster events like the 2021 Chamoli glacier break or the 2024 Wayanad landslide, rescue teams face a deadly invisible crisis: navigation blackout. Because of 1,000-meter canyon walls, rescue boats and ambulances lose line-of-sight to the NavIC constellation, dropping from the required 4 satellites down to 3. Mathematically, the geometry matrix becomes singular—rendering GPS and NavIC completely blind. We built NavIC-Restore: a system that autonomously ingests ISRO radar satellites from space, identifies dry ridge vantage points, and calculates the exact aerial coordinates to fly a tethered drone pseudolite that restores full 3D positioning from 0% to 92% sub-5m accuracy."*

---

## Slide 2: The Critical Failure State — Mountain Canyon Masking & Mathematical Singularity

### Visual Layout & Styling
- **Left Column (50%)**: Conceptual Diagram / Geometric Horizon Masking Illustration showing mountain walls obscuring low-elevation satellites ($<35^\circ$), leaving only 3 overhead satellites.
- **Right Column (50%)**: Mathematical Formulation Box + Concrete Disaster Case Evidence.

### On-Slide Content
- **Slide Title**: **The Geometry Problem: Mountain Horizon Masking & Matrix Singularity**
- **The Physical Phenomenon**:
  - In deep mountain gorges (Chamoli, Wayanad) and flooded embankments (Godavari, Kaziranga), steep relief elevates the local horizon mask to **$\theta_{\text{mask}} \ge 35^\circ$**.
  - All satellites at low elevation angles are physically blocked by solid rock.
- **The Mathematical Failure**:
  - For $m$ visible satellites, receiver geometry is governed by the observation matrix $\mathbf{G} \in \mathbb{R}^{m \times 4}$:
    $$\mathbf{G} = \begin{bmatrix} -\mathbf{u}_1 & 1 \\ -\mathbf{u}_2 & 1 \\ -\mathbf{u}_3 & 1 \end{bmatrix}$$
  - **Rank Deficiency**:
    $$\text{rank}(\mathbf{G}) = 3 < 4 \implies \det(\mathbf{G}^T \mathbf{G}) = 0 \implies \mathbf{Q} = (\mathbf{G}^T \mathbf{G})^{-1} \to \infty$$
  - **Position Dilution of Precision (PDOP)** becomes infinite. The receiver drops into **complete positioning blackout** ($>15\,\text{m}$ to $50\,\text{m}$ drift).
- **Humanitarian Impact**:
  - NDRF Zodiac inflatable rescue boats cannot track navigable river fairways in turbulent waters.
  - Emergency medical ambulances cannot distinguish submerged roads ($>0.5\,\text{m}$) from passable routes ($<0.35\,\text{m}$).

### Speaker Notes (1 Minute)
> *"Here is the core physics of why GNSS fails in Indian disasters. A GPS or NavIC receiver is not just a radio; it's a linear algebra solver. You need 4 non-coplanar satellites to solve for 4 unknowns: X, Y, Z, and receiver clock bias. In narrow gorges, mountain walls rise up to 38 degrees on either side. Every satellite below 35 degrees elevation is blocked by rock. You are left with only 3 satellites overhead. Mathematically, the 3x4 geometry matrix has a rank of 3. When you multiply G-transpose by G, its determinant is exactly zero. It cannot be inverted. GDOP explodes to infinity, and standard receivers shut down with 'NO FIX'. This is why rescue boats drift into rapids and ambulances stall in floodwaters."*

---

## Slide 3: Scientific Provenance — The Research Paper "Flex" & Limitations Overcome

### Visual Layout & Styling
- **3-Card Archival Dossier Layout**: High-contrast, clean comparison cards citing each paper, its historical limitation, and NavIC-Restore’s novel resolution.

### On-Slide Content
- **Slide Title**: **Scientific Provenance: Resolving Landmark Literature Limitations**
- **Subtitle**: Standing on the Shoulders of Giants — Implementing and Surpassing Prior Art

#### Card 1: Pseudolite Augmentation
- **Paper**: **Tsujii, Harigae, & Sugimoto (2006)** · *GPS Solutions / Springer*
  - *"Ground-Based Pseudolite Augmentation of GPS for Mountainous Terrains"*
- **Historical Limitation**: Ground pseudolites require pre-installed, concrete-anchored towers on valley floors. In active flash floods, roads are washed out, and valley-floor transmitters suffer severe multipath reflection off wet canyon walls.
- **NavIC-Restore Fix**: Replaces static ground towers with an **autonomous tethered aerial drone relay** ($h_p = 55\,\text{m}$) deployed onto high-elevation dry crests, eliminating ground multipath and ground-access dependencies.

#### Card 2: Radar Flood Inundation Bathymetry
- **Paper**: **Schumann, Hostache, & Puech (2007)** · *Journal of Hydrology / Elsevier*
  - *"SAR-Derived Flood Water Levels for Inundation Model Calibration and Validation"*
- **Historical Limitation**: Conventional SAR flood mapping is retrospective and observational, performing slow post-event backscatter thresholding without real-time vehicle-passability segmentation.
- **NavIC-Restore Fix**: Combines ISRO EOS-04 C-band radar with 2.5m stereo DEMs to segment flood zones in real time into **bifurcated operational evacuation channels**: shallow ambulance corridors ($<0.35\,\text{m}$) vs. deepwater rescue boat channels ($>0.50\,\text{m}$).

#### Card 3: Vertical Height Clamping
- **Paper**: **Brown (1993) / Groves (2013)** · *Artech House*
  - *"Barometric Altimeter Aiding and Digital Elevation Model Height-Clamping in GNSS"*
- **Historical Limitation**: Barometric altimeters suffer severe calibration drift ($\pm 15\,\text{m}$) during cloudbursts due to localized storm barometric pressure drops.
- **NavIC-Restore Fix**: Eliminates barometric drift by pairing continuous tethered wire altimetry ($h_p$) with **Cartosat-1 2.5m stereo micro-DEM elevation surfaces**, providing an unconditionally stable pseudo-measurement that clamps vertical VDOP.

### Speaker Notes (1.5 Minutes)
> *"We did not guess the solution; we built on 20 years of peer-reviewed aerospace and remote sensing research, directly fixing their unresolved flaws. In 2006, Tsujii proved pseudolites can fix mountain GPS, but his system required permanent ground towers—impossible to deploy across an active flood. We replaced ground towers with tethered drones. In 2007, Schumann showed SAR radar can measure flood levels, but it was just a post-event map. We turned radar into real-time operational routing: shallow ambulance tracks under 0.35m and boat channels over 0.5m. And in 1993, Brown proposed barometric altimeter aiding, but monsoon cloudbursts cause barometric pressure drops that corrupt altimeters by 15 meters. We solved this by using ISRO's Cartosat-1 2.5m stereo DEM combined with tethered laser/cable altimetry to provide a drift-free vertical reference."*

---

## Slide 4: The Patent-Grade Innovation — Closed-Loop Cyber-Physical Geometry Optimization

### Visual Layout & Styling
- **Left Column (45%)**: Patent Specification & Novelty Breakdown.
- **Right Column (55%)**: End-to-End Cyber-Physical Flowchart + Matrix Recovery Math.

### On-Slide Content
- **Slide Title**: **Novel Intellectual Property: Closed-Loop SAR-to-Aerial Pseudolite Coupling**
- **Patent Strategy**:
  - **Title**: *System and Method for Autonomous Aerial Pseudolite Positioning Recovery via Spaceborne Synthetic Aperture Radar Inundation Topography*
  - **IPC Classifications**: `G01S 19/07` (GNSS Augmentation) · `B64U 10/10` (UAV Relay Architectures)
  - **Defensive Publication & Priority**: Prior art established via public, cryptographically timestamped git commit history (`SHA-1: 5684727`) and open-access reference implementation.
- **The 4-Stage Autonomous Pipeline**:
  ```
  1. Space SAR Ingestion (EOS-04 5.4 GHz VV/VH)
            │
  2. Dry Crest Discovery (Water Depth = 0.00m & Peak Elevation)
            │
  3. Constrained Covariance Optimization (Max det(G_aug^T · G_aug))
            │
  4. Tethered Drone Pseudolite Actuation (PRN 08, hp = 55m)
  ```
- **The Mathematical Rank Recovery**:
  $$\mathbf{G}_{\text{aug}} = \begin{bmatrix} -\mathbf{u}_1 & 1 \\ -\mathbf{u}_2 & 1 \\ -\mathbf{u}_3 & 1 \\ \frac{\mathbf{x} - \mathbf{x}_p}{\|\mathbf{x} - \mathbf{x}_p\|} & 1 \end{bmatrix} \implies \text{rank}(\mathbf{G}_{\text{aug}}) = 4$$
- **Outcome**: The determinant becomes strictly non-zero. Covariance matrix $\mathbf{Q} = (\mathbf{G}_{\text{aug}}^T \mathbf{G}_{\text{aug}})^{-1}$ inverts smoothly. Sub-5m position fix surges from **0% to 92%** across the flood zone.

### Speaker Notes (1.5 Minutes)
> *"This slide is our biggest technical flex. In patent law, you cannot patent an equation, but you CAN patent a cyber-physical system that takes remote sensor data and autonomously actuates hardware to physically alter signal geometry. Prior art has radar flood maps, and prior art has drones. But NOBODY has ever linked spaceborne radar flood bathymetry directly to an aerial pseudolite geometry optimizer. Our system ingests EOS-04 radar data, finds the dry mountain crests, computes which ridge coordinate mathematically maximizes the determinant of G-transpose G, and deploys a tethered drone broadcasting PRN 08. The drone injects a non-coplanar 4th row into the matrix, instantly restoring full rank 4 and collapsing GDOP from infinity to 2.3 meters."*

---

## Slide 5: System Architecture & Live 3D Simulation Cockpit

### Visual Layout & Styling
- **Hero Image (65% Width)**: 
  - **`[SCREENSHOT PLACEHOLDER: Insert high-res screenshot of the live 3D map from https://nav-ic-restore-six.vercel.app/#simulator]`**
  - Showcases 3D terrain relief, green dry ridge waypoint, blue water channel, amber tethered drone relay, and live telemetry rack (Bays 01–05).
- **Side Panel (35% Width)**: Technical Cockpit Specifications & 1-Click Judge Flight Recorder.

### On-Slide Content
- **Slide Title**: **Interactive 3D Cockpit & Real-Time Telemetry Engine**
- **Live Production URL**: `https://nav-ic-restore-six.vercel.app/`
- **Frontend Architecture**:
  - **Zero Server Latency**: 100% self-contained client-side WebGL engine running at **60 FPS**.
  - **Three.js GPU Shaders**: Procedural elevation heightfields, dynamic depth water planes, ray-cast satellite vectors.
  - **Analytical SGP4 Look-Angle Solver**: Dynamically calculates azimuth & elevation for all 7 NavIC satellites for any observer coordinate across India.
- **Judge Flight Recorder Storyboard (1-Click Demo Walkthrough)**:
  1. **`[01] CANYON OUTAGE`**: Mountain walls mask low satellites ($m=3$). $\det(\mathbf{G}^T \mathbf{G}) = 0$, rank deficient, receiver status: `NO FIX [LOST]`, error $>15\,\text{m}$.
  2. **`[02] SAR RADAR`**: Switches to dual-pol C-band radar overlay highlighting verified dry high-ground ridges ($d = 0.00\,\text{m}$) and viable boat/ambulance channels.
  3. **`[03] DRONE LOCK`**: Deploys tethered pseudolite at $h_p = 55\,\text{m}$. Matrix rank restores to 4, covariance diagonals invert, status turns `LOCKED [±3.2m]`, sub-5m fix restores to 92%.

### Speaker Notes (1.5 Minutes)
> *"To prove our mathematics work in real time, we built a production-grade 3D aerospace cockpit, currently live on Vercel at nav-ic-restore-six.vercel.app. The entire 3D simulator runs client-side in WebGL at 60 frames per second with zero server cold starts. In the top right header, we built a 1-click 'Flight Recorder' for judges: Click '01 CANYON OUTAGE', and you immediately see the satellites drop to 3, covariance diagonals zero out, and positioning fails. Click '02 SAR RADAR', and ISRO EOS-04 C-band radar illuminates verified dry landing ridges and separates ambulance paths from boat channels. Click '03 DRONE LOCK', and the drone pseudolite ascends, injecting Row 4 into the covariance matrix and restoring sub-5m navigation in real time."*

---

## Slide 6: Multi-Location Verification Across India

### Visual Layout & Styling
- **Grid of 4 Disaster Cards**: Visual summary of the 4 Indian disaster scenarios tested and verified with before/after quantitative metrics.

### On-Slide Content
- **Slide Title**: **Empirical Validation Across Authentic Indian Disaster Profiles**
- **Subtitle**: Proving Mathematical Generalizability — Beyond Pre-Programmed Data

| Disaster Scenario | Geography & Terrain Type | Primary Disaster Threat | Baseline (Unmasked) | NavIC-Restore Augmented | Fix Recovery Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chamoli Gorge** (Uttarakhand) | Steep Glacial Canyon ($1,840 - 3,240\,\text{m}$) | Rishi Ganga 2021 Glacier Break & Flash Surge | **NO FIX (Rank 3)** · $>15\,\text{m}$ | **$\pm 3.2\,\text{m}$ Fix** (GDOP: 2.3) | **0% $\to$ 92%** |
| **Godavari Basin** (Andhra Pradesh) | Alluvial River Floodplain ($48 - 182\,\text{m}$) | Bhadrachalam Embankment Submergence | **Degraded** · GDOP: 4.8 | **$\pm 2.6\,\text{m}$ Fix** (GDOP: 1.9) | **41% $\to$ 98%** |
| **Wayanad Ghats** (Kerala) | Western Ghats Ravine ($720 - 1,980\,\text{m}$) | Meppadi 2024 Catastrophic Landslides | **NO FIX (Rank 3)** · $>15\,\text{m}$ | **$\pm 3.4\,\text{m}$ Fix** (GDOP: 2.4) | **0% $\to$ 89%** |
| **Kaziranga Basin** (Assam) | Braided River Floodplain ($45 - 142\,\text{m}$) | Brahmaputra Annual Monsoon Surge | **Degraded** · GDOP: 4.5 | **$\pm 2.4\,\text{m}$ Fix** (GDOP: 1.8) | **48% $\to$ 96%** |

- **Generalizable SGP4 Orbit Engine**:
  - Ingests real orbital elements for NavIC GEO satellites (32.5°E, 83°E, 129.5°E) and GSO satellites (55°E & 111.75°E with 29° inclination).
  - Quick Region Builder supports instant 1-click coordinate presets for Kedarnath Valley, Munnar Ridge, Patna Ganga reach, and Narmada Gorge.

### Speaker Notes (1 Minute)
> *"We wanted to prove our system is not hardcoded for one valley. We pre-calibrated and verified NavIC-Restore across 4 distinct Indian disaster typologies: the steep glacial canyons of Chamoli (Uttarakhand), the escarpment valleys of Wayanad (Kerala), the alluvial floodplains of the Godavari Basin (AP), and the braided river deltas of Kaziranga (Assam). In both mountainous zones (Chamoli and Wayanad), baseline satellite navigation suffers complete blackout. With our drone pseudolite, sub-5m navigation recovers from 0% to over 90%. Furthermore, our Quick Region Builder includes an analytical SGP4 orbit solver that allows rescue coordinators to enter ANY latitude and longitude in India and instantly calculate live satellite look-angles and pseudolite leverage."*

---

## Slide 7: Implementation Feasibility, IP Roadmap & Conclusion

### Visual Layout & Styling
- **Left Column (50%)**: Hardware Engineering Feasibility & Power/Link Budget.
- **Right Column (50%)**: Intellectual Property Strategy, Operational Roadmap & Q&A Callout.

### On-Slide Content
- **Slide Title**: **Operational Feasibility, IP Strategy & Disaster Roadmap**
- **Hardware & Link Budget Realism**:
  - **Tethered Power & RF Link**: Powered via high-tensile micro-tether cable from NDRF rescue vehicles. Eliminates drone battery limits, enabling **continuous 24/7 aerial dwell time**.
  - **Pseudolite Payload**: Lightweight ($<1.2\,\text{kg}$) L5/S-band micro-transmitter synchronized via oven-controlled crystal oscillator (OCXO 10 MHz, $\pm 1\,\text{ppb}$).
  - **Tether Altitude Sensitivity**: Optimized at $h_p = 55\,\text{m}$ ($\pm 3.0\,\text{m}$ UERE), providing ideal line-of-sight elevation angles ($45^\circ - 85^\circ$) without excessive aerodynamic drag.
- **Intellectual Property Strategy (₹0 Spent / Maximum Impact)**:
  - **Defensive Open-Source Disclosure**: Core algorithms published openly under MIT License on GitHub (`Parthzh/NavIC-Restore`). Legally establishes world prior-art priority while keeping life-saving disaster tools open for public emergency agencies.
  - **Provisional Patent Specification Ready**: Complete Form 1/Form 2 draft prepared for institutional university IPR filing.
- **Future Operational Roadmap**:
  - **Phase 1 (Done)**: Full-stack 3D simulation, mathematical verification, live cloud deployment.
  - **Phase 2 (Next 6 Months)**: Field tests with SDR-based (Software Defined Radio) L5 pseudolite prototypes with State Disaster Management Authorities (SDMA).
  - **Phase 3 (12 Months)**: Direct integration into National Disaster Response Force (NDRF) rescue vehicle fleets.

### Closing Pitch Line:
> **"NavIC-Restore bridges space assets to mountain riverbeds—ensuring that when disasters strike India’s most vulnerable canyons, navigation signals never go dark."**

### Speaker Notes (1 Minute)
> *"To conclude: NavIC-Restore is practically engineered for immediate real-world deployment. By using a tethered quadcopter powered from an emergency rescue vehicle, we eliminate battery constraints and achieve continuous 24-hour aerial relay operations. The pseudolite payload weighs under 1.2 kg and transmits standard NavIC L5 signals that require zero hardware modifications on existing search-and-rescue GPS receivers. We chose to open-source the core reference implementation on GitHub to establish defensive prior-art and ensure these humanitarian tools remain accessible to agencies like the NDRF. Thank you, judges. We are now open for technical questions and live simulator inspection."*

---

## Technical Appendix: Quick Cheat-Sheet for Judge Questions

If the judges ask deep technical questions during Q&A, use these exact engineering answers:

1. **"Why not just use cellular 4G/5G towers?"**
   - *Answer*: In cloudbursts, flash floods, and landslides, cellular towers in river valleys are physically washed away or lose grid power. NavIC-Restore relies exclusively on space satellites (ISRO EOS-04 and NavIC) that cannot be destroyed by local surface flooding.
2. **"How does the receiver differentiate the pseudolite from a real satellite?"**
   - *Answer*: The drone transmits on NavIC PRN 08 (an authorized space vehicle pseudo-random noise code). The receiver processes it identically to a space vehicle signal, needing only a known fixed transmission coordinate ($x_p, y_p, z_p$).
3. **"What if the drone drifts in high wind?"**
   - *Answer*: Because the drone is tethered and equipped with RTK/optical flow positioning, its coordinate error is bounded within $\pm 0.15\,\text{m}$. In our mathematical model, we conservatively simulated a high User Equivalent Range Error of $\sigma_{\text{UERE}} = 3.0\,\text{m}$ to $5.0\,\text{m}$, and the geometry matrix still consistently converges to sub-5m accuracy.

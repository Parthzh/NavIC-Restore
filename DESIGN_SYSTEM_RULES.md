# NAVIC-RESTORE — DESIGN SYSTEM & ANTI-AI-SLOP SPECIFICATION

## 1. Visual Philosophy & Strict Analogy
This interface adapts a **Swiss Editorial + Technical Blueprint** visual language into a space-based disaster navigation platform (**NavIC Restore**). Every visual motif from the reference system maps directly to a real engineering concept:

| Reference Motif | NavIC-Restore Engineering Analogy |
| :--- | :--- |
| **4-Stripe Warm Horizon Band** (`#F5A623` → `#EB6E1F` → `#D92B2B` → `#7A1215`) | Topographic elevation contours, SAR radar frequency bands, and GDOP error severity gradients. |
| **1px Dashed Blueprint Cards** (`#D4D7DD`) | Cartographic grid sectors, SAR bounding boxes, and aerospace schematic frames. |
| **Isometric Ink-Line Diagrams** | Tethered drone pseudolite geometry, orbital line-of-sight vectors, and terrain masking. |
| **Circular Dashed Orbital Hub** | The 7-satellite NavIC (IRNSS/NVS) constellation converging on a SAR-verified dry staging ridge. |
| **Pure White Canvas + Jet Black Frame** | High-legibility daylight mission briefing paired with deep-space telemetry framing. |

---

## 2. Color Tokens (Strictly Enforced)

- **Primary Surface:** `#FFFFFF` (Crisp editorial white)
- **Secondary Surface:** `#F8F9FA` (Subtle drafting paper tint for schematic wells)
- **Outer / Dark Band Frame:** `#07090C` (Deep jet black for hero base, simulator frame, and footer)
- **Primary Ink:** `#0B0F14` (Headings, primary buttons, isometric outlines)
- **Secondary Ink:** `#525B66` (Body copy, high-contrast WCAG AA+)
- **Muted Ink:** `#858E99` (Index markers `[01]`–`[04]`, coordinates)
- **Blueprint Border:** `1px dashed #CFD5DC`
- **Signature 4-Band Spectrum:**
  - Band 1 (Amber Gold): `#F5A623`
  - Band 2 (Solar Orange): `#E86820`
  - Band 3 (Signal Red): `#D32F2F`
  - Band 4 (Deep Crimson): `#7B1113`
- **Semantic Map Status (Simulator Only):**
  - Sub-5m Fix / Ambulance Passable: `#16A34A` / `#22C55E`
  - Degraded (5–15m): `#D97706`
  - No Fix (>15m): `#DC2626`
  - Deep Floodwater (Boat Only): `#133B6B` → `#2B72A8`

---

## 3. Typography Rules

- **Display & Section Headings:** `Newsreader` (Editorial Serif), weight `400`–`500`, tight tracking `-0.025em`, line-height `1.08`. Never italicize a single random word in a colored accent.
- **UI & Body Copy:** `DM Sans` (Geometric Grotesque), weight `400`–`500`, line-height `1.55`. **Inter is strictly banned.**
- **Data, Coordinates & Indices:** `IBM Plex Mono` (`tabular-nums`), reserved exclusively for numeric readouts (`2.40 m`, `±3.4 m`, `30.535°N`) and index tags (`[01]`).

---

## 4. Anti-AI-Slop & Anti-Vibecoded Checklist (Strictly Banned)

Based on industry audits of AI-generated / vibecoded web interfaces, the following patterns are **explicitly forbidden**:

1. **No "VibeCode Purple" or neon cyan/indigo glows** — Zero purple gradients, zero radial glow blobs behind text, zero neon borders.
2. **No Inter or Space Grotesk defaults** — Use the Newsreader + DM Sans pairing.
3. **No colored left-border cards** — Never put a thick colored stripe on the left edge of a card.
4. **No decorative pulsing "LIVE" green dots or meaningless "BETA/AI" pills** above every headline.
5. **No generic glassmorphism over noisy backgrounds** — Use crisp, solid, high-contrast surfaces with clear borders.
6. **No repetitive 3-column icon-on-top feature grids** — Vary section rhythm using asymmetric splits, 2×2 blueprint bentos, and interactive visuals.
7. **No buzzword copywriting** — Ban *"Unlock"*, *"Elevate"*, *"Seamless"*, *"Next-Gen"*, *"Revolutionize"*, and excessive em-dashes. Use concrete, plain-English engineering language.
8. **No emoji icons in navigation or headers** — Use bespoke minimal SVG linework only.
9. **No information overload on first glance** — The simulator opens with an unobstructed satellite terrain view, simple 1-click mode toggles, direct hover water-depth inspection, and collapsible advanced controls.

---

## 5. Performance & Interaction Standards

- **Single-File Zero-Lag Execution:** Self-contained HTML with GPU-accelerated Three.js r128 WebGL terrain (`64×64` interpolated elevation grid, capped DPR `1.5`, automatic pause when scrolled out of view).
- **Automatic 2D Fallback:** Seamless switch between 3D Top-Down Satellite View and crisp 2D Orthophoto Heatmap; if WebGL is unavailable, 2D activates automatically.
- **Direct Hover Inspection:** Moving the pointer over any point on the terrain immediately displays exact water depth (meters), rescue vehicle passability (Dry / Ambulance OK / Boat Only), elevation, and NavIC fix accuracy.
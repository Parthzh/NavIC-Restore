import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { Radio, Mountain, Navigation, Compass, Layers, Box, Map as MapIcon } from 'lucide-react';
import Terrain3DViewer from './Terrain3DViewer';

// Fix Leaflet's default icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Drone Beacon Icon (Glowing SVG)
const createDroneIcon = (heightM) => {
  return L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%);">
        <div class="pulse-ring-active" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(255, 111, 0, 0.4); border: 2px solid #FF6F00; pointer-events: none;"></div>
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #FF6F00; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px #FF6F00;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
          </svg>
        </div>
        <div style="background: rgba(6, 9, 19, 0.9); border: 1px solid #FF6F00; color: #ffffff; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-top: 4px; white-space: nowrap; font-family: monospace;">
          DRONE ${heightM}m
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Custom Dry Ridge Icon
const dryRidgeIcon = L.divIcon({
  className: 'custom-ridge-icon',
  html: `
    <div style="display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
      <div style="width: 26px; height: 26px; border-radius: 6px; background: #FFB703; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(255,183,3,0.7);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#060913" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
        </svg>
      </div>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

// Helper component to re-center map on scenario change
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lon) {
      map.setView([center.lat, center.lon], 13, { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function MapComponent({
  scenario,
  dopGrid,
  mode,
  beacon,
  onUpdateBeaconPosition,
  selectedCell,
  onSelectCell,
  onDeployToRidge,
  satellites = []
}) {
  // Main View Mode: '3D' (Default Photorealistic Terrain) vs '2D' (Tactical Top-Down)
  const [viewDimension, setViewDimension] = useState('3D');

  // 2D Overlay layer visibility
  const [showFloodLayer, setShowFloodLayer] = useState(true);
  const [showDopLayer, setShowDopLayer] = useState(true);
  const [showRidgesLayer, setShowRidgesLayer] = useState(true);
  const [showChannelsLayer, setShowChannelsLayer] = useState(true);

  if (!scenario || !scenario.metadata) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading 3D Terrain & Satellite Models...</span>
        </div>
      </div>
    );
  }

  const center = scenario.metadata.center || { lat: 30.535, lon: 79.565 };
  const dryRidges = scenario.dry_ridges || [];
  const rescueChannels = scenario.rescue_channels || [];

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* 2D / 3D Dimension Switcher Pill (Top Center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex items-center bg-slate-900/95 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-2xl">
        <button
          onClick={() => setViewDimension('3D')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            viewDimension === '3D'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>3D Cinematic Terrain</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-emerald-950/40 text-slate-950 font-bold rounded">ISRO Bhuvan</span>
        </button>

        <button
          onClick={() => setViewDimension('2D')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            viewDimension === '2D'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/20'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          <span>2D Tactical Map</span>
        </button>
      </div>

      {/* 3D View Render */}
      {viewDimension === '3D' ? (
        <Terrain3DViewer
          scenario={scenario}
          dopGrid={dopGrid}
          mode={mode}
          beacon={beacon}
          onUpdateBeaconPosition={onUpdateBeaconPosition}
          selectedCell={selectedCell}
          onSelectCell={onSelectCell}
          onDeployToRidge={onDeployToRidge}
          satellites={satellites}
        />
      ) : (
        /* 2D Clean Tactical Map View */
        <div className="relative h-full w-full">
          {/* Layer Visibility Controls Pill */}
          <div className="absolute top-4 right-4 z-[400] bg-slate-900/90 border border-slate-700/80 rounded-xl p-2.5 text-xs flex flex-col gap-1.5 shadow-xl backdrop-blur select-none">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1 pb-1 border-b border-slate-700/60 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Tactical Layers</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showDopLayer}
                onChange={(e) => setShowDopLayer(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>Nav Fix Quality ({mode.toUpperCase()})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showFloodLayer}
                onChange={(e) => setShowFloodLayer(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>SAR Flood Depth (EOS-04)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showRidgesLayer}
                onChange={(e) => setShowRidgesLayer(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span>Dry Ridges (Cartosat-1)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showChannelsLayer}
                onChange={(e) => setShowChannelsLayer(e.target.checked)}
                className="rounded accent-blue-500"
              />
              <span>Rescue Channels</span>
            </label>
          </div>

          {/* 2D Map Legend */}
          <div className="absolute bottom-6 left-6 z-[400] bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs shadow-xl backdrop-blur select-none max-w-xs">
            <div className="font-semibold text-slate-200 text-xs mb-2">Tactical Map Legend</div>
            
            <div className="space-y-1 mb-2.5">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Positioning Fix Quality</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-200 font-medium">Target Fix (&lt;5m error)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="text-slate-300">Degraded Fix (5–15m error)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-300">No Fix / High GDOP (&gt;15m)</span>
              </div>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-700/60">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">SAR Flood Depth (EOS-04)</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-cyan-400/80" />
                <span className="text-slate-300">Ambulance Passable (&lt;0.3m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600/80" />
                <span className="text-slate-300">Boat Only (&gt;0.5m)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span className="text-slate-300">SAR-Verified Dry Ridge (0m)</span>
              </div>
            </div>
          </div>

          {/* Leaflet Map Container with Esri Dark Canvas */}
          <MapContainer
            center={[center.lat, center.lon]}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <MapRecenter center={center} />

            {/* Dark Tactical Canvas Tile Layer (No API Key Required) */}
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> & ISRO NRSC'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />

            {/* 1. Flood Cells Layer */}
            {showFloodLayer &&
              scenario.grid &&
              scenario.grid
                .filter((cell) => cell.is_flooded)
                .map((cell, idx) => {
                  const isAmbulance = cell.passable_type === 'ambulance_passable';
                  const color = isAmbulance ? '#00E5FF' : '#1D4ED8';
                  return (
                    <Circle
                      key={`flood-${idx}`}
                      center={[cell.lat, cell.lon]}
                      radius={110}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: 0.28,
                        stroke: true,
                        color: color,
                        weight: 1,
                        opacity: 0.5
                      }}
                      eventHandlers={{
                        click: () => onSelectCell(cell)
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                        <div className="text-xs font-mono">
                          <strong>Water Depth:</strong> {cell.flood_depth_m}m ({cell.passable_type})
                          <br />
                          <strong>Elevation:</strong> {cell.elevation_m}m
                        </div>
                      </Tooltip>
                    </Circle>
                  );
                })}

            {/* 2. Navigation Fix Heatmap (DOP Grid) */}
            {showDopLayer &&
              dopGrid &&
              dopGrid.map((cell) => {
                let fillColor = '#FF1744'; // Red default (No Fix)
                let fillOpacity = 0.45;

                if (cell.status === 'SUB_5M') {
                  fillColor = '#00E676'; // Emerald Green
                  fillOpacity = 0.55;
                } else if (cell.status === 'DEGRADED') {
                  fillColor = '#FFEA00'; // Yellow
                  fillOpacity = 0.45;
                }

                return (
                  <CircleMarker
                    key={`dop-${cell.id}`}
                    center={[cell.lat, cell.lon]}
                    radius={cell.status === 'SUB_5M' ? 7 : 6}
                    pathOptions={{
                      fillColor: fillColor,
                      fillOpacity: fillOpacity,
                      stroke: true,
                      color: fillColor,
                      weight: 1,
                      opacity: 0.8
                    }}
                    eventHandlers={{
                      click: () => onSelectCell(cell)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                      <div className="text-xs font-sans">
                        <div className="font-bold text-slate-100">
                          {cell.status === 'SUB_5M' ? '🟢 Sub-5m Target Fix' : cell.status === 'DEGRADED' ? '🟡 Degraded Fix' : '🔴 No Fix / High GDOP'}
                        </div>
                        <div className="text-slate-300 font-mono text-[11px] mt-0.5">
                          Expected Error: <strong>{cell.error_m} m</strong>
                          <br />
                          GDOP: <strong>{cell.gdop || 'N/A'}</strong> | Visible Sats: <strong>{cell.visible_sats}</strong>
                        </div>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

            {/* 3. Rescue Corridors / Channels */}
            {showChannelsLayer &&
              rescueChannels.map((ch, idx) => {
                const isBoat = ch.channel_type === 'boat';
                const strokeColor = isBoat ? '#2563EB' : '#00E5FF';
                return (
                  <Polyline
                    key={`channel-${idx}`}
                    positions={ch.path}
                    pathOptions={{
                      color: strokeColor,
                      weight: 3.5,
                      dashArray: isBoat ? '6, 6' : undefined,
                      opacity: 0.85
                    }}
                  >
                    <Tooltip sticky direction="center">
                      <div className="text-xs font-sans">
                        <strong>{ch.name}</strong>
                        <br />
                        <span className="text-[11px] text-slate-300">
                          Type: {ch.channel_type.toUpperCase()} | Depth: {ch.avg_depth_m}m
                        </span>
                      </div>
                    </Tooltip>
                  </Polyline>
                );
              })}

            {/* 4. Candidate Dry Ridges */}
            {showRidgesLayer &&
              dryRidges.map((ridge) => (
                <Marker
                  key={`ridge-${ridge.id}`}
                  position={[ridge.lat, ridge.lon]}
                  icon={dryRidgeIcon}
                  eventHandlers={{
                    click: () => onDeployToRidge?.(ridge)
                  }}
                >
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <div className="font-bold text-emerald-600 flex items-center gap-1">
                        <Mountain className="w-3.5 h-3.5" />
                        <span>{ridge.name}</span>
                      </div>
                      <div className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                        <div>Elevation: <strong>{ridge.elevation_m}m</strong></div>
                        <div>Water Depth: <strong className="text-emerald-700">0.00m (DRY GROUND)</strong></div>
                        <div>Clear Horizon: <strong>{ridge.horizon_clearance_deg}°</strong></div>
                      </div>
                      <button
                        onClick={() => onDeployToRidge?.(ridge)}
                        className="mt-2 w-full bg-emerald-600 text-white font-semibold py-1 px-2 rounded text-[11px] hover:bg-emerald-700 transition"
                      >
                        Deploy Drone Beacon Here
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* 5. Draggable Tethered Drone Beacon Marker */}
            {beacon && (
              <Marker
                position={[beacon.lat, beacon.lon]}
                icon={createDroneIcon(beacon.height_m)}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const marker = e.target;
                    const position = marker.getLatLng();
                    onUpdateBeaconPosition?.(position.lat, position.lng);
                  }
                }}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <div className="font-bold text-amber-600 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Tethered Pseudolite Beacon</span>
                    </div>
                    <div className="text-slate-600 text-[11px] mt-1 space-y-0.5">
                      <div>Tether Height ($h_p$): <strong>{beacon.height_m} m</strong></div>
                      <div>Ground Elevation: <strong>{beacon.elevation_m} m</strong></div>
                      <div>Status: <strong className="text-emerald-600">Active Mode 02 Signal</strong></div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 italic">
                      Tip: Drag marker anywhere on map to simulate new beacon locations.
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

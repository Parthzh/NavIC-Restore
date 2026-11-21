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
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { Radio, Mountain, Navigation, Compass, Layers } from 'lucide-react';

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
      <div style="width: 26px; height: 26px; border-radius: 6px; background: #00E676; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,230,118,0.6);">
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
  onDeployToRidge
}) {
  const [showFloodLayer, setShowFloodLayer] = useState(true);
  const [showDopLayer, setShowDopLayer] = useState(true);
  const [showRidgesLayer, setShowRidgesLayer] = useState(true);
  const [showChannelsLayer, setShowChannelsLayer] = useState(true);

  if (!scenario || !scenario.metadata) {
    return <div className="h-full w-full flex items-center justify-center bg-space-900 text-slate-400">Loading map...</div>;
  }

  const center = scenario.metadata.center || { lat: 30.535, lon: 79.565 };
  const dryRidges = scenario.dry_ridges || [];
  const rescueChannels = scenario.rescue_channels || [];

  return (
    <div className="relative h-full w-full">
      {/* Layer Visibility Controls Pill */}
      <div className="absolute top-4 right-4 z-[400] bg-space-900/90 border border-space-700/80 rounded-lg p-2 text-xs flex flex-col gap-1.5 shadow-xl backdrop-blur select-none">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1 pb-1 border-b border-space-700/60 text-[11px]">
          <Layers className="w-3.5 h-3.5 text-navic-orange" />
          <span>Map Overlays</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showDopLayer}
            onChange={(e) => setShowDopLayer(e.target.checked)}
            className="rounded accent-navic-green"
          />
          <span>Nav Fix Heatmap ({mode.toUpperCase()})</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showFloodLayer}
            onChange={(e) => setShowFloodLayer(e.target.checked)}
            className="rounded accent-blue-500"
          />
          <span>SAR Flood Depth (EOS-04)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showRidgesLayer}
            onChange={(e) => setShowRidgesLayer(e.target.checked)}
            className="rounded accent-emerald-500"
          />
          <span>Dry Ridges (Cartosat-1)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showChannelsLayer}
            onChange={(e) => setShowChannelsLayer(e.target.checked)}
            className="rounded accent-cyan-500"
          />
          <span>Rescue Channels</span>
        </label>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-[400] bg-space-900/90 border border-space-700/80 rounded-xl p-3 text-xs shadow-xl backdrop-blur select-none max-w-xs">
        <div className="font-semibold text-slate-200 text-xs mb-2">Live Map Legend</div>
        
        {/* DOP / Positioning Status Legend */}
        <div className="space-y-1 mb-2.5">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Positioning Fix Quality</div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-navic-green" />
            <span className="text-slate-200 font-medium">Target Fix (&lt;5m error)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-navic-yellow" />
            <span className="text-slate-300">Degraded Fix (5–15m error)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-navic-red" />
            <span className="text-slate-300">No Fix / High GDOP (&gt;15m)</span>
          </div>
        </div>

        {/* Flood Depth Legend */}
        <div className="space-y-1 pt-2 border-t border-space-700/60">
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
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span className="text-slate-300">SAR-Verified Dry Ridge</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapRecenter center={center} />

        {/* Dark CartoDB Matter Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> & ISRO NRSC'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
            let fillColor = '#FF1744'; // Red default (No Fix / High GDOP)
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

        {/* 3. Rescue Channels (Ambulance & Boat Routes) */}
        {showChannelsLayer &&
          rescueChannels.map((channel) => {
            const isAmbulance = channel.channel_type === 'ambulance';
            const color = isAmbulance ? '#FFA000' : '#00E5FF';
            const positions = channel.waypoints.map((wp) => [wp.lat, wp.lon]);

            return (
              <Polyline
                key={channel.id}
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: 3.5,
                  dashArray: '6, 6',
                  opacity: 0.85
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs">
                    <strong>{channel.name}</strong>
                    <br />
                    Type: {channel.channel_type.toUpperCase()} · Max Depth: {channel.max_depth_m}m
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* 4. Dry Ridge Staging Nodes */}
        {showRidgesLayer &&
          dryRidges.map((ridge) => {
            return (
              <Marker
                key={ridge.id}
                position={[ridge.lat, ridge.lon]}
                icon={dryRidgeIcon}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 text-xs text-slate-200">
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <Mountain className="w-3.5 h-3.5" />
                      <span>{ridge.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {ridge.description}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Elevation: <strong>{ridge.elevation_m}m</strong> (+{ridge.height_above_flood_m}m above flood)
                      <br />
                      Recommended Tether: <strong>{ridge.recommended_tether_height_m}m</strong>
                    </div>
                    <button
                      onClick={() => onDeployToRidge(ridge)}
                      className="w-full mt-2 py-1 px-2 rounded bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-[11px] hover:brightness-110 shadow"
                    >
                      Deploy Tethered Drone Here
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* 5. Draggable Tethered Drone Beacon (Mode 02) */}
        {beacon && (
          <>
            {/* Tether line from ground anchor to drone position */}
            <Polyline
              positions={[
                [beacon.lat, beacon.lon],
                [beacon.lat, beacon.lon]
              ]}
              pathOptions={{ color: '#FF6F00', weight: 2 }}
            />

            {/* Drone Line-of-Sight Coverage Radius */}
            <Circle
              center={[beacon.lat, beacon.lon]}
              radius={7000} // ~7 km effective LoS
              pathOptions={{
                fillColor: '#FF6F00',
                fillOpacity: 0.05,
                color: '#FF6F00',
                weight: 1.5,
                dashArray: '4, 8'
              }}
            />

            {/* Draggable Drone Marker */}
            <Marker
              position={[beacon.lat, beacon.lon]}
              icon={createDroneIcon(beacon.height_m)}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const latlng = e.target.getLatLng();
                  onUpdateBeaconPosition(latlng.lat, latlng.lng);
                }
              }}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs text-slate-200">
                  <div className="font-bold text-navic-orange flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Tethered Drone Pseudolite</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Drag this marker to test arbitrary beacon deployment positions in real-time.
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Lat: {beacon.lat.toFixed(4)}° · Lon: {beacon.lon.toFixed(4)}°
                    <br />
                    Tether Height: <strong>{beacon.height_m} m</strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}

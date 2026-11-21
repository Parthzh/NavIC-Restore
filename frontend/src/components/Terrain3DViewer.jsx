import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Eye, 
  Layers, 
  RotateCw, 
  Compass, 
  Radio, 
  Droplet, 
  ShieldCheck, 
  Mountain, 
  Satellite, 
  Maximize2 
} from 'lucide-react';

export default function Terrain3DViewer({
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
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const objectsRef = useRef({
    terrainMesh: null,
    waterMesh: null,
    droneGroup: null,
    ridgeMarkers: [],
    satelliteGroup: null,
    beamsGroup: null,
    selectedPin: null,
    waterTime: 0
  });

  // Display toggles
  const [viewStyle, setViewStyle] = useState('satellite'); // 'satellite' | 'dop_heatmap'
  const [showWater, setShowWater] = useState(true);
  const [showBeams, setShowBeams] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 1. Calculate Bounding Box & Coordinate Normalizer
  const bounds = useMemo(() => {
    if (!scenario?.grid || scenario.grid.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    let minElev = Infinity, maxElev = -Infinity;
    let maxFlood = 0;

    scenario.grid.forEach(c => {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lon < minLon) minLon = c.lon;
      if (c.lon > maxLon) maxLon = c.lon;
      if (c.elevation_m < minElev) minElev = c.elevation_m;
      if (c.elevation_m > maxElev) maxElev = c.elevation_m;
      if (c.flood_depth_m > maxFlood) maxFlood = c.flood_depth_m;
    });

    const isMountain = (maxElev - minElev) > 100;
    const terrainHeightScale = isMountain ? 34.0 : 8.0;

    return {
      minLat, maxLat, minLon, maxLon,
      minElev, maxElev,
      maxFlood,
      terrainHeightScale,
      isMountain,
      latSpan: maxLat - minLat || 0.01,
      lonSpan: maxLon - minLon || 0.01,
      elevSpan: maxElev - minElev || 1.0
    };
  }, [scenario]);

  // Convert (lat, lon, elev) to Three.js World Vector (x, y, z)
  const toWorldCoords = (lat, lon, elev = null) => {
    if (!bounds) return new THREE.Vector3();
    const nx = (lon - bounds.minLon) / bounds.lonSpan - 0.5;
    const nz = (lat - bounds.minLat) / bounds.latSpan - 0.5;
    
    // Scale to [-50, 50] in X and Z
    const worldX = nx * 100.0;
    const worldZ = -nz * 100.0; // Invert Z so North is -Z
    
    let worldY = 0;
    if (elev !== null) {
      const ne = (elev - bounds.minElev) / bounds.elevSpan;
      worldY = Math.max(0, ne * bounds.terrainHeightScale);
    }
    return new THREE.Vector3(worldX, worldY, worldZ);
  };

  // Convert World (x, z) to nearest scenario grid cell
  const findNearestCell = (worldX, worldZ) => {
    if (!scenario?.grid || !bounds) return null;
    const nx = (worldX / 100.0) + 0.5;
    const nz = (-worldZ / 100.0) + 0.5;
    const targetLon = bounds.minLon + nx * bounds.lonSpan;
    const targetLat = bounds.minLat + nz * bounds.latSpan;

    let nearest = null;
    let minDist = Infinity;
    for (const c of scenario.grid) {
      const d = Math.hypot(c.lat - targetLat, c.lon - targetLon);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    }
    return nearest;
  };

  // 2. Generate Photorealistic / Heatmap Canvas Texture
  const generateTerrainTexture = useMemo(() => {
    if (!bounds || !scenario?.grid) return null;

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create a 2D lookup map of grid data
    const cols = 64;
    const rows = 64;

    // Background base
    ctx.fillStyle = bounds.isMountain ? '#2B3138' : '#2D4436';
    ctx.fillRect(0, 0, size, size);

    // Render cells onto texture
    scenario.grid.forEach(cell => {
      const u = (cell.lon - bounds.minLon) / bounds.lonSpan;
      const v = 1.0 - (cell.lat - bounds.minLat) / bounds.latSpan;
      const x = u * size;
      const y = v * size;
      const cellSize = (size / 15) * 1.5;

      const normElev = (cell.elevation_m - bounds.minElev) / bounds.elevSpan;

      let cellColor;
      if (viewStyle === 'dop_heatmap') {
        // Find matching DOP result
        const dop = dopGrid?.find(d => Math.abs(d.lat - cell.lat) < 0.003 && Math.abs(d.lon - cell.lon) < 0.003);
        if (!dop || dop.status === 'NO_FIX') {
          cellColor = 'rgba(239, 68, 68, 0.75)'; // Red NO FIX
        } else if (dop.status === 'FIX_DEGRADED') {
          cellColor = 'rgba(249, 115, 22, 0.75)'; // Orange
        } else if (dop.status === 'FIX_USABLE') {
          cellColor = 'rgba(234, 179, 8, 0.75)'; // Yellow
        } else {
          cellColor = 'rgba(16, 185, 129, 0.85)'; // Green FIX OPTIMAL
        }
      } else {
        // Photorealistic Satellite Terrain Palette
        if (bounds.isMountain) {
          if (normElev > 0.78) {
            // Snow-dusted high Himalayan granite peaks
            cellColor = '#B8C2CC';
          } else if (normElev > 0.55) {
            // Rugged rock & slate cliffs
            cellColor = '#59616A';
          } else if (normElev > 0.28) {
            // Himalayan pine & cedar forested slopes
            cellColor = '#2F4538';
          } else {
            // River gorge canyon floor (gravel & stone)
            cellColor = '#483E34';
          }
        } else {
          // River Floodplain Palette
          if (cell.is_flooded) {
            cellColor = cell.passable_type === 'ambulance_passable' ? '#264D47' : '#1A3340';
          } else if (normElev > 0.6) {
            cellColor = '#5A6E46'; // Elevated levee
          } else {
            cellColor = '#3A4E38'; // Plain agricultural field
          }
        }
      }

      const grad = ctx.createRadialGradient(x, y, 2, x, y, cellSize);
      grad.addColorStop(0, cellColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, cellSize, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Topographic Contour Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let c = 50; c < size; c += 80) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, c, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Coordinate Grid Lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = step; i < size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Add ISRO Bhoonidhi / Bhuvan Watermark overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = '14px monospace';
    ctx.fillText('ISRO Bhuvan Cartosat-1 DEM (2.5m) · EOS-04 SAR Ground Truth', 24, size - 24);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, [scenario, dopGrid, viewStyle, bounds]);

  // 3. Initialize Three.js Scene, Camera, Lights, OrbitControls
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !bounds) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913); // Deep Space / Tactical Blue-Black
    scene.fog = new THREE.FogExp2(0x060913, 0.004);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.5,
      1500
    );
    camera.position.set(0, 65, 95);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05; // Don't go below ground
    controls.minDistance = 15;
    controls.maxDistance = 240;
    controls.target.set(0, bounds.terrainHeightScale * 0.35, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xddeeff, 0.7);
    scene.add(ambientLight);

    // Directional Sunlight (Simulates morning Indian sunlight casting dramatic valley shadows)
    const sunLight = new THREE.DirectionalLight(0xfff7e6, 1.8);
    sunLight.position.set(70, 110, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Tactical Rim Light (Neon Blue edge glow)
    const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.6);
    rimLight.position.set(-80, 40, -80);
    scene.add(rimLight);

    // Grid Floor Boundary
    const gridHelper = new THREE.GridHelper(120, 24, 0x00e5ff, 0x1e293b);
    gridHelper.position.y = -0.2;
    scene.add(gridHelper);

    // 4. Construct 3D Terrain Surface Mesh
    const terrainRes = 60; // 60x60 smooth interpolated surface
    const terrainGeo = new THREE.PlaneGeometry(100, 100, terrainRes, terrainRes);
    terrainGeo.rotateX(-Math.PI / 2); // Lay flat on X-Z plane

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);

      // Find normalized coordinate in [0, 1]
      const nx = (wx / 100.0) + 0.5;
      const nz = (-wz / 100.0) + 0.5;
      const targetLon = bounds.minLon + nx * bounds.lonSpan;
      const targetLat = bounds.minLat + nz * bounds.latSpan;

      // Inverse Distance Weighting interpolation of elevation from scenario grid
      let weightSum = 0;
      let elevSum = 0;
      for (const cell of scenario.grid) {
        const d2 = (cell.lat - targetLat) ** 2 + (cell.lon - targetLon) ** 2;
        if (d2 < 0.00000001) {
          elevSum = cell.elevation_m;
          weightSum = 1;
          break;
        }
        const w = 1.0 / (d2 + 0.00001);
        elevSum += cell.elevation_m * w;
        weightSum += w;
      }
      const elev = elevSum / weightSum;
      const normE = (elev - bounds.minElev) / bounds.elevSpan;
      const wy = Math.max(0, normE * bounds.terrainHeightScale);
      pos.setY(i, wy);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: generateTerrainTexture,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);
    objectsRef.current.terrainMesh = terrainMesh;

    // 5. Construct 3D Volumetric Water Surface
    if (showWater) {
      // Find average elevation of flooded cells
      const floodedCells = scenario.grid.filter(c => c.is_flooded);
      if (floodedCells.length > 0) {
        const avgFloodElev = floodedCells.reduce((acc, c) => acc + c.elevation_m, 0) / floodedCells.length;
        const normWaterElev = (avgFloodElev - bounds.minElev) / bounds.elevSpan;
        const waterY = Math.max(0.4, (normWaterElev * bounds.terrainHeightScale) + 0.7);

        const waterGeo = new THREE.PlaneGeometry(98, 98, 32, 32);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMat = new THREE.MeshPhysicalMaterial({
          color: 0x0088dd,
          transparent: true,
          opacity: 0.72,
          roughness: 0.1,
          metalness: 0.25,
          transmission: 0.4,
          ior: 1.333 // Water index of refraction
        });

        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.position.y = waterY;
        scene.add(waterMesh);
        objectsRef.current.waterMesh = waterMesh;
      }
    }

    // 6. Build Candidate Dry Ridge Staging Pads
    objectsRef.current.ridgeMarkers = [];
    if (scenario.dry_ridges) {
      scenario.dry_ridges.forEach((ridge) => {
        const ridgeGroup = new THREE.Group();
        const rPos = toWorldCoords(ridge.lat, ridge.lon, ridge.elevation_m);

        // Landing Pad Cylinder
        const padGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.4, 16);
        const padMat = new THREE.MeshStandardMaterial({
          color: ridge.is_recommended ? 0xffb703 : 0x00e5ff,
          emissive: ridge.is_recommended ? 0xcc8800 : 0x008899,
          emissiveIntensity: 0.4,
          roughness: 0.3
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.copy(rPos);
        pad.position.y += 0.2;
        ridgeGroup.add(pad);

        // Glowing Pulsing Ring
        const ringGeo = new THREE.RingGeometry(2.6, 3.2, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ridge.is_recommended ? 0xffb703 : 0x00e5ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(rPos);
        ring.position.y += 0.25;
        ridgeGroup.add(ring);

        // Antenna Mast
        const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5);
        const mastMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.copy(rPos);
        mast.position.y += 1.75;
        ridgeGroup.add(mast);

        // Beacon Strobe light on top
        const strobeGeo = new THREE.SphereGeometry(0.35, 12, 12);
        const strobeMat = new THREE.MeshBasicMaterial({
          color: ridge.is_recommended ? 0xffea00 : 0x00ffff
        });
        const strobe = new THREE.Mesh(strobeGeo, strobeMat);
        strobe.position.copy(rPos);
        strobe.position.y += 3.6;
        ridgeGroup.add(strobe);

        scene.add(ridgeGroup);
        objectsRef.current.ridgeMarkers.push({ group: ridgeGroup, ridge, ring });
      });
    }

    // 7. Build 3D Tethered Drone Beacon Model
    const droneGroup = new THREE.Group();
    if (beacon) {
      const droneBasePos = toWorldCoords(beacon.lat, beacon.lon, beacon.elevation_m);
      const tetherHeightUnits = (beacon.height_m / 150.0) * 18.0 + 3.0;
      const droneAirPos = droneBasePos.clone().add(new THREE.Vector3(0, tetherHeightUnits, 0));

      // Drone Quadcopter Body
      const bodyGeo = new THREE.BoxGeometry(1.2, 0.35, 1.2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.copy(droneAirPos);
      droneGroup.add(body);

      // 4 Rotor Arms + Glowing Propellers
      const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4);
      armGeo.rotateZ(Math.PI / 2);
      const arm1 = new THREE.Mesh(armGeo, bodyMat);
      arm1.position.copy(droneAirPos);
      arm1.rotateY(Math.PI / 4);
      const arm2 = new THREE.Mesh(armGeo, bodyMat);
      arm2.position.copy(droneAirPos);
      arm2.rotateY(-Math.PI / 4);
      droneGroup.add(arm1, arm2);

      // Central Signal Emitter Sphere (Green pulse when Mode 02)
      const emitterGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const emitterMat = new THREE.MeshBasicMaterial({
        color: mode === 'pseudolite' ? 0x10b981 : 0xf97316
      });
      const emitter = new THREE.Mesh(emitterGeo, emitterMat);
      emitter.position.copy(droneAirPos);
      droneGroup.add(emitter);

      // Glowing Tether Cable connecting drone to ground anchor
      const tetherCurve = new THREE.LineCurve3(droneBasePos, droneAirPos);
      const tetherGeo = new THREE.TubeGeometry(tetherCurve, 16, 0.06, 6, false);
      const tetherMat = new THREE.MeshBasicMaterial({
        color: mode === 'pseudolite' ? 0x10b981 : 0xffb703,
        transparent: true,
        opacity: 0.95
      });
      const tether = new THREE.Mesh(tetherGeo, tetherMat);
      droneGroup.add(tether);

      // Expanding Spherical Signal Transmission Wave
      const waveGeo = new THREE.SphereGeometry(18, 24, 24);
      const waveMat = new THREE.MeshBasicMaterial({
        color: mode === 'pseudolite' ? 0x10b981 : 0xf97316,
        wireframe: true,
        transparent: true,
        opacity: 0.14
      });
      const wave = new THREE.Mesh(waveGeo, waveMat);
      wave.position.copy(droneAirPos);
      droneGroup.add(wave);

      scene.add(droneGroup);
      objectsRef.current.droneGroup = droneGroup;
    }

    // 8. Build NavIC Satellites in 3D Sky Dome & Laser Beams
    const satGroup = new THREE.Group();
    const beamsGroup = new THREE.Group();

    if (showSatellites && satellites && satellites.length > 0) {
      satellites.forEach((sat, idx) => {
        // Position satellites in high sky dome around the mountain valley
        const azRad = (sat.azimuth_deg * Math.PI) / 180;
        const elRad = (sat.elevation_deg * Math.PI) / 180;
        const skyRadius = 90.0;

        const satX = skyRadius * Math.cos(elRad) * Math.sin(azRad);
        const satY = skyRadius * Math.sin(elRad) + 20.0;
        const satZ = -skyRadius * Math.cos(elRad) * Math.cos(azRad);

        const satMeshGroup = new THREE.Group();
        satMeshGroup.position.set(satX, satY, satZ);

        // Satellite Body
        const satBodyGeo = new THREE.BoxGeometry(2.0, 1.2, 1.2);
        const satBodyMat = new THREE.MeshStandardMaterial({
          color: sat.is_active ? 0x00e5ff : 0x64748b,
          metalness: 0.8,
          roughness: 0.2
        });
        const satBody = new THREE.Mesh(satBodyGeo, satBodyMat);
        satMeshGroup.add(satBody);

        // Solar Panels
        const panelGeo = new THREE.BoxGeometry(4.5, 0.05, 1.2);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.1 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 0, 0);
        satMeshGroup.add(panel);

        satGroup.add(satMeshGroup);

        // Line-of-sight Laser Beams down to the valley
        if (showBeams && sat.is_active) {
          const valleyCenter = new THREE.Vector3(0, bounds.terrainHeightScale * 0.2, 0);
          
          // Mountain canyon horizon blockage check: if elevation < 28°, beam hits canyon wall!
          const isBlocked = bounds.isMountain && sat.elevation_deg < 28.0;

          const beamColor = isBlocked ? 0xef4444 : 0x10b981; // Red if blocked by mountain, Green if clear
          const targetPoint = isBlocked ? new THREE.Vector3(satX * 0.4, bounds.terrainHeightScale * 0.9, satZ * 0.4) : valleyCenter;

          const beamCurve = new THREE.LineCurve3(satMeshGroup.position, targetPoint);
          const beamGeo = new THREE.TubeGeometry(beamCurve, 12, isBlocked ? 0.12 : 0.08, 6, false);
          const beamMat = new THREE.MeshBasicMaterial({
            color: beamColor,
            transparent: true,
            opacity: isBlocked ? 0.75 : 0.35
          });
          const beam = new THREE.Mesh(beamGeo, beamMat);
          beamsGroup.add(beam);
        }
      });
    }

    scene.add(satGroup);
    scene.add(beamsGroup);
    objectsRef.current.satelliteGroup = satGroup;
    objectsRef.current.beamsGroup = beamsGroup;

    // 9. Animation Loop (60 FPS)
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle OrbitControls damping
      controls.update();

      // Auto-Rotate for Cinematic Hackathon Pitch
      if (autoRotate) {
        scene.rotation.y += delta * 0.12;
      } else {
        scene.rotation.y = 0;
      }

      // Water Ripple Animation
      if (objectsRef.current.waterMesh) {
        objectsRef.current.waterTime += delta * 1.5;
        const wPos = objectsRef.current.waterMesh.geometry.attributes.position;
        for (let i = 0; i < wPos.count; i++) {
          const u = wPos.getX(i);
          const v = wPos.getY(i);
          const wave = Math.sin(u * 0.3 + objectsRef.current.waterTime) * 0.18 + Math.cos(v * 0.3 + objectsRef.current.waterTime * 0.8) * 0.18;
          wPos.setZ(i, wave);
        }
        objectsRef.current.waterMesh.geometry.attributes.position.needsUpdate = true;
      }

      // Pulse Dry Ridge Rings
      objectsRef.current.ridgeMarkers.forEach(({ ring }, idx) => {
        const s = 1.0 + Math.sin(elapsed * 2.5 + idx) * 0.15;
        ring.scale.set(s, s, s);
      });

      // Drone Rotor Spinning & Subtle Hovering Bobbing
      if (objectsRef.current.droneGroup) {
        const hoverOffset = Math.sin(elapsed * 3.0) * 0.3;
        objectsRef.current.droneGroup.children[0].position.y += hoverOffset * 0.02;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 10. Raycasting (Click to inspect terrain cell or deploy drone)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(terrainMesh);

      if (intersects.length > 0) {
        const hit = intersects[0].point;
        const cell = findNearestCell(hit.x, hit.z);
        if (cell) {
          onSelectCell?.(cell);
          setHoveredPoint({
            ...cell,
            worldX: hit.x,
            worldY: hit.y,
            worldZ: hit.z
          });
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, [scenario, bounds, generateTerrainTexture, showWater, showBeams, showSatellites, autoRotate, mode, beacon, satellites]);

  // Preset Camera Angles
  const setCameraView = (type) => {
    if (!controlsRef.current || !rendererRef.current) return;
    const controls = controlsRef.current;
    if (type === 'frontal') {
      controls.object.position.set(0, 50, 95);
      controls.target.set(0, bounds?.terrainHeightScale * 0.3 || 10, 0);
    } else if (type === 'top_down') {
      controls.object.position.set(0, 130, 0.1);
      controls.target.set(0, 0, 0);
    } else if (type === 'drone') {
      if (beacon) {
        const bPos = toWorldCoords(beacon.lat, beacon.lon, beacon.elevation_m);
        controls.object.position.set(bPos.x + 18, bPos.y + 12, bPos.z + 18);
        controls.target.set(bPos.x, bPos.y + 4, bPos.z);
      }
    }
    controls.update();
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating View Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 items-center bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/80 shadow-2xl">
        <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-slate-700 text-xs font-semibold text-emerald-400">
          <Mountain className="w-4 h-4" />
          <span>3D Bhuvan DEM</span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
          <button
            onClick={() => setViewStyle('satellite')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewStyle === 'satellite' ? 'bg-cyan-500 text-slate-950 font-semibold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            Satellite Surface
          </button>
          <button
            onClick={() => setViewStyle('dop_heatmap')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewStyle === 'dop_heatmap' ? 'bg-emerald-500 text-slate-950 font-semibold shadow' : 'text-slate-300 hover:text-white'
            }`}
          >
            GPS Fix Heatmap
          </button>
        </div>

        {/* Camera Preset Quick-Pills */}
        <button
          onClick={() => setCameraView('frontal')}
          className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition"
          title="Frontal Canyon View"
        >
          Canyon Angle
        </button>
        <button
          onClick={() => setCameraView('drone')}
          className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition"
          title="Close-up on Drone"
        >
          Drone Staging
        </button>
        <button
          onClick={() => setCameraView('top_down')}
          className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition"
          title="Top Down Tactical View"
        >
          Top Down
        </button>

        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition ${
            autoRotate 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Auto-rotate 3D terrain"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
          <span>Cinematic Orbit</span>
        </button>
      </div>

      {/* Layer Toggles Pill (Top Right) */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 items-center bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs shadow-2xl">
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showWater}
            onChange={(e) => setShowWater(e.target.checked)}
            className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-0"
          />
          <Droplet className="w-3.5 h-3.5 text-cyan-400" />
          <span>Floodwater (SAR)</span>
        </label>
        <span className="text-slate-600">|</span>
        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
          <input
            type="checkbox"
            checked={showBeams}
            onChange={(e) => setShowBeams(e.target.checked)}
            className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
          />
          <Satellite className="w-3.5 h-3.5 text-emerald-400" />
          <span>NavIC Beams</span>
        </label>
      </div>

      {/* Bottom Left Legend HUD */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs space-y-2 max-w-xs">
        <div className="flex items-center justify-between text-slate-200 font-semibold border-b border-slate-800 pb-1.5">
          <span>Terrain & Flood Legend</span>
          <span className="text-[10px] text-cyan-400 font-mono">Bhuvan + EOS-04</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/50"></span>
            <span className="text-slate-300">Shallow (&lt;0.3m, Ambulance)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-700 shadow-sm shadow-blue-700/50"></span>
            <span className="text-slate-300">Deep (&gt;0.5m, Rescue Boat)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 ring-2 ring-amber-400/30"></span>
            <span className="text-slate-300 font-medium text-amber-300">Dry Ridge (0.00m Water)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
            <span className="text-slate-300">Target Sub-5m Fix</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
          <span>Drag mouse to Orbit · Scroll to Zoom</span>
          <span className="text-emerald-400 font-mono">60 FPS WebGL</span>
        </div>
      </div>

      {/* Hovered / Clicked Point Telemetry Card (Bottom Center) */}
      {hoveredPoint && (
        <div className="absolute bottom-4 right-4 z-10 bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-cyan-500/40 shadow-2xl text-xs w-64 space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-cyan-300 font-semibold">
            <span>Terrain Point Inspected</span>
            <button onClick={() => setHoveredPoint(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-300 text-[11px]">
            <div>Lat: <span className="font-mono text-white">{hoveredPoint.lat.toFixed(3)}°</span></div>
            <div>Lon: <span className="font-mono text-white">{hoveredPoint.lon.toFixed(3)}°</span></div>
            <div>Elevation: <span className="font-mono text-emerald-400">{hoveredPoint.elevation_m.toFixed(1)}m</span></div>
            <div>Flood Depth: <span className={`font-mono ${hoveredPoint.flood_depth_m > 0 ? 'text-cyan-400' : 'text-amber-400'}`}>{hoveredPoint.flood_depth_m.toFixed(2)}m</span></div>
            <div className="col-span-2">
              Horizon Blockage: <span className="font-mono text-rose-400">{hoveredPoint.horizon_mask_deg?.toFixed(1) || '0.0'}° mountain shadow</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

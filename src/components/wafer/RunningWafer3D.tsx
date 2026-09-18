import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Box,
  Eye,
  Zap,
  Play,
  Pause,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Scan,
  Compass,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Wafer, Die } from '../../types';

interface RunningWafer3DProps {
  wafer: Wafer;
  onSelectDie?: (die: Die) => void;
  activeLayerId?: string;
  onLayerChange?: (layerId: string) => void;
}

export const RunningWafer3D: React.FC<RunningWafer3DProps> = ({
  wafer,
  onSelectDie,
  activeLayerId,
  onLayerChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentLayerId, setCurrentLayerId] = useState<string>(activeLayerId || 'composite');
  const [isLaserScanning, setIsLaserScanning] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [elevatedMode, setElevatedMode] = useState<boolean>(true);
  const [showDefectsOnly, setShowDefectsOnly] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'iso' | 'top' | 'grazing' | 'beam'>('iso');
  const [hoveredDie, setHoveredDie] = useState<Die | null>(null);

  // Live Telemetry state updated by laser animation loop
  const [scanTelemetry, setScanTelemetry] = useState<{
    laserX: number;
    scannedDiesCount: number;
    activeDefectsHit: number;
    sweepCycle: number;
    scanSpeedMmS: number;
  }>({
    laserX: 0,
    scannedDiesCount: 0,
    activeDefectsHit: 0,
    sweepCycle: 1,
    scanSpeedMmS: 1250,
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const waferGroupRef = useRef<THREE.Group | null>(null);
  const diesGroupRef = useRef<THREE.Group | null>(null);
  const laserBeamRef = useRef<THREE.Group | null>(null);
  const dieMeshMapRef = useRef<Map<string, { mesh: THREE.Mesh; die: Die }>>(new Map());

  // Layer data
  const selectedLayerRun = wafer.layers?.find((l) => l.layerConfig.id === currentLayerId);
  const activeDies = selectedLayerRun ? selectedLayerRun.dies : wafer.dies;
  const activeYield = selectedLayerRun ? selectedLayerRun.dieYield : wafer.dieYield;
  const activeDefectRate = selectedLayerRun ? selectedLayerRun.defectRate : wafer.defectRate;

  const handleLayerSelect = (newLayerId: string) => {
    setCurrentLayerId(newLayerId);
    if (onLayerChange) onLayerChange(newLayerId);
  };

  // Setup Three.js
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 480;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0f1d'); // High-tech dark inspection chamber
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 140, 210);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // Key light (Inspection halogen)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(100, 180, 100);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Blue rim light (cleanroom edge highlights)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rimLight.position.set(-100, 60, -100);
    scene.add(rimLight);

    // Cyan laser accent light from above
    const laserTopLight = new THREE.PointLight(0x06b6d4, 1.5, 250);
    laserTopLight.position.set(0, 100, 0);
    scene.add(laserTopLight);

    // 5. Circular Chuck Base / Stage
    const stageGeom = new THREE.CylinderGeometry(85, 92, 12, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
    });
    const stageMesh = new THREE.Mesh(stageGeom, stageMat);
    stageMesh.position.y = -7.5;
    stageMesh.receiveShadow = true;
    scene.add(stageMesh);

    // Chuck Vacuum ring
    const vacuumRingGeom = new THREE.RingGeometry(72, 75, 64);
    const vacuumRingMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide });
    const vacuumRing = new THREE.Mesh(vacuumRingGeom, vacuumRingMat);
    vacuumRing.rotation.x = -Math.PI / 2;
    vacuumRing.position.y = -1.4;
    scene.add(vacuumRing);

    // Chuck Grid
    const chuckGrid = new THREE.GridHelper(260, 26, 0x334155, 0x1e293b);
    chuckGrid.position.y = -13.5;
    scene.add(chuckGrid);

    // 6. Wafer Group (Rotates and holds substrate and dies)
    const waferGroup = new THREE.Group();
    scene.add(waferGroup);
    waferGroupRef.current = waferGroup;

    // Substrate Disc
    const substrateGeom = new THREE.CylinderGeometry(65, 65, 1.8, 64);
    const substrateMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.2,
      envMapIntensity: 1.2,
    });
    const substrate = new THREE.Mesh(substrateGeom, substrateMat);
    substrate.position.y = -0.9;
    substrate.receiveShadow = true;
    waferGroup.add(substrate);

    // Silicon Bevel Ring
    const bevelGeom = new THREE.RingGeometry(63.5, 65, 64);
    const bevelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
    const bevelRing = new THREE.Mesh(bevelGeom, bevelMat);
    bevelRing.rotation.x = -Math.PI / 2;
    bevelRing.position.y = 0.05;
    waferGroup.add(bevelRing);

    // Wafer Notch (SEMI standard alignment notch)
    const notchGeom = new THREE.ConeGeometry(2.5, 4.5, 16);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const notchMesh = new THREE.Mesh(notchGeom, notchMat);
    notchMesh.rotation.x = Math.PI / 2;
    notchMesh.position.set(0, 0, 65);
    waferGroup.add(notchMesh);

    // Group for dies
    const diesGroup = new THREE.Group();
    waferGroup.add(diesGroup);
    diesGroupRef.current = diesGroup;

    // 7. Running Laser Scanner Head & Holographic Beam
    const laserGroup = new THREE.Group();
    scene.add(laserGroup);
    laserBeamRef.current = laserGroup;

    // Laser gantry rail (overhead)
    const railGeom = new THREE.BoxGeometry(160, 4, 8);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const railMesh = new THREE.Mesh(railGeom, railMat);
    railMesh.position.set(0, 52, 0);
    laserGroup.add(railMesh);

    // Laser optical emitter head
    const emitterGeom = new THREE.BoxGeometry(14, 10, 16);
    const emitterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.1 });
    const emitterMesh = new THREE.Mesh(emitterGeom, emitterMat);
    emitterMesh.position.set(0, 46, 0);
    laserGroup.add(emitterMesh);

    // Holographic Vertical Laser Sheet (Scan plane)
    const planeGeom = new THREE.PlaneGeometry(0.8, 46);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const laserPlane = new THREE.Mesh(planeGeom, planeMat);
    laserPlane.position.set(0, 23, 0);
    laserGroup.add(laserPlane);

    // High-intensity focal line at the wafer surface
    const lineGeom = new THREE.BoxGeometry(1.2, 0.4, 130);
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const focalLine = new THREE.Mesh(lineGeom, lineMat);
    focalLine.position.set(0, 0.2, 0);
    laserGroup.add(focalLine);

    // Laser Point Glow
    const scanLight = new THREE.PointLight(0x06b6d4, 2.5, 45);
    scanLight.position.set(0, 4, 0);
    laserGroup.add(scanLight);

    // Raycasting for die hover & click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(dieMeshMapRef.current.values()).map((v) => v.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const found = Array.from(dieMeshMapRef.current.values()).find((v) => v.mesh === intersects[0].object);
        if (found) {
          setHoveredDie(found.die);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredDie(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handleClick = () => {
      if (hoveredDie && onSelectDie) {
        onSelectDie(hoveredDie);
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    // Orbit Drag Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMoveDrag = (e: MouseEvent) => {
      if (!isDragging || !waferGroupRef.current) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      waferGroupRef.current.rotation.y += deltaX * 0.008;
      camera.position.y = Math.max(25, Math.min(260, camera.position.y + deltaY * 0.4));
      camera.lookAt(0, 0, 0);

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUpDrag = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = e.deltaY * 0.12;
      camera.position.z = Math.max(70, Math.min(380, camera.position.z + zoom));
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMoveDrag);
    window.addEventListener('mouseup', handleMouseUpDrag);

    // Animation Loop
    let animId: number;
    let laserDir = 1;
    let currentLaserX = -60;
    let sweepCount = 1;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Rotate Wafer
      if (autoRotate && waferGroupRef.current && !isDragging) {
        waferGroupRef.current.rotation.y += 0.0035;
      }

      // Move Laser Scanner back and forth
      if (isLaserScanning && laserBeamRef.current) {
        const speed = 48; // mm/s scaled to scene units
        currentLaserX += laserDir * speed * dt;

        if (currentLaserX > 62) {
          currentLaserX = 62;
          laserDir = -1;
          sweepCount++;
        } else if (currentLaserX < -62) {
          currentLaserX = -62;
          laserDir = 1;
          sweepCount++;
        }

        laserBeamRef.current.position.x = currentLaserX;

        // Calculate dies scanned by laser X threshold
        const totalDiesCount = activeDies.length;
        const normalizedX = (currentLaserX + 62) / 124; // 0 to 1
        const scannedNow = Math.min(totalDiesCount, Math.floor(normalizedX * totalDiesCount));
        const defectsHitNow = activeDies
          .slice(0, scannedNow)
          .filter((d) => d.status !== 'good').length;

        // Periodic state throttled
        if (Math.random() < 0.1) {
          setScanTelemetry({
            laserX: Math.round(currentLaserX * 2.3),
            scannedDiesCount: scannedNow,
            activeDefectsHit: defectsHitNow,
            sweepCycle: sweepCount,
            scanSpeedMmS: 1250,
          });
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      camera.aspect = newW / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMoveDrag);
      window.removeEventListener('mouseup', handleMouseUpDrag);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      renderer.dispose();
    };
  }, []);

  // Populate Die Meshes
  useEffect(() => {
    const group = diesGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    dieMeshMapRef.current.clear();

    const waferRadiusMm = wafer.waferDiameterMm / 2;
    const sceneScale = 65 / waferRadiusMm;
    const dieW = wafer.dieSizeMm.x * sceneScale;
    const dieH = wafer.dieSizeMm.y * sceneScale;

    activeDies.forEach((die) => {
      if (showDefectsOnly && die.status === 'good') return;

      const posX = die.posXmm * sceneScale;
      const posZ = die.posYmm * sceneScale;

      let colorHex = 0x10b981;
      let height = 0.5;

      switch (die.status) {
        case 'good':
          colorHex = 0x10b981;
          height = 0.4;
          break;
        case 'minor_concern':
          colorHex = 0x86efac;
          height = elevatedMode ? 1.0 : 0.4;
          break;
        case 'warning':
          colorHex = 0xeab308;
          height = elevatedMode ? 2.2 : 0.4;
          break;
        case 'probable_defect':
          colorHex = 0xf97316;
          height = elevatedMode ? 3.6 : 0.4;
          break;
        case 'severe_defect':
          colorHex = 0xef4444;
          height = elevatedMode ? 5.0 : 0.4;
          break;
      }

      const geom = new THREE.BoxGeometry(dieW * 0.9, height, dieH * 0.9);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.35,
        metalness: 0.25,
        emissive: die.status === 'severe_defect' ? 0x991b1b : 0x000000,
        emissiveIntensity: die.status === 'severe_defect' ? 0.4 : 0,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(posX, height / 2 + 0.05, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      group.add(mesh);
      dieMeshMapRef.current.set(die.id, { mesh, die });
    });
  }, [wafer, currentLayerId, elevatedMode, showDefectsOnly]);

  const setCameraPerspective = (mode: 'iso' | 'top' | 'grazing' | 'beam') => {
    setCameraMode(mode);
    if (!cameraRef.current || !waferGroupRef.current) return;
    const cam = cameraRef.current;
    waferGroupRef.current.rotation.y = 0;

    if (mode === 'iso') {
      cam.position.set(0, 140, 210);
      cam.lookAt(0, 0, 0);
    } else if (mode === 'top') {
      cam.position.set(0, 270, 0.01);
      cam.lookAt(0, 0, 0);
    } else if (mode === 'grazing') {
      cam.position.set(0, 32, 175);
      cam.lookAt(0, 10, 0);
    } else if (mode === 'beam') {
      cam.position.set(70, 80, 80);
      cam.lookAt(0, 15, 0);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-5 space-y-4 text-white">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Scan className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                3D Running Wafer Scanner • {wafer.id}
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                {isLaserScanning ? 'SCANNING ACTIVE' : 'SCANNER IDLE'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-throughput 405nm optical laser topography scanning station with real-time defect elevation.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Layer Selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700">
            <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              value={currentLayerId}
              onChange={(e) => handleLayerSelect(e.target.value)}
              className="bg-transparent text-white font-medium text-xs border-none focus:outline-none cursor-pointer pr-1"
            >
              <option value="composite" className="bg-slate-900 text-white">
                Finished Wafer (Composite)
              </option>
              {(wafer.layers || []).map((l) => (
                <option key={l.layerConfig.id} value={l.layerConfig.id} className="bg-slate-900 text-white">
                  {l.layerConfig.shortCode} - {l.defectRate}% Defect
                </option>
              ))}
            </select>
          </div>

          {/* Perspective Buttons */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setCameraPerspective('iso')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                cameraMode === 'iso' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              45° Iso
            </button>
            <button
              onClick={() => setCameraPerspective('top')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                cameraMode === 'top' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Top Ortho
            </button>
            <button
              onClick={() => setCameraPerspective('grazing')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                cameraMode === 'grazing' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Grazing
            </button>
            <button
              onClick={() => setCameraPerspective('beam')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                cameraMode === 'beam' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Laser Cam
            </button>
          </div>

          <button
            onClick={() => setIsLaserScanning(!isLaserScanning)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLaserScanning
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLaserScanning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isLaserScanning ? 'Pause Laser' : 'Run Laser'}</span>
          </button>

          <button
            onClick={() => setElevatedMode(!elevatedMode)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              elevatedMode
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{elevatedMode ? '3D Topo' : 'Flat Dies'}</span>
          </button>

          <button
            onClick={() => setShowDefectsOnly(!showDefectsOnly)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showDefectsOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Defects Only</span>
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {autoRotate ? 'Rotate On' : 'Rotate Off'}
          </button>
        </div>
      </div>

      {/* Real-Time Laser Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 px-3.5 py-2.5 bg-slate-950/70 rounded-xl border border-slate-800 font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Beam Position X</span>
          <strong className="text-cyan-400">{scanTelemetry.laserX} mm</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Sweep Cycle</span>
          <strong className="text-white">#{scanTelemetry.sweepCycle}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Dies Scanned</span>
          <strong className="text-emerald-400">
            {scanTelemetry.scannedDiesCount} / {activeDies.length}
          </strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Defect Hits</span>
          <strong className="text-rose-400">{scanTelemetry.activeDefectsHit}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block uppercase">Active Yield</span>
          <strong className="text-emerald-400">{activeYield}%</strong>
        </div>
      </div>

      {/* 3D Canvas Mount with HUD overlays */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070b14] min-h-[480px]">
        <div ref={mountRef} className="w-full h-[480px]" />

        {/* Laser HUD Reticle Overlay */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] font-mono text-slate-300 pointer-events-none flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>LASER HEAD: 405nm CONTINUOUS SCAN</span>
        </div>

        {/* Die Inspection Hover Card */}
        {hoveredDie && (
          <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-mono text-white shadow-xl pointer-events-none space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-blue-400">{hoveredDie.id}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-sans uppercase ${
                  hoveredDie.status === 'good'
                    ? 'bg-emerald-950 text-emerald-300'
                    : hoveredDie.status === 'severe_defect'
                    ? 'bg-rose-950 text-rose-300'
                    : 'bg-amber-950 text-amber-300'
                }`}
              >
                {hoveredDie.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Coord: ({hoveredDie.posXmm}mm, {hoveredDie.posYmm}mm) • CD: {hoveredDie.measuredCD}nm
              {hoveredDie.defectReason && (
                <div className="text-rose-300 text-[10px] mt-0.5">Reason: {hoveredDie.defectReason}</div>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[10px] text-slate-300 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
            <span>Killer Defect</span>
          </div>
        </div>
      </div>
    </div>
  );
};

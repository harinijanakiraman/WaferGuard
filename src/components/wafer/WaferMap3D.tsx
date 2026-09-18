import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Layers,
  Box,
  Sliders,
  Eye,
  Info,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { Wafer, Die } from '../../types';

interface WaferMap3DProps {
  wafer: Wafer;
  selectedDie: Die | null;
  onSelectDie: (die: Die) => void;
  activeLayerId?: string;
  onLayerChange?: (layerId: string) => void;
}

export const WaferMap3D: React.FC<WaferMap3DProps> = ({
  wafer,
  selectedDie,
  onSelectDie,
  activeLayerId,
  onLayerChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [currentLayerId, setCurrentLayerId] = useState<string>(activeLayerId || 'composite');
  const [elevatedMode, setElevatedMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showDefectsOnly, setShowDefectsOnly] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [activeDieHover, setActiveDieHover] = useState<Die | null>(null);
  const [cameraMode, setCameraMode] = useState<'iso' | 'top' | 'grazing'>('iso');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const diesGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const dieMeshMapRef = useRef<Map<string, { mesh: THREE.Mesh; die: Die }>>(new Map());

  // Determine active dies to render
  const selectedLayerRun = wafer.layers?.find((l) => l.layerConfig.id === currentLayerId);
  const activeDies = selectedLayerRun ? selectedLayerRun.dies : wafer.dies;
  const activeDefectRate = selectedLayerRun ? selectedLayerRun.defectRate : wafer.defectRate;
  const activeYield = selectedLayerRun ? selectedLayerRun.dieYield : wafer.dieYield;

  const handleLayerSelect = (newLayerId: string) => {
    setCurrentLayerId(newLayerId);
    if (onLayerChange) onLayerChange(newLayerId);
  };

  // Set up Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 480;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 160, 220);
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

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.4);
    fillLight.position.set(-100, 100, -100);
    scene.add(fillLight);

    // 5. Silicon Wafer Substrate Disc
    const waferRadius = 80;
    const waferThickness = 2.5;
    const substrateGeom = new THREE.CylinderGeometry(waferRadius, waferRadius, waferThickness, 64);
    const substrateMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      roughness: 0.25,
      metalness: 0.7,
    });
    const waferSubstrate = new THREE.Mesh(substrateGeom, substrateMat);
    waferSubstrate.position.y = -waferThickness / 2;
    waferSubstrate.receiveShadow = true;
    scene.add(waferSubstrate);

    // Notch marker on substrate
    const notchGeom = new THREE.ConeGeometry(3, 6, 16);
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const notch = new THREE.Mesh(notchGeom, notchMat);
    notch.rotation.x = Math.PI / 2;
    notch.position.set(0, -waferThickness / 2, waferRadius - 1);
    scene.add(notch);

    // 6. Grid Helper
    const grid = new THREE.GridHelper(240, 24, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -waferThickness - 0.2;
    scene.add(grid);
    gridHelperRef.current = grid;

    // 7. Group for Die meshes
    const diesGroup = new THREE.Group();
    scene.add(diesGroup);
    diesGroupRef.current = diesGroup;

    // Raycasting for die selection
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
        const hit = Array.from(dieMeshMapRef.current.values()).find((v) => v.mesh === intersects[0].object);
        if (hit) {
          setActiveDieHover(hit.die);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setActiveDieHover(null);
      renderer.domElement.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(dieMeshMapRef.current.values()).map((v) => v.mesh);
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const hit = Array.from(dieMeshMapRef.current.values()).find((v) => v.mesh === intersects[0].object);
        if (hit) {
          onSelectDie(hit.die);
        }
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
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      diesGroup.rotation.y += deltaX * 0.008;
      waferSubstrate.rotation.y = diesGroup.rotation.y;
      notch.rotation.y = diesGroup.rotation.y;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUpDrag = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMoveDrag);
    window.addEventListener('mouseup', handleMouseUpDrag);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotate && !isDragging) {
        diesGroup.rotation.y += 0.003;
        waferSubstrate.rotation.y = diesGroup.rotation.y;
        notch.rotation.y = diesGroup.rotation.y;
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
      renderer.dispose();
    };
  }, [onSelectDie]);

  // Update die meshes whenever wafer, elevatedMode, or showDefectsOnly change
  useEffect(() => {
    const group = diesGroupRef.current;
    if (!group) return;

    // Clear previous dies
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    dieMeshMapRef.current.clear();

    const waferRadiusMm = wafer.waferDiameterMm / 2;
    const sceneScale = 80 / waferRadiusMm; // Scale mm to 3D scene units (waferRadius = 80)
    const dieW = wafer.dieSizeMm.x * sceneScale;
    const dieH = wafer.dieSizeMm.y * sceneScale;

    activeDies.forEach((die) => {
      if (showDefectsOnly && die.status === 'good') return;

      const posX = die.posXmm * sceneScale;
      const posZ = die.posYmm * sceneScale;

      // Status color in hex
      let colorHex = 0x22c55e;
      let heightExtrude = 0.5;

      switch (die.status) {
        case 'good':
          colorHex = 0x22c55e;
          heightExtrude = 0.6;
          break;
        case 'minor_concern':
          colorHex = 0x86efac;
          heightExtrude = 1.2;
          break;
        case 'warning':
          colorHex = 0xeab308;
          heightExtrude = 2.4;
          break;
        case 'probable_defect':
          colorHex = 0xf97316;
          heightExtrude = 4.0;
          break;
        case 'severe_defect':
          colorHex = 0xef4444;
          heightExtrude = 6.0;
          break;
      }

      if (!elevatedMode) {
        heightExtrude = 0.6;
      }

      const geom = new THREE.BoxGeometry(dieW * 0.92, heightExtrude, dieH * 0.92);
      const isCurrentSelected = selectedDie?.id === die.id;

      const mat = new THREE.MeshStandardMaterial({
        color: isCurrentSelected ? 0x2563eb : colorHex,
        roughness: 0.35,
        metalness: isCurrentSelected ? 0.4 : 0.15,
        emissive: isCurrentSelected ? 0x1d4ed8 : die.status === 'severe_defect' ? 0x881337 : 0x000000,
        emissiveIntensity: isCurrentSelected ? 0.4 : die.status === 'severe_defect' ? 0.35 : 0,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(posX, heightExtrude / 2, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      group.add(mesh);
      dieMeshMapRef.current.set(die.id, { mesh, die });
    });
  }, [wafer, currentLayerId, elevatedMode, showDefectsOnly, selectedDie]);

  // Update grid helper visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  const setCameraPerspective = (mode: 'iso' | 'top' | 'grazing') => {
    setCameraMode(mode);
    if (!cameraRef.current || !diesGroupRef.current) return;
    const cam = cameraRef.current;
    diesGroupRef.current.rotation.y = 0;

    if (mode === 'iso') {
      cam.position.set(0, 160, 220);
      cam.lookAt(0, 0, 0);
    } else if (mode === 'top') {
      cam.position.set(0, 260, 0.01);
      cam.lookAt(0, 0, 0);
    } else if (mode === 'grazing') {
      cam.position.set(0, 35, 180);
      cam.lookAt(0, 10, 0);
    }
  };

  const resetCamera = () => {
    setCameraPerspective('iso');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">3D Wafer Simulation &amp; Defect Topography</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
              Three.js Hardware Accelerated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Rotational 3D substrate visualization. Defect severity is mapped to die vertical elevation and color.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Layer Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-blue-600 ml-1" />
            <select
              value={currentLayerId}
              onChange={(e) => handleLayerSelect(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold text-xs border-none focus:outline-none cursor-pointer pr-2"
            >
              <option value="composite">Finished Wafer (Composite)</option>
              {(wafer.layers || []).map((l) => (
                <option key={l.layerConfig.id} value={l.layerConfig.id}>
                  {l.layerConfig.shortCode} ({l.layerConfig.category}) - {l.defectRate}% Defect
                </option>
              ))}
            </select>
          </div>

          {/* Camera Angles */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setCameraPerspective('iso')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                cameraMode === 'iso' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              45°
            </button>
            <button
              onClick={() => setCameraPerspective('top')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                cameraMode === 'top' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              Top
            </button>
            <button
              onClick={() => setCameraPerspective('grazing')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                cameraMode === 'grazing' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              Grazing
            </button>
          </div>

          <button
            onClick={() => setElevatedMode(!elevatedMode)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              elevatedMode
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{elevatedMode ? 'Elevated Topo' : 'Flat Dies'}</span>
          </button>

          <button
            onClick={() => setShowDefectsOnly(!showDefectsOnly)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showDefectsOnly
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Defects Only</span>
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {autoRotate ? 'Pause' : 'Rotate'}
          </button>

          <button
            onClick={resetCamera}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors"
            title="Reset Perspective"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer Metrology Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">
            {selectedLayerRun ? selectedLayerRun.layerConfig.name : 'Finished Wafer Stack (Composite)'}
          </span>
          {selectedLayerRun && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-sans font-semibold">
              {selectedLayerRun.layerConfig.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-slate-600">
          <span>Defect Rate: <strong className="text-rose-600">{activeDefectRate}%</strong></span>
          <span>Die Yield: <strong className="text-emerald-600">{activeYield}%</strong></span>
          {selectedLayerRun && (
            <>
              <span>Avg Overlay: <strong className="text-amber-600">{selectedLayerRun.overlayErrorAverageNm} nm</strong></span>
              <span>Target CD: <strong className="text-cyan-700">{selectedLayerRun.layerConfig.criticalFeatureNm} nm</strong></span>
            </>
          )}
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[480px]">
        <div ref={mountRef} className="w-full h-[480px]" />

        {/* 3D Disclaimer Overlay */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs text-[11px] text-slate-600 font-sans pointer-events-none">
          <span className="font-semibold text-slate-800">3D Simulation Note:</span> Spatial visualization for engineering review. Does not replace physical CD-SEM or prober metrology.
        </div>

        {/* Active Die Hover Pill */}
        {activeDieHover && (
          <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white px-3 py-2 rounded-lg text-xs font-mono shadow-md pointer-events-none border border-slate-700">
            <span className="font-bold text-blue-400">{activeDieHover.id}</span> • Status:{' '}
            <span className="uppercase text-amber-300">{activeDieHover.status.replace('_', ' ')}</span> • Elevation:{' '}
            {activeDieHover.elevation}mm
            {activeDieHover.overlayError !== undefined && (
              <span className="ml-2 text-slate-400">| Overlay: {activeDieHover.overlayError}nm</span>
            )}
          </div>
        )}

        {/* Controls Hint */}
        <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-mono bg-white/80 px-2.5 py-1 rounded border border-slate-200 pointer-events-none">
          Click &amp; Drag to Orbit • Click Die to Inspect
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { CleanroomZone } from '../../types';

interface Cleanroom3DProps {
  zones: CleanroomZone[];
  selectedZone: CleanroomZone | null;
  onSelectZone: (zone: CleanroomZone) => void;
  onNavigateToLayer?: () => void;
}

export const Cleanroom3D: React.FC<Cleanroom3DProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  onNavigateToLayer,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [timeHour, setTimeHour] = useState(14); // 08:00 to 20:00
  const [isPlayingTime, setIsPlayingTime] = useState(false);
  const [showAirflow, setShowAirflow] = useState(true);
  const [isSimulatedExcursion, setIsSimulatedExcursion] = useState(false);
  const [cameraView, setCameraView] = useState<'overview' | 'litho' | 'plenum'>('overview');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const airflowParticlesRef = useRef<THREE.Points | null>(null);
  const toolMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Time-based environmental factor
  const tempFluctuation = Math.sin((timeHour - 8) * 0.4) * 0.6;
  const particleFluctuation = isSimulatedExcursion
    ? 95
    : Math.max(0, Math.sin((timeHour - 11) * 0.5) * 25);

  useEffect(() => {
    let timer: number;
    if (isPlayingTime) {
      timer = window.setInterval(() => {
        setTimeHour((h) => (h >= 20 ? 8 : h + 1));
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlayingTime]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 75, 125);
    camera.lookAt(0, 5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Floor (Cleanroom conductive raised perforated tiles)
    const floorGeom = new THREE.PlaneGeometry(120, 90);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xecfdf5, // Cleanroom mint/white vinyl
      roughness: 0.2,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor tile grid lines
    const grid = new THREE.GridHelper(120, 24, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0.05;
    scene.add(grid);

    // Ceiling HEPA filter plane (wireframe)
    const ceilingGeom = new THREE.PlaneGeometry(120, 90, 12, 9);
    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0xcfd8dc,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 35;
    scene.add(ceiling);

    // Add Cleanroom Tools for each zone
    toolMeshesRef.current.clear();
    zones.forEach((zone) => {
      const toolGroup = new THREE.Group();

      // Tool main chassis
      const chassisGeom = new THREE.BoxGeometry(16, 12, 14);
      const isLitho = zone.id.includes('LITHO');
      const isSelected = selectedZone?.id === zone.id;

      const chassisMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0x2563eb : isLitho ? 0x0284c7 : 0x475569,
        roughness: 0.3,
        metalness: 0.4,
      });
      const chassis = new THREE.Mesh(chassisGeom, chassisMat);
      chassis.position.y = 6;
      chassis.castShadow = true;
      toolGroup.add(chassis);

      // Tool status light beacon on top
      const beaconGeom = new THREE.CylinderGeometry(1.2, 1.2, 3, 16);
      const beaconColor =
        zone.alertLevel === 'critical'
          ? 0xef4444
          : zone.alertLevel === 'warning'
          ? 0xf59e0b
          : 0x10b981;
      const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor });
      const beacon = new THREE.Mesh(beaconGeom, beaconMat);
      beacon.position.y = 13.5;
      toolGroup.add(beacon);

      // Litho specific optical column
      if (isLitho) {
        const columnGeom = new THREE.CylinderGeometry(3.5, 4, 10, 24);
        const columnMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          metalness: 0.8,
          roughness: 0.2,
        });
        const column = new THREE.Mesh(columnGeom, columnMat);
        column.position.y = 16;
        toolGroup.add(column);
      }

      // FOUP Load Port at front
      const foupGeom = new THREE.BoxGeometry(5, 4, 4);
      const foupMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 });
      const foup = new THREE.Mesh(foupGeom, foupMat);
      foup.position.set(0, 3, 8.5);
      toolGroup.add(foup);

      toolGroup.position.set(zone.coordinates.x * 5, 0, zone.coordinates.z * 5);
      scene.add(toolGroup);

      toolMeshesRef.current.set(zone.id, chassis);
    });

    // Airflow Particle Streams (Laminar downward clean flow)
    const particleCount = 200;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 110;
      positions[i + 1] = Math.random() * 35;
      positions[i + 2] = (Math.random() - 0.5) * 80;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.65,
    });
    const airflowParticles = new THREE.Points(particleGeom, particleMat);
    scene.add(airflowParticles);
    airflowParticlesRef.current = airflowParticles;

    // Raycasting for clicking tools
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(toolMeshesRef.current.values());
      const hits = raycaster.intersectObjects(meshes);

      if (hits.length > 0) {
        for (const [zoneId, mesh] of toolMeshesRef.current.entries()) {
          if (mesh === hits[0].object) {
            const found = zones.find((z) => z.id === zoneId);
            if (found) onSelectZone(found);
            break;
          }
        }
      }
    };

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

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      camera.position.x += deltaX * 0.2;
      camera.lookAt(0, 5, 0);
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Animate laminar airflow downward
      if (airflowParticlesRef.current && showAirflow) {
        const pos = airflowParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const speed = isSimulatedExcursion ? 0.65 : 0.35;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= speed;
          if (pos[i] < 0.2) {
            pos[i] = 34.5;
          }
        }
        airflowParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
    };
  }, [zones, selectedZone, onSelectZone, showAirflow, isSimulatedExcursion]);

  const setCameraPerspective = (view: 'overview' | 'litho' | 'plenum') => {
    setCameraView(view);
    if (!cameraRef.current) return;
    const cam = cameraRef.current;

    if (view === 'overview') {
      cam.position.set(0, 75, 125);
      cam.lookAt(0, 5, 0);
    } else if (view === 'litho') {
      cam.position.set(-20, 25, 35);
      cam.lookAt(-20, 8, 0);
    } else if (view === 'plenum') {
      cam.position.set(0, 110, 0.1);
      cam.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Cleanroom 3D Spatial Environment Simulation
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              Laminar Flow Active
            </span>
            {isSimulatedExcursion && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold animate-pulse">
                Excursion Alert
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visualization of cleanroom bays, HEPA air velocity vectors, and tool thermal footprints.
          </p>
        </div>

        {/* View toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Camera Angles */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setCameraPerspective('overview')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                cameraView === 'overview' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setCameraPerspective('litho')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                cameraView === 'litho' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              Litho Bay
            </button>
            <button
              onClick={() => setCameraPerspective('plenum')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                cameraView === 'plenum' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              Top Plenum
            </button>
          </div>

          <button
            onClick={() => setShowAirflow(!showAirflow)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showAirflow
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Airflow Particles</span>
          </button>

          <button
            onClick={() => setIsSimulatedExcursion(!isSimulatedExcursion)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSimulatedExcursion
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isSimulatedExcursion ? 'Reset Excursion' : 'Simulate Contamination'}</span>
          </button>

          <button
            onClick={() => setIsPlayingTime(!isPlayingTime)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPlayingTime
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isPlayingTime ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlayingTime ? 'Pause' : 'Play Timeline'}</span>
          </button>
        </div>
      </div>

      {/* Excursion Layer Correlation Banner if active */}
      {isSimulatedExcursion && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Contamination Excursion In Progress:</strong> EUV Bay 01 particle spike detected (95 p/m³). High risk of killer gate pinholes on <strong>Layer 3 (Poly / Gate HKMG)</strong> and shorting on <strong>Layer 4 (Contacts)</strong>.
            </span>
          </div>
          {onNavigateToLayer && (
            <button
              onClick={onNavigateToLayer}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors shrink-0 cursor-pointer"
            >
              Inspect Layer in 3D Stack →
            </button>
          )}
        </div>
      )}

      {/* 3D Canvas Mount */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[450px]">
        <div ref={mountRef} className="w-full h-[450px]" />

        {/* Simulation label */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-200 shadow-2xs text-[11px] text-slate-600 font-sans pointer-events-none">
          <span className="font-semibold text-slate-800">Environmental Simulation:</span> Click tool chassis to view sensor telemetry and excursion logs.
        </div>

        {/* Selected Zone Pill */}
        {selectedZone && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-sm text-xs font-mono max-w-xs space-y-1">
            <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
              <span>{selectedZone.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  selectedZone.alertLevel === 'normal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {selectedZone.alertLevel}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 font-sans">
              Tool: <strong>{selectedZone.activeTool}</strong>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>Temp: <strong className="text-slate-900">{selectedZone.temperatureC}°C</strong></div>
              <div>RH: <strong className="text-slate-900">{selectedZone.relativeHumidityPct}%</strong></div>
              <div>Particles: <strong className="text-slate-900">{selectedZone.particleCount} p/m³</strong></div>
              <div>Airflow: <strong className="text-slate-900">{selectedZone.airflowVelocityMps} m/s</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Time-Series Environmental Slider */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Cleanroom Shift Timeline:</span>
            <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
              {timeHour.toString().padStart(2, '0')}:00 HRS
            </span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Simulated 24-Hour Environmental Fluctuations
          </span>
        </div>

        <input
          type="range"
          min="8"
          max="20"
          step="1"
          value={timeHour}
          onChange={(e) => setTimeHour(parseInt(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-600" />
              <span className="text-slate-600">Ambient Temp:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {(21.2 + tempFluctuation).toFixed(2)} °C
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-600">Relative Humidity:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {(42.5 + tempFluctuation * 1.5).toFixed(1)} %
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-slate-600">Airborne Contam:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              {Math.round(18 + particleFluctuation)} part/m³
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

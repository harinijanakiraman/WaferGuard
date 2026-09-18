import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Layers,
  Box,
  Eye,
  Sliders,
  Maximize2,
  Sparkles,
  Zap,
  Info,
  ChevronRight,
  ChevronLeft,
  Filter,
  Scissors,
  Scan,
  Activity,
} from 'lucide-react';
import { Wafer, Die, WaferLayerRun } from '../../types';

interface MultiLayerWafer3DProps {
  wafer: Wafer;
  customLayers?: WaferLayerRun[];
  selectedLayerId?: string;
  onSelectLayer?: (layerId: string) => void;
  onSelectDie?: (die: Die) => void;
}

export const MultiLayerWafer3D: React.FC<MultiLayerWafer3DProps> = ({
  wafer,
  customLayers,
  selectedLayerId,
  onSelectLayer,
  onSelectDie,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const layers = customLayers && customLayers.length > 0 ? customLayers : wafer.layers || [];
  const totalLayers = layers.length;

  // Simulation & View Controls
  const [explodeRatio, setExplodeRatio] = useState<number>(totalLayers > 50 ? 0.35 : 0.75); // 0 to 1
  const [showPropagatedRays, setShowPropagatedRays] = useState<boolean>(true);
  const [showDefectsOnly, setShowDefectsOnly] = useState<boolean>(false);
  const [elevatedSeverity, setElevatedSeverity] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isWedgeCutaway, setIsWedgeCutaway] = useState<boolean>(false); // 90-degree internal cross section cutaway
  const [isLaserScanning, setIsLaserScanning] = useState<boolean>(true); // animated vertical laser tomography sheet
  const [activeCameraView, setActiveCameraView] = useState<'isometric' | 'top' | 'cross-section' | 'close-up'>('isometric');

  // Active layer index for depth scrubbing (0 to totalLayers - 1)
  const [activeLayerIndex, setActiveLayerIndex] = useState<number>(() => {
    if (selectedLayerId) {
      const idx = layers.findIndex((l) => l.layerConfig.id === selectedLayerId);
      if (idx !== -1) return idx;
    }
    return Math.min(2, totalLayers - 1);
  });

  const [visibleLayerIds, setVisibleLayerIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    layers.forEach((l) => {
      map[l.layerConfig.id] = true;
    });
    return map;
  });

  const [hoveredDie, setHoveredDie] = useState<{
    die: Die;
    layerName: string;
    layerCode: string;
    isPropagated: boolean;
  } | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const laserPlaneRef = useRef<THREE.Mesh | null>(null);
  const rayPillarsGroupRef = useRef<THREE.Group | null>(null);
  const activeDiesGroupRef = useRef<THREE.Group | null>(null);
  const dieMeshMapRef = useRef<Map<string, { mesh: THREE.Mesh; die: Die; layerName: string; layerCode: string }>>(new Map());

  // Synchronize active layer if selectedLayerId prop changes
  useEffect(() => {
    if (selectedLayerId) {
      const idx = layers.findIndex((l) => l.layerConfig.id === selectedLayerId);
      if (idx !== -1 && idx !== activeLayerIndex) {
        setActiveLayerIndex(idx);
      }
    }
  }, [selectedLayerId, layers]);

  // Set camera view preset
  const setCameraPreset = (preset: 'isometric' | 'top' | 'cross-section' | 'close-up') => {
    setActiveCameraView(preset);
    const camera = cameraRef.current;
    if (!camera) return;

    // Scale camera distance for stack size
    const zDist = totalLayers > 100 ? 320 : 220;
    const yDist = totalLayers > 100 ? 240 : 160;

    switch (preset) {
      case 'isometric':
        camera.position.set(120, yDist, zDist);
        camera.lookAt(0, 0, 0);
        break;
      case 'top':
        camera.position.set(0, zDist * 1.3, 0.1);
        camera.lookAt(0, 0, 0);
        break;
      case 'cross-section':
        camera.position.set(zDist * 1.2, 0, 0);
        camera.lookAt(0, 0, 0);
        break;
      case 'close-up':
        camera.position.set(60, 45, 90);
        camera.lookAt(0, 0, 0);
        break;
    }
  };

  // Toggle visibility of a layer
  const toggleLayerVisibility = (layerId: string) => {
    setVisibleLayerIds((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  // Solo a layer
  const handleSoloLayer = (layerId: string) => {
    const allVisible = Object.values(visibleLayerIds).filter(Boolean).length === 1 && visibleLayerIds[layerId];
    if (allVisible) {
      const reset: Record<string, boolean> = {};
      layers.forEach((l) => (reset[l.layerConfig.id] = true));
      setVisibleLayerIds(reset);
    } else {
      const solo: Record<string, boolean> = {};
      layers.forEach((l) => (solo[l.layerConfig.id] = l.layerConfig.id === layerId));
      setVisibleLayerIds(solo);
    }
    const idx = layers.findIndex((l) => l.layerConfig.id === layerId);
    if (idx !== -1) {
      setActiveLayerIndex(idx);
    }
    if (onSelectLayer) onSelectLayer(layerId);
  };

  // Set active scrubbed layer
  const handleScrubLayer = (index: number) => {
    const validIdx = Math.max(0, Math.min(totalLayers - 1, index));
    setActiveLayerIndex(validIdx);
    const targetLayer = layers[validIdx];
    if (targetLayer && onSelectLayer) {
      onSelectLayer(targetLayer.layerConfig.id);
    }
  };

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 560;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0f1d'); // Cleanroom dark inspection
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 3000);
    const zDist = totalLayers > 100 ? 320 : 220;
    const yDist = totalLayers > 100 ? 240 : 160;
    camera.position.set(120, yDist, zDist);
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

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(140, 300, 140);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.7);
    dirLight2.position.set(-140, 100, -120);
    scene.add(dirLight2);

    // 5. Grid Helper at base
    const grid = new THREE.GridHelper(360, 36, 0x334155, 0x1e293b);
    grid.position.y = -100;
    scene.add(grid);

    // 6. Root group for rotation and zoom
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // Group for defect connection rays
    const rayGroup = new THREE.Group();
    rootGroup.add(rayGroup);
    rayPillarsGroupRef.current = rayGroup;

    // Group for active layer high-res dies
    const activeDiesGroup = new THREE.Group();
    rootGroup.add(activeDiesGroup);
    activeDiesGroupRef.current = activeDiesGroup;

    // 7. Holographic Laser Tomography Sheet Plane
    const laserGeom = new THREE.PlaneGeometry(160, 160);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan laser sheet
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const laserPlane = new THREE.Mesh(laserGeom, laserMat);
    laserPlane.rotation.x = Math.PI / 2;
    rootGroup.add(laserPlane);
    laserPlaneRef.current = laserPlane;

    // Raycasting for interactive die hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Mesh[] = [];
      dieMeshMapRef.current.forEach((val) => meshes.push(val.mesh));

      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        let matched: any = null;
        dieMeshMapRef.current.forEach((v) => {
          if (v.mesh === hit) matched = v;
        });

        if (matched) {
          setHoveredDie({
            die: matched.die,
            layerName: matched.layerName,
            layerCode: matched.layerCode,
            isPropagated: !!matched.die.propagatedFromLayer,
          });
        }
      } else {
        setHoveredDie(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Mesh[] = [];
      dieMeshMapRef.current.forEach((val) => meshes.push(val.mesh));

      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        dieMeshMapRef.current.forEach((v) => {
          if (v.mesh === hit) {
            if (onSelectDie) onSelectDie(v.die);
          }
        });
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    // Orbit controls using mouse drag
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMoveOrbit = (e: MouseEvent) => {
      if (!isDragging || !rootGroupRef.current) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      rootGroupRef.current.rotation.y += deltaX * 0.007;
      rootGroupRef.current.rotation.x += deltaY * 0.007;

      rootGroupRef.current.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rootGroupRef.current.rotation.x));
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z += e.deltaY * 0.15;
      cameraRef.current.position.z = Math.max(50, Math.min(700, cameraRef.current.position.z));
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMoveOrbit);
    window.addEventListener('mouseup', handleMouseUp);
    domEl.addEventListener('wheel', handleWheel, { passive: false });

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate && rootGroupRef.current) {
        rootGroupRef.current.rotation.y += 0.004;
      }

      // Sweep the laser plane vertically through the stack
      if (laserPlaneRef.current && isLaserScanning) {
        const stackHeight = totalLayers > 100 ? 140 : 80;
        laserPlaneRef.current.position.y = Math.sin(elapsedTime * 1.5) * (stackHeight * (explodeRatio + 0.2));
        laserPlaneRef.current.visible = true;
      } else if (laserPlaneRef.current) {
        laserPlaneRef.current.visible = false;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('mousemove', handlePointerMove);
      domEl.removeEventListener('click', handleClick);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMoveOrbit);
      window.removeEventListener('mouseup', handleMouseUp);
      domEl.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [totalLayers, isLaserScanning]);

  // Re-build or Update Layer Geometry when layer configuration, explode, cutaway, or active layer changes
  useEffect(() => {
    if (!rootGroupRef.current) return;
    const root = rootGroupRef.current;

    // Clear previous dynamic meshes (keep rayGroup, activeDiesGroup, laserPlane)
    const toRemove: THREE.Object3D[] = [];
    root.children.forEach((child) => {
      if (child !== rayPillarsGroupRef.current && child !== activeDiesGroupRef.current && child !== laserPlaneRef.current) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((c) => root.remove(c));

    if (rayPillarsGroupRef.current) {
      rayPillarsGroupRef.current.clear();
    }
    if (activeDiesGroupRef.current) {
      activeDiesGroupRef.current.clear();
    }
    dieMeshMapRef.current.clear();

    const waferRadius = 65;
    const sceneScale = (waferRadius * 1.8) / wafer.waferDiameterMm;
    const dieW = wafer.dieSizeMm.x * sceneScale;
    const dieH = wafer.dieSizeMm.y * sceneScale;

    // Exploded spacing
    // For 1000 layers, spacing must be compact so the stack fits gracefully in view
    const baseSpacing = totalLayers > 100 ? (120 / totalLayers) : (totalLayers > 30 ? (90 / totalLayers) : 22);
    const stackSpacing = (baseSpacing * explodeRatio) + (totalLayers > 100 ? 0.35 : 1.8);

    const thetaStart = 0;
    const thetaLength = isWedgeCutaway ? 1.5 * Math.PI : 2 * Math.PI; // 90° Wedge Cutaway

    // Mode A: High Layer Count (> 16 layers, e.g. 32 to 1000 layers)
    // Uses THREE.InstancedMesh for maximum 60FPS performance (1 single draw call for all 1000 discs!)
    if (totalLayers > 16) {
      const discThickness = Math.max(0.25, Math.min(1.2, 50 / totalLayers));
      const cylinderGeom = new THREE.CylinderGeometry(
        waferRadius,
        waferRadius,
        discThickness,
        isWedgeCutaway ? 48 : 56,
        1,
        false,
        thetaStart,
        thetaLength
      );

      const discMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.6,
        transparent: true,
        opacity: 0.88,
      });

      const instancedMesh = new THREE.InstancedMesh(cylinderGeom, discMaterial, totalLayers);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      const color = new THREE.Color();

      layers.forEach((layerRun, i) => {
        const layerY = (i - (totalLayers - 1) / 2) * stackSpacing;
        dummy.position.set(0, layerY, 0);

        // Highlight active scrubbed layer with a slight outward pulse
        if (i === activeLayerIndex) {
          dummy.scale.set(1.04, 1.6, 1.04);
        } else {
          dummy.scale.set(1, 1, 1);
        }
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        // Color instance
        color.set(layerRun.layerConfig.colorHex);
        if (i === activeLayerIndex) {
          color.offsetHSL(0, 0.2, 0.15); // brighter active layer
        }
        instancedMesh.setColorAt(i, color);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
      root.add(instancedMesh);

      // Render high-res interactive dies on the ACTIVE scrubbed layer
      const activeLayer = layers[activeLayerIndex];
      if (activeLayer && activeDiesGroupRef.current) {
        const activeGroup = activeDiesGroupRef.current;
        const activeY = (activeLayerIndex - (totalLayers - 1) / 2) * stackSpacing;

        // Active layer halo ring
        const ringGeom = new THREE.RingGeometry(waferRadius + 0.8, waferRadius + 2.5, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = activeY + discThickness;
        activeGroup.add(ring);

        // Dies on active layer
        activeLayer.dies.forEach((die) => {
          if (showDefectsOnly && die.status === 'good') return;
          const posX = die.posXmm * sceneScale;
          const posZ = die.posYmm * sceneScale;

          // If wedge cutaway, omit dies in the cutaway quadrant
          if (isWedgeCutaway && posX > 0 && posZ > 0) return;

          let heightExtrude = 0.6;
          let dieColor = 0x10b981; // good

          switch (die.status) {
            case 'good':
              dieColor = 0x10b981;
              break;
            case 'minor_concern':
              dieColor = 0x86efac;
              heightExtrude = elevatedSeverity ? 1.0 : 0.6;
              break;
            case 'warning':
              dieColor = 0xeab308;
              heightExtrude = elevatedSeverity ? 1.8 : 0.6;
              break;
            case 'probable_defect':
              dieColor = 0xf97316;
              heightExtrude = elevatedSeverity ? 2.6 : 0.6;
              break;
            case 'severe_defect':
              dieColor = 0xef4444;
              heightExtrude = elevatedSeverity ? 3.8 : 0.6;
              break;
          }

          const isPropagated = !!die.propagatedFromLayer;
          const dieGeom = new THREE.BoxGeometry(dieW * 0.9, heightExtrude, dieH * 0.9);
          const dieMat = new THREE.MeshStandardMaterial({
            color: dieColor,
            roughness: 0.3,
            metalness: 0.2,
            emissive: isPropagated ? 0xff0055 : die.status === 'severe_defect' ? 0x991b1b : 0x000000,
            emissiveIntensity: isPropagated ? 0.6 : die.status === 'severe_defect' ? 0.3 : 0,
          });

          const dieMesh = new THREE.Mesh(dieGeom, dieMat);
          dieMesh.position.set(posX, activeY + heightExtrude / 2, posZ);
          activeGroup.add(dieMesh);

          dieMeshMapRef.current.set(`${activeLayer.layerConfig.id}-${die.id}`, {
            mesh: dieMesh,
            die,
            layerName: activeLayer.layerConfig.name,
            layerCode: activeLayer.layerConfig.shortCode,
          });
        });
      }

      // Draw Vertical Propagated Defect Laser Columns through the 1000 layers
      if (showPropagatedRays && rayPillarsGroupRef.current) {
        const rayGroup = rayPillarsGroupRef.current;
        const totalHeight = (totalLayers - 1) * stackSpacing;

        // Sample 8-12 vertical defect columns that pierce through the multi-layer stack
        const columnCoords = [
          { x: 15, z: 20 },
          { x: -25, z: -18 },
          { x: 35, z: -25 },
          { x: -12, z: 32 },
          { x: 42, z: 12 },
          { x: -38, z: 24 },
          { x: 5, z: -35 },
        ];

        columnCoords.forEach((coord) => {
          if (isWedgeCutaway && coord.x > 0 && coord.z > 0) return;
          const beamGeom = new THREE.CylinderGeometry(0.7, 0.7, totalHeight, 8);
          const beamMat = new THREE.MeshBasicMaterial({
            color: 0xff0055, // Hot neon pink/red
            transparent: true,
            opacity: 0.75,
          });
          const beam = new THREE.Mesh(beamGeom, beamMat);
          beam.position.set(coord.x, 0, coord.z);
          rayGroup.add(beam);
        });
      }
    } else {
      // Mode B: Standard/FEOL 10-16 Layers
      // Render full individual meshes and dies for each layer
      const defectDiePositionsByLayer: Map<number, { posX: number; posZ: number; layerY: number; status: string }[]> = new Map();

      layers.forEach((layerRun, layerIdx) => {
        const isVisible = visibleLayerIds[layerRun.layerConfig.id] !== false;
        if (!isVisible) return;

        const layerGroup = new THREE.Group();
        const layerY = (layerIdx - (totalLayers - 1) / 2) * stackSpacing;
        layerGroup.position.y = layerY;

        // Substrate Circular Disc
        const discThickness = Math.max(0.6, Math.min(2.5, layerRun.layerConfig.thicknessNm / 40));
        const discGeom = new THREE.CylinderGeometry(
          waferRadius,
          waferRadius,
          discThickness,
          64,
          1,
          false,
          thetaStart,
          thetaLength
        );

        const isCurrentActive = layerIdx === activeLayerIndex;
        const discMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(layerRun.layerConfig.colorHex),
          roughness: layerRun.layerConfig.roughness,
          metalness: layerRun.layerConfig.metallic,
          transparent: true,
          opacity: layerRun.layerConfig.opacity * (isCurrentActive ? 0.95 : 0.7),
        });

        const discMesh = new THREE.Mesh(discGeom, discMat);
        discMesh.position.y = -discThickness / 2;
        discMesh.receiveShadow = true;
        layerGroup.add(discMesh);

        // Notch indicator
        const notchGeom = new THREE.ConeGeometry(2.5, 4.5, 12);
        const notchMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
        const notch = new THREE.Mesh(notchGeom, notchMat);
        notch.rotation.x = Math.PI / 2;
        notch.position.set(0, 0, waferRadius - 0.5);
        layerGroup.add(notch);

        // Dies
        const layerDefectPositions: { posX: number; posZ: number; layerY: number; status: string }[] = [];

        layerRun.dies.forEach((die) => {
          if (showDefectsOnly && die.status === 'good') return;
          const posX = die.posXmm * sceneScale;
          const posZ = die.posYmm * sceneScale;

          if (isWedgeCutaway && posX > 0 && posZ > 0) return;

          let heightExtrude = 0.5;
          let dieColor = 0x334155;

          switch (die.status) {
            case 'good':
              dieColor = 0x10b981;
              break;
            case 'minor_concern':
              dieColor = 0x86efac;
              heightExtrude = elevatedSeverity ? 1.0 : 0.5;
              break;
            case 'warning':
              dieColor = 0xeab308;
              heightExtrude = elevatedSeverity ? 2.0 : 0.5;
              break;
            case 'probable_defect':
              dieColor = 0xf97316;
              heightExtrude = elevatedSeverity ? 3.5 : 0.5;
              break;
            case 'severe_defect':
              dieColor = 0xef4444;
              heightExtrude = elevatedSeverity ? 5.2 : 0.5;
              break;
          }

          if (die.status === 'severe_defect' || die.status === 'probable_defect') {
            layerDefectPositions.push({ posX, posZ, layerY, status: die.status });
          }

          const isPropagated = !!die.propagatedFromLayer;
          const dieGeom = new THREE.BoxGeometry(dieW * 0.9, heightExtrude, dieH * 0.9);
          const dieMat = new THREE.MeshStandardMaterial({
            color: dieColor,
            roughness: 0.3,
            metalness: 0.2,
            emissive: isPropagated ? 0xff0055 : die.status === 'severe_defect' ? 0x991b1b : 0x000000,
            emissiveIntensity: isPropagated ? 0.6 : die.status === 'severe_defect' ? 0.3 : 0,
            transparent: !isCurrentActive,
            opacity: isCurrentActive ? 1.0 : 0.6,
          });

          const dieMesh = new THREE.Mesh(dieGeom, dieMat);
          dieMesh.position.set(posX, heightExtrude / 2, posZ);
          layerGroup.add(dieMesh);

          dieMeshMapRef.current.set(`${layerRun.layerConfig.id}-${die.id}`, {
            mesh: dieMesh,
            die,
            layerName: layerRun.layerConfig.name,
            layerCode: layerRun.layerConfig.shortCode,
          });
        });

        defectDiePositionsByLayer.set(layerIdx, layerDefectPositions);
        root.add(layerGroup);
      });

      // Draw Vertical Propagated Defect Beams
      if (showPropagatedRays && rayPillarsGroupRef.current && explodeRatio > 0.05) {
        const rayGroup = rayPillarsGroupRef.current;

        for (let idx = 0; idx < layers.length - 1; idx++) {
          const lowerList = defectDiePositionsByLayer.get(idx) || [];
          const upperList = defectDiePositionsByLayer.get(idx + 1) || [];

          lowerList.forEach((lower) => {
            const match = upperList.find(
              (upper) => Math.abs(upper.posX - lower.posX) < 1.0 && Math.abs(upper.posZ - lower.posZ) < 1.0
            );

            if (match) {
              const height = Math.abs(match.layerY - lower.layerY);
              const midY = (lower.layerY + match.layerY) / 2;

              const beamGeom = new THREE.CylinderGeometry(0.55, 0.55, height, 8);
              const beamMat = new THREE.MeshBasicMaterial({
                color: 0xff0055,
                transparent: true,
                opacity: 0.75,
              });

              const beam = new THREE.Mesh(beamGeom, beamMat);
              beam.position.set(lower.posX, midY, lower.posZ);
              rayGroup.add(beam);
            }
          });
        }
      }
    }
  }, [
    layers,
    totalLayers,
    explodeRatio,
    isWedgeCutaway,
    visibleLayerIds,
    showDefectsOnly,
    elevatedSeverity,
    showPropagatedRays,
    activeLayerIndex,
  ]);

  const resetCamera = () => {
    setCameraPreset('isometric');
    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.x = 0;
      rootGroupRef.current.rotation.y = 0;
    }
  };

  const activeLayer = layers[activeLayerIndex] || layers[0];

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">3D Multi-Layer Wafer Stack Simulator</h3>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/40">
                {totalLayers} Process Layers
              </span>
              {totalLayers >= 100 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-sans font-semibold border border-indigo-500/30">
                  Instanced GPU Acceleration
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Interactive 3D monolithic stack with cross-layer defect correlation, wedge cutaway &amp; laser tomography.
            </p>
          </div>
        </div>

        {/* View Angle Presets & Wedge Cutaway */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
          <button
            onClick={() => setCameraPreset('isometric')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeCameraView === 'isometric'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Isometric
          </button>
          <button
            onClick={() => setCameraPreset('cross-section')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeCameraView === 'cross-section'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cross-Section
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeCameraView === 'top'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Top Down
          </button>
          <button
            onClick={() => setCameraPreset('close-up')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              activeCameraView === 'close-up'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Close-Up
          </button>

          {/* Wedge Cutaway Toggle */}
          <button
            onClick={() => setIsWedgeCutaway(!isWedgeCutaway)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              isWedgeCutaway ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle 90° Wedge Cutaway to view internal layer defects"
          >
            <Scissors className="w-3 h-3" />
            <span>90° Wedge</span>
          </button>

          <button
            onClick={resetCamera}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset Perspective"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace (3D Canvas + Depth Scrubber + Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* 3D WebGL Canvas Area */}
        <div className="lg:col-span-9 relative bg-slate-950 flex flex-col justify-between">
          <div ref={mountRef} className="w-full h-[560px]" />

          {/* Floating Controls Overlay (Explode Slider + Laser + Pillars) */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            {/* Exploded View Slider Pill */}
            <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Exploded Stack:
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodeRatio}
                onChange={(e) => setExplodeRatio(parseFloat(e.target.value))}
                className="w-24 sm:w-28 accent-blue-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-blue-400 w-10 text-right">
                {Math.round(explodeRatio * 100)}%
              </span>
            </div>

            {/* Quick Feature Toggles */}
            <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg pointer-events-auto flex items-center gap-1 text-xs">
              <button
                onClick={() => setIsLaserScanning(!isLaserScanning)}
                className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  isLaserScanning ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle animated laser tomography sheet"
              >
                <Scan className="w-3 h-3" />
                Laser Sheet
              </button>

              <button
                onClick={() => setShowPropagatedRays(!showPropagatedRays)}
                className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
                  showPropagatedRays ? 'bg-fuchsia-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3 h-3" />
                Fault Pillars
              </button>

              <button
                onClick={() => setShowDefectsOnly(!showDefectsOnly)}
                className={`px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  showDefectsOnly ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Defects Only
              </button>

              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  autoRotate ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {autoRotate ? 'Pause' : 'Rotate'}
              </button>
            </div>
          </div>

          {/* Interactive Z-Depth Scrubber Slider (Layer 1 to N) */}
          <div className="absolute bottom-16 left-4 right-4 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/90 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Z-Stack Scrubber:
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">
                Layer {activeLayerIndex + 1} / {totalLayers} ({activeLayer.layerConfig.shortCode})
              </span>
            </div>

            {/* Slider */}
            <div className="flex-1 max-w-md mx-2 flex items-center gap-2">
              <button
                onClick={() => handleScrubLayer(activeLayerIndex - 1)}
                disabled={activeLayerIndex <= 0}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0"
                max={totalLayers - 1}
                value={activeLayerIndex}
                onChange={(e) => handleScrubLayer(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <button
                onClick={() => handleScrubLayer(activeLayerIndex + 1)}
                disabled={activeLayerIndex >= totalLayers - 1}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-slate-300 font-mono text-[11px] flex items-center gap-3">
              <span>Defect Rate: <strong className="text-rose-400">{activeLayer.defectRate}%</strong></span>
              <span>Yield: <strong className="text-emerald-400">{activeLayer.dieYield}%</strong></span>
            </div>
          </div>

          {/* Bottom Floating Die Metrology Tooltip */}
          {hoveredDie ? (
            <div className="absolute bottom-3 left-4 right-4 bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl text-xs font-mono flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">
                  {hoveredDie.layerCode}
                </span>
                <span className="text-white font-bold">{hoveredDie.die.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    hoveredDie.die.status === 'severe_defect'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : hoveredDie.die.status === 'probable_defect'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {hoveredDie.die.status.replace('_', ' ')}
                </span>
                {hoveredDie.isPropagated && (
                  <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 text-[10px] font-sans font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-fuchsia-400" />
                    Propagated Defect
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-slate-300 text-[11px]">
                <span>Overlay: <strong className="text-amber-400">{hoveredDie.die.overlayError} nm</strong></span>
                <span>CD: <strong className="text-cyan-400">{hoveredDie.die.measuredCD} nm</strong></span>
                <span className="text-slate-400 truncate max-w-sm">{hoveredDie.die.defectReason}</span>
              </div>
            </div>
          ) : (
            <div className="absolute bottom-2 left-4 text-[10px] text-slate-500 font-mono pointer-events-none">
              Scrub depth or drag in 3D to orbit • Hover dies on active layer to inspect physical metrology
            </div>
          )}
        </div>

        {/* Right Layer Stack Selector Panel */}
        <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 bg-slate-900/70 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Layer Hierarchy ({layers.length})
              </span>
              <button
                onClick={() => {
                  const allOn: Record<string, boolean> = {};
                  layers.forEach((l) => (allOn[l.layerConfig.id] = true));
                  setVisibleLayerIds(allOn);
                  if (onSelectLayer) onSelectLayer('');
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Quick jump to active layer */}
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">Active Layer Scanned</div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeLayer.layerConfig.colorHex }} />
                <span>{activeLayer.layerConfig.shortCode}</span>
              </div>
              <div className="text-[10px] text-slate-300 truncate">{activeLayer.layerConfig.name}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/60">
                <span>Thickness: <strong>{activeLayer.layerConfig.thicknessNm} nm</strong></span>
                <span>Defects: <strong className="text-rose-400">{activeLayer.killerDefectCount}</strong></span>
              </div>
            </div>

            {/* Layer Stack Items (Ordered top to bottom) */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {layers
                .slice()
                .reverse()
                .map((layerRun, revIdx) => {
                  const actualIdx = totalLayers - 1 - revIdx;
                  const isVisible = visibleLayerIds[layerRun.layerConfig.id] !== false;
                  const isSelected = actualIdx === activeLayerIndex;

                  return (
                    <div
                      key={layerRun.layerConfig.id}
                      onClick={() => handleScrubLayer(actualIdx)}
                      className={`p-2 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                          : isVisible
                          ? 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-900/40 border-slate-800/40 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: layerRun.layerConfig.colorHex }}
                          />
                          <div className="truncate">
                            <span className="font-bold text-white block text-[11px] truncate">
                              {layerRun.layerConfig.shortCode}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {layerRun.layerConfig.name}
                            </span>
                          </div>
                        </div>

                        {/* Defect rate badge */}
                        <div className="text-right shrink-0">
                          <span
                            className={`font-mono text-[10px] font-bold block ${
                              layerRun.defectRate > 8 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {layerRun.defectRate}% def
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">
                            {layerRun.dieYield}% yld
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick Legend at bottom */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Good
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Killer Defect
              </span>
            </div>
            <div className="flex items-center gap-1 text-rose-400 font-mono text-[10px]">
              <Zap className="w-3 h-3 text-fuchsia-400" /> Hot pink pillars = Cross-layer vertical fault paths
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

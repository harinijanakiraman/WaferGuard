import React, { useState, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Filter,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Wafer, Die, DieStatus } from '../../types';

interface WaferMap2DProps {
  wafer: Wafer;
  selectedDie: Die | null;
  onSelectDie: (die: Die) => void;
}

export const WaferMap2D: React.FC<WaferMap2DProps> = ({
  wafer,
  selectedDie,
  onSelectDie,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredDie, setHoveredDie] = useState<Die | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'good' | 'defective' | 'warning'>('all');

  const containerRef = useRef<HTMLDivElement>(null);

  // Status color mapper
  const getDieColor = (status: DieStatus, isSelected: boolean) => {
    if (isSelected) return '#2563eb'; // Blue highlight for selected die
    switch (status) {
      case 'good':
        return '#22c55e'; // Green
      case 'minor_concern':
        return '#86efac'; // Light green
      case 'warning':
        return '#eab308'; // Yellow
      case 'probable_defect':
        return '#f97316'; // Orange
      case 'severe_defect':
        return '#ef4444'; // Red
      default:
        return '#cbd5e1';
    }
  };

  const filteredDies = useMemo(() => {
    return wafer.dies.filter((die) => {
      if (filterMode === 'all') return true;
      if (filterMode === 'good') return die.status === 'good' || die.status === 'minor_concern';
      if (filterMode === 'defective') return die.status === 'probable_defect' || die.status === 'severe_defect';
      if (filterMode === 'warning') return die.status === 'warning';
      return true;
    });
  }, [wafer.dies, filterMode]);

  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // SVG dimensions
  const svgSize = 480;
  const center = svgSize / 2;
  const waferRadiusPx = 210;
  const scale = waferRadiusPx / (wafer.waferDiameterMm / 2);

  const dieWidthPx = wafer.dieSizeMm.x * scale;
  const dieHeightPx = wafer.dieSizeMm.y * scale;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Top Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Interactive 2D Wafer Map</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-medium">
              {wafer.id}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              Pattern: {wafer.dominantDefectPattern}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hover any die for coordinate and metrology breakdown. Click to lock selection.
          </p>
        </div>

        {/* View Controls & Filter Buttons */}
        <div className="flex items-center gap-2">
          {/* Die filter toggles */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({wafer.totalDies})
            </button>
            <button
              onClick={() => setFilterMode('good')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                filterMode === 'good'
                  ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Good ({wafer.goodDies + wafer.minorConcernDies})
            </button>
            <button
              onClick={() => setFilterMode('warning')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                filterMode === 'warning'
                  ? 'bg-white text-amber-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Warning ({wafer.warningDies})
            </button>
            <button
              onClick={() => setFilterMode('defective')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                filterMode === 'defective'
                  ? 'bg-white text-rose-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Defect ({wafer.defectiveDies})
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: SVG Map on Left, Detailed Summary on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* SVG Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="lg:col-span-8 bg-slate-50 rounded-xl border border-slate-200 relative overflow-hidden flex items-center justify-center p-4 cursor-grab active:cursor-grabbing min-h-[460px] select-none"
        >
          {/* Alignment Notch Indicator Banner */}
          <div className="absolute top-3 left-3 text-[11px] text-slate-500 font-mono bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs pointer-events-none">
            300mm Silicon Substrate • Notch @ 270° (South)
          </div>

          <div className="absolute top-3 right-3 text-[11px] text-slate-500 font-mono bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs pointer-events-none">
            Zoom: {Math.round(zoom * 100)}%
          </div>

          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="transition-transform duration-75"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <defs>
              {/* Radial gradient for silicon wafer disc appearance */}
              <radialGradient id="waferGrad" cx="48%" cy="46%" r="52%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="85%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </radialGradient>
              <filter id="subtleShadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.06" />
              </filter>
            </defs>

            {/* Circular Wafer Outer Disc */}
            <circle
              cx={center}
              cy={center}
              r={waferRadiusPx}
              fill="url(#waferGrad)"
              stroke="#94a3b8"
              strokeWidth="2"
              filter="url(#subtleShadow)"
            />

            {/* Wafer Edge Exclusion Ring (<3.5mm from edge) */}
            <circle
              cx={center}
              cy={center}
              r={waferRadiusPx - wafer.edgeExclusionMm * scale}
              fill="none"
              stroke="#cbd5e1"
              strokeDasharray="4 3"
              strokeWidth="1.2"
            />

            {/* Orientation Notch (South / bottom center) */}
            <path
              d={`M ${center - 8} ${center + waferRadiusPx} 
                  L ${center} ${center + waferRadiusPx - 10} 
                  L ${center + 8} ${center + waferRadiusPx} Z`}
              fill="#64748b"
            />

            {/* Dies */}
            {filteredDies.map((die) => {
              const x = center + die.posXmm * scale - dieWidthPx / 2;
              const y = center + die.posYmm * scale - dieHeightPx / 2;
              const isSelected = selectedDie?.id === die.id;
              const isHovered = hoveredDie?.id === die.id;
              const color = getDieColor(die.status, isSelected);

              return (
                <rect
                  key={die.id}
                  x={x}
                  y={y}
                  width={dieWidthPx - 1}
                  height={dieHeightPx - 1}
                  fill={color}
                  stroke={isSelected ? '#1d4ed8' : isHovered ? '#0f172a' : '#ffffff'}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.6}
                  rx="1"
                  className="cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredDie(die)}
                  onMouseLeave={() => setHoveredDie(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDie(die);
                  }}
                />
              );
            })}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredDie && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto bg-slate-900/95 text-white p-3 rounded-lg shadow-lg text-xs font-mono border border-slate-700 backdrop-blur-xs max-w-sm pointer-events-none z-10 space-y-1">
              <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                <span className="font-bold text-blue-400">{hoveredDie.id}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-bold ${
                    hoveredDie.status === 'good'
                      ? 'bg-emerald-950 text-emerald-400'
                      : hoveredDie.status === 'minor_concern'
                      ? 'bg-emerald-900 text-emerald-300'
                      : hoveredDie.status === 'warning'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-rose-950 text-rose-300'
                  }`}
                >
                  {hoveredDie.status.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 text-[11px] pt-0.5">
                <div>Coord: [{hoveredDie.col}, {hoveredDie.row}]</div>
                <div>Radius: {hoveredDie.distFromCenterMm} mm</div>
                <div>Overlay: {hoveredDie.overlayError} nm</div>
                <div>CD: {hoveredDie.measuredCD} nm</div>
              </div>
              <div className="text-[11px] text-slate-300 font-sans pt-1 border-t border-slate-800">
                {hoveredDie.defectReason}
              </div>
            </div>
          )}
        </div>

        {/* Right Info & Die Telemetry Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quality Summary Card */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Yield &amp; Defect Metric
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  wafer.qualityClass === 'Excellent'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : wafer.qualityClass === 'Acceptable'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : wafer.qualityClass === 'Watch'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {wafer.qualityClass}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Die Yield</span>
                <span className="text-xl font-extrabold font-mono text-emerald-600">
                  {wafer.dieYield}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {wafer.goodDies + wafer.minorConcernDies} / {wafer.totalDies} dies
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Defect Rate</span>
                <span className="text-xl font-extrabold font-mono text-rose-600">
                  {wafer.defectRate}%
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {wafer.defectiveDies} failed dies
                </span>
              </div>
            </div>

            {/* Classification explanation points */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wide">
                Classification Factors:
              </span>
              <ul className="space-y-1 text-slate-600 text-[11px]">
                {wafer.classificationReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Model Confidence:</span>
                <strong className="text-slate-800 font-mono">{wafer.confidence}%</strong>
              </div>
            </div>
          </div>

          {/* Color Legend Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">
              Die Status Legend
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#22c55e] shrink-0" />
                  <span className="text-slate-700">Good Die</span>
                </div>
                <span className="font-mono text-slate-500">{wafer.goodDies}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#86efac] shrink-0" />
                  <span className="text-slate-700">Good (Minor Concern)</span>
                </div>
                <span className="font-mono text-slate-500">{wafer.minorConcernDies}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#eab308] shrink-0" />
                  <span className="text-slate-700">Warning / Marginal</span>
                </div>
                <span className="font-mono text-slate-500">{wafer.warningDies}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#f97316] shrink-0" />
                  <span className="text-slate-700">Probable Defect</span>
                </div>
                <span className="font-mono text-slate-500">
                  {wafer.dies.filter((d) => d.status === 'probable_defect').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#ef4444] shrink-0" />
                  <span className="text-slate-700">Severe / Killer Defect</span>
                </div>
                <span className="font-mono text-slate-500">
                  {wafer.dies.filter((d) => d.status === 'severe_defect').length}
                </span>
              </div>
            </div>
          </div>

          {/* Selected Die Inspector Card */}
          {selectedDie && (
            <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Inspected Die
                </span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {selectedDie.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-blue-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Matrix Coord</span>
                  <strong className="text-slate-800 font-mono">[{selectedDie.col}, {selectedDie.row}]</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Center Dist</span>
                  <strong className="text-slate-800 font-mono">{selectedDie.distFromCenterMm} mm</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Overlay Error</span>
                  <strong className="text-slate-800 font-mono">{selectedDie.overlayError} nm</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Measured CD</span>
                  <strong className="text-slate-800 font-mono">{selectedDie.measuredCD} nm</strong>
                </div>
              </div>

              <div className="text-xs text-slate-700">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Defect Diagnosis:</span>
                <p className="text-[11px] leading-relaxed mt-0.5 text-slate-800 font-medium">
                  {selectedDie.defectReason}
                </p>
                {selectedDie.defectCategory && (
                  <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-blue-100">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-blue-900">{selectedDie.defectCategory}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

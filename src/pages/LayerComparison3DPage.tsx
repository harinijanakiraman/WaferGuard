import React, { useState, useMemo } from 'react';
import {
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Zap,
  Sliders,
  Maximize2,
  Sparkles,
  GitCommit,
  Cpu,
  RefreshCw,
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Database,
  BarChart3,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { MultiLayerWafer3D } from '../components/wafer/MultiLayerWafer3D';
import { generateLayerBatchStack, LAYER_PRESET_COUNTS } from '../lib/layerBatchEngine';
import { WaferLayerRun, Die } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';

export const LayerComparison3DPage: React.FC = () => {
  const { activeWafer, runAnalysis, isAnalyzing } = useAppStore();

  // Stack Layer Count configuration (7 standard, 10, 24, 64, 128, 256, 500, 1000)
  const [selectedLayerCount, setSelectedLayerCount] = useState<number>(10);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [compareLayerAId, setCompareLayerAId] = useState<string>('');
  const [compareLayerBId, setCompareLayerBId] = useState<string>('');
  const [selectedDie, setSelectedDie] = useState<Die | null>(null);

  // Table search & pagination state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Synthesize or retrieve stack layers based on selected layer count
  const stackLayers: WaferLayerRun[] = useMemo(() => {
    if (!activeWafer) return [];
    if (selectedLayerCount === 7 && activeWafer.layers && activeWafer.layers.length > 0) {
      return activeWafer.layers;
    }
    return generateLayerBatchStack(activeWafer, selectedLayerCount);
  }, [activeWafer, selectedLayerCount]);

  // Default comparison layers when stack changes
  useMemo(() => {
    if (stackLayers.length > 0) {
      if (!selectedLayerId || !stackLayers.some((l) => l.layerConfig.id === selectedLayerId)) {
        setSelectedLayerId(stackLayers[Math.min(2, stackLayers.length - 1)].layerConfig.id);
      }
      if (!compareLayerAId || !stackLayers.some((l) => l.layerConfig.id === compareLayerAId)) {
        setCompareLayerAId(stackLayers[0].layerConfig.id);
      }
      if (!compareLayerBId || !stackLayers.some((l) => l.layerConfig.id === compareLayerBId)) {
        setCompareLayerBId(stackLayers[Math.min(stackLayers.length - 1, 3)].layerConfig.id);
      }
    }
  }, [stackLayers]);

  if (!activeWafer) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto my-12">
        <Layers className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No Active Wafer Loaded</h2>
        <p className="text-sm text-slate-500 mb-6">
          Generate an active wafer run to initialize the multi-layer process stack simulation.
        </p>
        <button
          onClick={() => runAnalysis(10)}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          Run Simulation Now
        </button>
      </div>
    );
  }

  const currentSelectedLayer = stackLayers.find((l) => l.layerConfig.id === selectedLayerId) || stackLayers[0];

  // Calculate highest and lowest risk layers
  const highestRiskLayer = [...stackLayers].sort((a, b) => b.defectRate - a.defectRate)[0] || stackLayers[0];
  const lowestRiskLayer = [...stackLayers].sort((a, b) => a.defectRate - b.defectRate)[0] || stackLayers[0];
  const totalPropagated = stackLayers.reduce((sum, l) => sum + (l.propagatedDefectCount || 0), 0);
  const avgStackDefectRate = (
    stackLayers.reduce((sum, l) => sum + l.defectRate, 0) / (stackLayers.length || 1)
  ).toFixed(2);

  // Chart data: For high layer counts (> 24), sample or bin layers to keep chart readable
  const layerChartData = useMemo(() => {
    if (stackLayers.length <= 24) {
      return stackLayers.map((l) => ({
        name: l.layerConfig.shortCode,
        defectRate: l.defectRate,
        dieYield: l.dieYield,
        killerDefects: l.killerDefectCount,
        overlayAvg: l.overlayErrorAverageNm,
        cdDeviation: l.cdDeviationAverageNm,
        category: l.layerConfig.category,
        color: l.layerConfig.colorHex,
      }));
    }

    // Bin into 20 representative slices across the stack
    const bins = 20;
    const binSize = Math.max(1, Math.floor(stackLayers.length / bins));
    const result = [];

    for (let i = 0; i < bins; i++) {
      const startIdx = i * binSize;
      const endIdx = Math.min(stackLayers.length, (i + 1) * binSize);
      const slice = stackLayers.slice(startIdx, endIdx);
      if (slice.length === 0) continue;

      const avgDefect = +(slice.reduce((acc, c) => acc + c.defectRate, 0) / slice.length).toFixed(2);
      const avgYield = +(slice.reduce((acc, c) => acc + c.dieYield, 0) / slice.length).toFixed(2);
      const avgOverlay = +(slice.reduce((acc, c) => acc + c.overlayErrorAverageNm, 0) / slice.length).toFixed(2);
      const avgCd = +(slice.reduce((acc, c) => acc + c.cdDeviationAverageNm, 0) / slice.length).toFixed(2);

      result.push({
        name: `L${startIdx + 1}-L${endIdx}`,
        defectRate: avgDefect,
        dieYield: avgYield,
        killerDefects: slice.reduce((acc, c) => acc + c.killerDefectCount, 0),
        overlayAvg: avgOverlay,
        cdDeviation: avgCd,
        category: slice[0].layerConfig.category,
        color: slice[0].layerConfig.colorHex,
      });
    }

    return result;
  }, [stackLayers]);

  // Dual layer comparison items
  const layerA = stackLayers.find((l) => l.layerConfig.id === compareLayerAId) || stackLayers[0];
  const layerB = stackLayers.find((l) => l.layerConfig.id === compareLayerBId) || stackLayers[1] || stackLayers[0];

  // Filtered and paginated layers for table
  const filteredLayers = useMemo(() => {
    return stackLayers.filter((l) => {
      const matchesSearch =
        searchQuery === '' ||
        l.layerConfig.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.layerConfig.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.layerConfig.cleanroomBay.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage =
        stageFilter === 'all' || l.layerConfig.category.toLowerCase().includes(stageFilter.toLowerCase());
      return matchesSearch && matchesStage;
    });
  }, [stackLayers, searchQuery, stageFilter]);

  const totalPages = Math.ceil(filteredLayers.length / pageSize) || 1;
  const paginatedLayers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLayers.slice(start, start + pageSize);
  }, [filteredLayers, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              Multi-Layer 3D Simulator
            </span>
            <span className="text-xs text-slate-400 font-mono">Lot ID: {activeWafer.batchId}</span>
            <span className="text-xs text-slate-400 font-mono">• Wafer: {activeWafer.id}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Wafer Process Stack &amp; Layer Defect Comparison
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Inspect layer-specific defect rates, process tolerances, and cross-layer fault propagation across FEOL, MOL, and BEOL stages in full 3D simulation with 10 to 1,000 layers.
          </p>
        </div>

        {/* Stack Layer Count Selector Presets */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
            <span className="text-slate-500 font-semibold px-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              Stack Size:
            </span>
            {[10, 24, 64, 128, 256, 500, 1000].map((cnt) => (
              <button
                key={cnt}
                onClick={() => {
                  setSelectedLayerCount(cnt);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedLayerCount === cnt
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                }`}
              >
                {cnt >= 1000 ? '1,000' : cnt}
              </button>
            ))}
          </div>

          <button
            onClick={() => runAnalysis(10)}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Re-Simulate
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Stitched Layers</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stackLayers.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            FEOL, MOL, BEOL &amp; Advanced Metallization
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Highest Risk Layer</span>
            <ShieldAlert className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-xl font-bold text-cyan-700 truncate">{highestRiskLayer.layerConfig.shortCode}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            {highestRiskLayer.defectRate}% Defect Rate • {highestRiskLayer.layerConfig.category}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Propagated Fault Pillars</span>
            <Zap className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-700">{totalPropagated}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cross-layer vertical fault channels</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Average Stack Defect Rate</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{avgStackDefectRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono">
            Min {lowestRiskLayer.defectRate}% &rarr; Max {highestRiskLayer.defectRate}%
          </div>
        </div>
      </div>

      {/* 3D Multi-Layer Interactive Exploded Simulator Canvas */}
      <MultiLayerWafer3D
        wafer={activeWafer}
        customLayers={stackLayers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={(layerId) => setSelectedLayerId(layerId)}
        onSelectDie={(die) => setSelectedDie(die)}
      />

      {/* Layer-by-Layer Comparative Defect Rate & Yield Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Layer Stack Metrology Benchmark ({stackLayers.length} Layers)
            </h3>
            <p className="text-xs text-slate-500">
              {stackLayers.length > 24
                ? 'Showing 20 aggregated process tier slices across the monolithic stack.'
                : 'Compare individual baseline failure rates, sensitivity to environmental drift, and resultant die yields.'}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-cyan-700 font-semibold">
              <span className="w-3 h-3 rounded bg-cyan-600 inline-block" /> Defect Rate (%)
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Die Yield (%)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={layerChartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#475569' }} domain={[0, 30]} unit="%" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#475569' }} domain={[60, 100]} unit="%" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs font-mono border border-slate-700">
                      <div className="font-bold text-sm text-cyan-300 mb-1">{data.name}</div>
                      <div className="text-slate-300">Category: <strong className="text-white">{data.category}</strong></div>
                      <div className="text-cyan-400">Defect Rate: <strong>{data.defectRate}%</strong></div>
                      <div className="text-emerald-400">Die Yield: <strong>{data.dieYield}%</strong></div>
                      <div className="text-teal-300">Overlay Error: <strong>{data.overlayAvg} nm</strong></div>
                      <div className="text-blue-300">CD Deviation: <strong>{data.cdDeviation} nm</strong></div>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="left" dataKey="defectRate" fill="#0891b2" radius={[4, 4, 0, 0]} barSize={24} name="Defect Rate %" />
              <Line yAxisId="right" type="monotone" dataKey="dieYield" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Yield %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Dual Layer Comparison Tool */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Side-by-Side Dual Layer Differential Metrology</h3>
            <p className="text-xs text-slate-500">
              Compare any two process layers to identify lithography drift, overlay misalignment propagation, and defect clustering.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Layer A:</span>
              <select
                value={compareLayerAId}
                onChange={(e) => setCompareLayerAId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold cursor-pointer max-w-xs"
              >
                {stackLayers.slice(0, 80).map((l) => (
                  <option key={l.layerConfig.id} value={l.layerConfig.id}>
                    {l.layerConfig.shortCode} - {l.layerConfig.name} ({l.layerConfig.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-300 font-bold">VS</div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Layer B:</span>
              <select
                value={compareLayerBId}
                onChange={(e) => setCompareLayerBId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 font-semibold cursor-pointer max-w-xs"
              >
                {stackLayers.slice(0, 80).map((l) => (
                  <option key={l.layerConfig.id} value={l.layerConfig.id}>
                    {l.layerConfig.shortCode} - {l.layerConfig.name} ({l.layerConfig.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dual Cards Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Layer A Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: layerA.layerConfig.colorHex }}
                />
                <h4 className="font-bold text-slate-900 text-sm">{layerA.layerConfig.name}</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-teal-100 text-teal-800">
                {layerA.layerConfig.category}
              </span>
            </div>

            <p className="text-xs text-slate-600 line-clamp-2">{layerA.layerConfig.description}</p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Defect Rate</span>
                <span className="text-base font-bold text-cyan-700">{layerA.defectRate}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Die Yield</span>
                <span className="text-base font-bold text-emerald-600">{layerA.dieYield}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Critical Feature (CD)</span>
                <span className="text-sm font-bold text-slate-800">{layerA.layerConfig.criticalFeatureNm} nm</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Overlay Budget</span>
                <span className="text-sm font-bold text-slate-800">±{layerA.layerConfig.overlayToleranceNm} nm</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1">
              <strong>Dominant Defect:</strong> {layerA.dominantDefectCategory} ({layerA.dominantPattern} pattern)
            </div>
            <div className="text-[11px] text-slate-500">
              <strong>Fab Tool:</strong> {layerA.layerConfig.toolType} • {layerA.layerConfig.cleanroomBay}
            </div>
          </div>

          {/* Layer B Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: layerB.layerConfig.colorHex }}
                />
                <h4 className="font-bold text-slate-900 text-sm">{layerB.layerConfig.name}</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-100 text-cyan-800">
                {layerB.layerConfig.category}
              </span>
            </div>

            <p className="text-xs text-slate-600 line-clamp-2">{layerB.layerConfig.description}</p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Defect Rate</span>
                <span className="text-base font-bold text-cyan-700">{layerB.defectRate}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Die Yield</span>
                <span className="text-base font-bold text-emerald-600">{layerB.dieYield}%</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Critical Feature (CD)</span>
                <span className="text-sm font-bold text-slate-800">{layerB.layerConfig.criticalFeatureNm} nm</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[10px] block">Overlay Budget</span>
                <span className="text-sm font-bold text-slate-800">±{layerB.layerConfig.overlayToleranceNm} nm</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1">
              <strong>Dominant Defect:</strong> {layerB.dominantDefectCategory} ({layerB.dominantPattern} pattern)
            </div>
            <div className="text-[11px] text-slate-500">
              <strong>Fab Tool:</strong> {layerB.layerConfig.toolType} • {layerB.layerConfig.cleanroomBay}
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Layer Metrology Data Table with Search and Pagination */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Process Layer Registry ({filteredLayers.length} of {stackLayers.length} Layers)
            </h3>
            <p className="text-xs text-slate-500">
              Full metrology parameters and defect profiles across the active process stack.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search layer, code or bay..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 w-52"
              />
            </div>

            {/* Stage Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 text-xs font-medium cursor-pointer"
              >
                <option value="all">All Stages</option>
                <option value="feol">FEOL (Front-End)</option>
                <option value="mol">MOL (Middle-of-Line)</option>
                <option value="beol">BEOL (Back-End)</option>
              </select>
            </div>

            {/* Page Size */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs cursor-pointer"
              >
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Stack #</th>
                <th className="p-3">Layer Name</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Target CD</th>
                <th className="p-3">Overlay Budget</th>
                <th className="p-3">Avg Overlay</th>
                <th className="p-3">Defect Rate</th>
                <th className="p-3">Die Yield</th>
                <th className="p-3">Dominant Defect</th>
                <th className="p-3">Cleanroom Bay</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLayers.map((l) => (
                <tr
                  key={l.layerConfig.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    selectedLayerId === l.layerConfig.id ? 'bg-teal-50/60' : ''
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-slate-700">#{l.layerConfig.stackOrder}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: l.layerConfig.colorHex }}
                      />
                      <span className="font-semibold text-slate-900">{l.layerConfig.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {l.layerConfig.category}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-700">{l.layerConfig.criticalFeatureNm} nm</td>
                  <td className="p-3 font-mono text-slate-700">±{l.layerConfig.overlayToleranceNm} nm</td>
                  <td className="p-3 font-mono text-slate-900 font-bold">{l.overlayErrorAverageNm} nm</td>
                  <td className="p-3 font-mono font-bold text-cyan-700">{l.defectRate}%</td>
                  <td className="p-3 font-mono font-bold text-emerald-600">{l.dieYield}%</td>
                  <td className="p-3 text-slate-600">{l.dominantDefectCategory}</td>
                  <td className="p-3 text-slate-500 truncate max-w-xs">{l.layerConfig.cleanroomBay}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedLayerId(l.layerConfig.id)}
                      className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold cursor-pointer text-[11px]"
                    >
                      Focus 3D
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <div>
            Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredLayers.length} total layers)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

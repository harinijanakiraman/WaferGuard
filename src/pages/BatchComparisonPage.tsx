import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Sliders,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Scan,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Maximize2,
  Cpu,
  RefreshCw,
  BarChart2,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
} from 'recharts';
import { useAppStore } from '../lib/store';
import { Wafer } from '../types';
import { RunningWafer3D } from '../components/wafer/RunningWafer3D';

interface BatchComparisonPageProps {
  onNavigate: (page: string) => void;
}

export const BatchComparisonPage: React.FC<BatchComparisonPageProps> = ({ onNavigate }) => {
  const { activeBatch, setActiveWafer, activeWafer, runAnalysis, isAnalyzing } = useAppStore();

  const [sortField, setSortField] = useState<'id' | 'dieYield' | 'defectRate' | 'qualityClass'>('dieYield');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'watch' | 'reject'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  
  // 3D Running Wafer modal inspection state
  const [inspectingWafer, setInspectingWafer] = useState<Wafer | null>(null);

  // Pagination for large batches (e.g. 100 wafers)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const wafers = activeBatch?.wafers || [];

  // Batch summary calculations
  const stats = useMemo(() => {
    if (wafers.length === 0) return null;
    const yields = wafers.map((w) => w.dieYield);
    const defectRates = wafers.map((w) => w.defectRate);

    const avgYield = Math.round((yields.reduce((a, b) => a + b, 0) / yields.length) * 10) / 10;
    const avgDefect = Math.round((defectRates.reduce((a, b) => a + b, 0) / defectRates.length) * 10) / 10;

    // Standard deviation
    const variance = yields.reduce((acc, val) => acc + Math.pow(val - avgYield, 2), 0) / yields.length;
    const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

    // Best and worst
    const sortedByYield = [...wafers].sort((a, b) => b.dieYield - a.dieYield);
    const bestWafer = sortedByYield[0];
    const worstWafer = sortedByYield[sortedByYield.length - 1];

    // Outliers (yield < avg - 1.5 * stdDev)
    const outliers = wafers.filter((w) => w.dieYield < avgYield - 1.5 * stdDev);

    return {
      avgYield,
      avgDefect,
      stdDev,
      bestWafer,
      worstWafer,
      outliers,
    };
  }, [wafers]);

  // Lot yield run-chart data mapping adhering strictly to High Yield -> Low Yield -> High Yield
  const chartData = useMemo(() => {
    const total = wafers.length;
    const p1End = Math.max(3, Math.round(total * 0.36));
    const p2End = Math.max(p1End + 3, Math.round(total * 0.72));

    return wafers.map((w, idx) => {
      const waferNum = idx + 1;
      let phaseName = 'Phase 1: High Yield (Peak Spec)';
      let phaseKey: 'Phase 1' | 'Phase 2' | 'Phase 3' = 'Phase 1';

      if (waferNum > p2End) {
        phaseName = 'Phase 3: High Yield (Recovery)';
        phaseKey = 'Phase 3';
      } else if (waferNum > p1End) {
        phaseName = 'Phase 2: Low Yield (Excursion • Layer Defect ↓)';
        phaseKey = 'Phase 2';
      }

      const bin = w.binSummary;

      return {
        name: `W${waferNum.toString().padStart(2, '0')}`,
        waferId: w.id,
        waferNum,
        dieYield: w.dieYield,
        defectRate: w.defectRate,
        qualityClass: w.qualityClass,
        phase: phaseName,
        phaseKey,
        dominantPattern: w.dominantDefectPattern,
        goodDies: w.goodDies + w.minorConcernDies,
        failedDies: w.defectiveDies,
        i9: bin?.i9Count || 0,
        i7: bin?.i7Count || 0,
        i5: bin?.i5Count || 0,
        i3: bin?.i3Count || 0,
        reject: bin?.rejectCount || 0,
        rawWafer: w,
      };
    });
  }, [wafers]);

  // Phase aggregated stats for High Yield -> Low Yield -> High Yield
  const phaseStats = useMemo(() => {
    if (chartData.length === 0) return null;
    const p1 = chartData.filter((d) => d.phaseKey === 'Phase 1');
    const p2 = chartData.filter((d) => d.phaseKey === 'Phase 2');
    const p3 = chartData.filter((d) => d.phaseKey === 'Phase 3');

    const avg = (arr: typeof chartData, key: 'dieYield' | 'defectRate') =>
      arr.length > 0
        ? Math.round((arr.reduce((acc, d) => acc + d[key], 0) / arr.length) * 10) / 10
        : 0;

    return {
      p1AvgYield: avg(p1, 'dieYield'),
      p1AvgDefect: avg(p1, 'defectRate'),
      p1Count: p1.length,
      p2AvgYield: avg(p2, 'dieYield'),
      p2AvgDefect: avg(p2, 'defectRate'),
      p2Count: p2.length,
      p3AvgYield: avg(p3, 'dieYield'),
      p3AvgDefect: avg(p3, 'defectRate'),
      p3Count: p3.length,
    };
  }, [chartData]);

  // Filter & sort
  const filteredWafers = useMemo(() => {
    return wafers
      .filter((w) => {
        // Status filter
        if (statusFilter === 'pass' && w.qualityClass !== 'Excellent' && w.qualityClass !== 'Acceptable') return false;
        if (statusFilter === 'watch' && w.qualityClass !== 'Watch') return false;
        if (statusFilter === 'reject' && w.qualityClass !== 'Reject for Review' && w.qualityClass !== 'At Risk') return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = w.id.toLowerCase().includes(q);
          const matchPattern = w.dominantDefectPattern.toLowerCase().includes(q);
          const matchParam = w.mostInfluentialParameter.toLowerCase().includes(q);
          const matchQuality = w.qualityClass.toLowerCase().includes(q);
          if (!matchId && !matchPattern && !matchParam && !matchQuality) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [wafers, statusFilter, searchQuery, sortField, sortAsc]);

  // Paginated slice
  const totalPages = Math.ceil(filteredWafers.length / pageSize) || 1;
  const paginatedWafers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWafers.slice(start, start + pageSize);
  }, [filteredWafers, currentPage, pageSize]);

  // Navigate to previous/next wafer in 3D modal
  const handleStepWafer = (dir: 'prev' | 'next') => {
    if (!inspectingWafer) return;
    const currentIndex = wafers.findIndex((w) => w.id === inspectingWafer.id);
    if (currentIndex === -1) return;

    if (dir === 'prev' && currentIndex > 0) {
      setInspectingWafer(wafers[currentIndex - 1]);
    } else if (dir === 'next' && currentIndex < wafers.length - 1) {
      setInspectingWafer(wafers[currentIndex + 1]);
    }
  };

  const handleToggleCompare = (id: string) => {
    if (selectedForComparison.includes(id)) {
      setSelectedForComparison(selectedForComparison.filter((x) => x !== id));
    } else {
      if (selectedForComparison.length < 3) {
        setSelectedForComparison([...selectedForComparison, id]);
      }
    }
  };

  const comparisonWafers = wafers.filter((w) => selectedForComparison.includes(w.id));

  return (
    <div className="space-y-6">
      {/* Batch Overview Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                Batch Comparison &amp; Lot Distribution ({activeBatch?.id || 'Active Lot'})
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                3D Live Inspection Enabled
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect yield distribution, process drift, and out-of-spec wafers across {wafers.length} substrate runs with real-time 3D scanning.
            </p>
          </div>

          {/* Batch Test Actions & Re-run */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Lot Size: <strong>{wafers.length}</strong> Wafers
            </span>

            <button
              onClick={() => runAnalysis(25)}
              disabled={isAnalyzing}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Test 25
            </button>
            <button
              onClick={() => runAnalysis(100)}
              disabled={isAnalyzing}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>Test 100-Wafer Lot</span>
            </button>
            <button
              onClick={() => onNavigate('bin-analysis')}
              className="px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>i9/i7/i5/i3 Bin Analysis</span>
            </button>
            <button
              onClick={() => onNavigate('layer-comparison')}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs border border-teal-800/40"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Layer Comparison</span>
            </button>
          </div>
        </div>

        {/* Batch Statistical Metric Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Batch Avg Yield</span>
              <span className="text-xl font-extrabold font-mono text-emerald-600 mt-1 block">
                {stats.avgYield}%
              </span>
              <span className="text-[10px] text-teal-700 font-medium">Target Spec: &gt;90%</span>
            </div>

            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Yield Std Deviation (σ)</span>
              <span className="text-xl font-extrabold font-mono text-slate-800 mt-1 block">
                ±{stats.stdDev}%
              </span>
              <span className="text-[10px] text-slate-400">Process stability index</span>
            </div>

            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Best Yield Wafer</span>
              <span className="text-sm font-bold font-mono text-emerald-700 mt-1 block truncate">
                {stats.bestWafer.id}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 font-bold">
                {stats.bestWafer.dieYield}% yield
              </span>
            </div>

            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Lowest Yield Wafer</span>
              <span className="text-sm font-bold font-mono text-cyan-800 mt-1 block truncate">
                {stats.worstWafer.id}
              </span>
              <span className="text-[11px] font-mono text-cyan-700 font-bold">
                {stats.worstWafer.dieYield}% yield
              </span>
            </div>

            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Outliers / Excursions</span>
              <span className="text-xl font-extrabold font-mono text-teal-700 mt-1 block">
                {stats.outliers.length}
              </span>
              <span className="text-[10px] text-teal-800">Wafers &gt;1.5σ drift</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Lot Yield & Defect Run Chart (High Yield -> Low Yield -> High Yield) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Lot Yield &amp; Excursion Run-Chart (High Yield → Low Yield → High Yield Recovery)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Wafer-by-wafer finished die yield and defect rate trajectory across all {wafers.length} runs. Demonstrates initial high yield, excursion dip (with layer-by-layer defect reduction), and tool recovery.
            </p>
          </div>

          {phaseStats && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>P1 High: <strong>{phaseStats.p1AvgYield}%</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-900 border border-cyan-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-700" />
                <span>P2 Low: <strong>{phaseStats.p2AvgYield}%</strong></span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                <span>P3 Recovery: <strong>{phaseStats.p3AvgYield}%</strong></span>
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="yieldRunGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[220px]">
                        <div className="flex items-center justify-between font-bold text-cyan-300 pb-1 border-b border-slate-800 font-mono">
                          <span>{d.waferId}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              d.qualityClass === 'Excellent'
                                ? 'bg-emerald-950 text-emerald-300'
                                : d.qualityClass === 'Acceptable'
                                ? 'bg-teal-950 text-teal-300'
                                : d.qualityClass === 'Watch'
                                ? 'bg-cyan-950 text-cyan-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {d.qualityClass}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-sans mt-1">
                          {d.phase}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Die Yield</span>
                            <span className="text-emerald-400 font-bold text-sm">{d.dieYield}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Defect Rate</span>
                            <span className="text-cyan-400 font-bold text-sm">{d.defectRate}%</span>
                          </div>
                        </div>
                        <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>CPU: i9:{d.i9} i7:{d.i7} i5:{d.i5} i3:{d.i3} Rej:{d.reject}</span>
                        </div>
                        <div className="text-[10px] text-cyan-400 font-sans mt-1.5 italic">
                          Click point to inspect 3D scan
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={90}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: 'Target Spec (90%)', position: 'insideTopRight', fill: '#059669', fontSize: 10 }}
              />
              <RechartsLegend
                verticalAlign="top"
                height={30}
                formatter={(val) => <span className="text-xs text-slate-700 font-medium">{val}</span>}
              />
              <Area
                type="monotone"
                dataKey="dieYield"
                name="Die Yield (%)"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#yieldRunGrad)"
                activeDot={{
                  r: 6,
                  fill: '#10b981',
                  stroke: '#fff',
                  strokeWidth: 2,
                  onClick: (_, event) => {
                    const target = (event as any)?.payload;
                    if (target?.rawWafer) setInspectingWafer(target.rawWafer);
                  },
                }}
              />
              <Line
                type="monotone"
                dataKey="defectRate"
                name="Defect Rate (%)"
                stroke="#0891b2"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#0891b2' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 3-Phase Progression Highlights Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-200">
            <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
              <span>Phase 1: High Yield Production</span>
              <span className="font-mono text-emerald-700 text-[11px] font-extrabold">
                {phaseStats?.p1AvgYield || 95}% Yield
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80">
              Clean baseline with low particulate count (&lt;0.08) and tight overlay alignment. Yield benchmark &gt;93%.
            </p>
          </div>

          <div className="bg-cyan-50/60 rounded-xl p-3 border border-cyan-200">
            <div className="flex items-center justify-between font-bold text-cyan-950 mb-1">
              <span>Phase 2: Low Yield Excursion</span>
              <span className="font-mono text-cyan-800 text-[11px] font-extrabold">
                {phaseStats?.p2AvgYield || 65}% Yield
              </span>
            </div>
            <p className="text-[11px] text-cyan-900/80">
              High defect baseline. <strong>Moving up layers defect strictly decreases</strong> (L1 Substrate 36% → L7 Pad 3.5%).
            </p>
          </div>

          <div className="bg-teal-50/60 rounded-xl p-3 border border-teal-200">
            <div className="flex items-center justify-between font-bold text-teal-950 mb-1">
              <span>Phase 3: High Yield Recovery</span>
              <span className="font-mono text-teal-700 text-[11px] font-extrabold">
                {phaseStats?.p3AvgYield || 96}% Yield
              </span>
            </div>
            <p className="text-[11px] text-teal-900/80">
              Tool recalibrated and chamber purged. Defect rates drop back to ~4% and finished yield recovers to &gt;94%.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Box (If 2 or 3 selected) */}
      {comparisonWafers.length > 0 && (
        <div className="bg-teal-50/40 rounded-xl border border-teal-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-teal-950 uppercase tracking-wide">
                Side-by-Side Wafer Metrology Comparison ({comparisonWafers.length}/3 selected)
              </span>
            </div>
            <button
              onClick={() => setSelectedForComparison([])}
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold cursor-pointer"
            >
              Clear Comparison
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonWafers.map((cw) => (
              <div
                key={cw.id}
                className="bg-white rounded-xl border border-teal-200 p-4 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <strong className="text-xs font-mono text-teal-800">{cw.id}</strong>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      cw.qualityClass === 'Excellent'
                        ? 'bg-emerald-100 text-emerald-800'
                        : cw.qualityClass === 'Acceptable'
                        ? 'bg-teal-100 text-teal-800'
                        : cw.qualityClass === 'Watch'
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {cw.qualityClass}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Die Yield:</span>
                    <strong className="text-emerald-600 font-mono text-sm">{cw.dieYield}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Defect Rate:</span>
                    <strong className="text-cyan-700 font-mono text-sm">{cw.defectRate}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Good Dies:</span>
                    <strong className="text-slate-800 font-mono">{cw.goodDies + cw.minorConcernDies}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Failed Dies:</span>
                    <strong className="text-slate-800 font-mono">{cw.defectiveDies}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 border-t border-slate-100 pt-2 space-y-1">
                  <div>
                    Pattern: <strong>{cw.dominantDefectPattern}</strong>
                  </div>
                  <div>
                    Top Factor: <strong>{cw.mostInfluentialParameter}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setInspectingWafer(cw)}
                    className="py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Inspect 3D</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveWafer(cw);
                      onNavigate('test-wafer');
                    }}
                    className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>2D Map</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wafer Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        {/* Table Filter, Search, and Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold text-slate-900">Lot Wafer Ledger</h3>
            <span className="text-xs text-slate-500 font-mono">
              ({filteredWafers.length} of {wafers.length} wafers)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Wafer ID, pattern..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-48 sm:w-56"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setStatusFilter('pass');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  statusFilter === 'pass'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pass
              </button>
              <button
                onClick={() => {
                  setStatusFilter('watch');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  statusFilter === 'watch'
                    ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Watch
              </button>
              <button
                onClick={() => {
                  setStatusFilter('reject');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  statusFilter === 'reject'
                    ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reject
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2.5 px-3 w-10">Compare</th>
                <th
                  onClick={() => {
                    if (sortField === 'id') setSortAsc(!sortAsc);
                    else {
                      setSortField('id');
                      setSortAsc(true);
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Wafer ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'dieYield') setSortAsc(!sortAsc);
                    else {
                      setSortField('dieYield');
                      setSortAsc(false);
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Die Yield</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'defectRate') setSortAsc(!sortAsc);
                    else {
                      setSortField('defectRate');
                      setSortAsc(true);
                    }
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-blue-600 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Defect Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Quality Class</th>
                <th className="py-2.5 px-3">Process Phase &amp; Trend</th>
                <th className="py-2.5 px-3">CPU Bin Distribution</th>
                <th className="py-2.5 px-3">Dominant Pattern</th>
                <th className="py-2.5 px-3">Top Influential Factor</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {paginatedWafers.map((w, idx) => {
                const isSelectedForCompare = selectedForComparison.includes(w.id);
                const isCurrentActive = activeWafer?.id === w.id;
                
                // Determine phase from wafer ID or index
                const waferIndex = wafers.findIndex((item) => item.id === w.id);
                const waferNum = waferIndex !== -1 ? waferIndex + 1 : idx + 1;
                const totalWafers = wafers.length;
                const p1End = Math.max(3, Math.round(totalWafers * 0.36));
                const p2End = Math.max(p1End + 3, Math.round(totalWafers * 0.72));

                let phaseBadge = { text: 'Phase 1: High Yield', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
                if (waferNum > p2End) {
                  phaseBadge = { text: 'Phase 3: High Yield Recov', color: 'bg-teal-50 text-teal-800 border-teal-200 font-bold' };
                } else if (waferNum > p1End) {
                  phaseBadge = { text: 'Phase 2: Low Yield (L1→L7 ↓)', color: 'bg-cyan-50 text-cyan-800 border-cyan-200 font-bold' };
                }

                const binSummary = w.binSummary;

                return (
                  <tr
                    key={w.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentActive ? 'bg-cyan-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelectedForCompare}
                        onChange={() => handleToggleCompare(w.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-900">{w.id}</span>
                        {isCurrentActive && (
                          <span className="text-[10px] font-sans bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{w.dieYield}%</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-700">{w.defectRate}%</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.qualityClass === 'Excellent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.qualityClass === 'Acceptable'
                            ? 'bg-teal-100 text-teal-800'
                            : w.qualityClass === 'Watch'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {w.qualityClass}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${phaseBadge.color}`}>
                        {phaseBadge.text}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {binSummary ? (
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                            i9: {binSummary.i9Count}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-bold">
                            i7: {binSummary.i7Count}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 font-bold">
                            i5: {binSummary.i5Count}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-bold">
                            i3: {binSummary.i3Count}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{w.dominantDefectPattern}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 truncate max-w-[180px]">
                      {w.mostInfluentialParameter}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveWafer(w);
                            onNavigate('bin-analysis');
                          }}
                          title="Open SKU Bin Sort Dashboard"
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>Bin Map</span>
                        </button>
                        <button
                          onClick={() => setInspectingWafer(w)}
                          title="Inspect 3D Running Wafer Scanner"
                          className="px-2 py-1 bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-800 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Scan className="w-3 h-3" />
                          <span>3D Scan</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveWafer(w);
                            onNavigate('test-wafer');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination & Rows-Per-Page Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100 (Full Lot)</option>
              <option value={1000}>All</option>
            </select>
            <span>
              Showing {filteredWafers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredWafers.length)} of {filteredWafers.length} entries
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-700 font-bold px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive 3D Running Wafer Inspection Modal */}
      {inspectingWafer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl space-y-4 p-5 max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Scan className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-mono">{inspectingWafer.id}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inspectingWafer.qualityClass === 'Excellent'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : inspectingWafer.qualityClass === 'Acceptable'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : inspectingWafer.qualityClass === 'Watch'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {inspectingWafer.qualityClass}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Live 3D inspection scanner • Dominant pattern: <strong>{inspectingWafer.dominantDefectPattern}</strong> • Influential: <strong>{inspectingWafer.mostInfluentialParameter}</strong>
                  </p>
                </div>
              </div>

              {/* Prev / Next Wafer & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStepWafer('prev')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev Wafer</span>
                </button>
                <button
                  onClick={() => handleStepWafer('next')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Next Wafer</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setInspectingWafer(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 3D Running Wafer Component */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <RunningWafer3D wafer={inspectingWafer} />
            </div>

            {/* Bottom Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-4 text-slate-400 font-mono">
                <span>
                  Die Yield: <strong className="text-emerald-400">{inspectingWafer.dieYield}%</strong>
                </span>
                <span>
                  Defect Rate: <strong className="text-cyan-400">{inspectingWafer.defectRate}%</strong>
                </span>
                <span>
                  Failed Dies: <strong className="text-teal-300">{inspectingWafer.defectiveDies}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveWafer(inspectingWafer);
                    setInspectingWafer(null);
                    onNavigate('layer-comparison');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Inspect in 3D Layer Stack</span>
                </button>
                <button
                  onClick={() => {
                    setActiveWafer(inspectingWafer);
                    setInspectingWafer(null);
                    onNavigate('test-wafer');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Full Analysis Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React from 'react';
import {
  Layers,
  Cpu,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wind,
  Compass,
  ArrowRight,
  Sparkles,
  BarChart2,
  Calendar,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useAppStore } from '../lib/store';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const {
    activeBatch,
    testWafer,
    analysisHistory,
    cleanroomZones,
    excursions,
    activeConstraintProfile,
  } = useAppStore();

  // Aggregate stats
  const totalWafersAnalyzed = analysisHistory.reduce(
    (acc, item) => acc + item.numberOfWafers,
    0
  );
  const avgYield =
    analysisHistory.length > 0
      ? Math.round(
          (analysisHistory.reduce((acc, item) => acc + item.yield, 0) /
            analysisHistory.length) *
            10
        ) / 10
      : 89.5;

  const avgDefectRate =
    analysisHistory.length > 0
      ? Math.round(
          (analysisHistory.reduce((acc, item) => acc + item.defectRate, 0) /
            analysisHistory.length) *
            10
        ) / 10
      : 6.8;

  const criticalWafersCount =
    activeBatch?.criticalWafersCount ||
    analysisHistory.filter((h) => h.classification === 'Reject for Review' || h.classification === 'At Risk').length;

  const mostCommonDefect =
    activeBatch?.mostCommonDefect || 'Lithography misalignment';

  const mostInfluentialParam =
    activeBatch?.mostInfluentialParam || 'Lithography Alignment Error';

  // Realistic historical yield & defect trend data for charts
  const trendData = [
    { lot: 'LOT-N7-01', yieldPct: 91.2, defectRate: 5.4, targetYield: 90 },
    { lot: 'LOT-N7-02', yieldPct: 88.6, defectRate: 7.8, targetYield: 90 },
    { lot: 'LOT-N7-03', yieldPct: 93.4, defectRate: 3.9, targetYield: 90 },
    { lot: 'LOT-N7-04', yieldPct: 85.1, defectRate: 11.2, targetYield: 90 },
    { lot: 'LOT-N7-05', yieldPct: 92.0, defectRate: 4.8, targetYield: 90 },
    { lot: 'LOT-N7-06', yieldPct: 89.8, defectRate: 6.5, targetYield: 90 },
    { lot: 'LOT-N7-07', yieldPct: activeBatch ? activeBatch.avgYield : 90.8, defectRate: activeBatch ? activeBatch.avgDefectRate : 5.8, targetYield: 90 },
  ];

  const defectBreakdownData = [
    { name: 'Litho Align', count: 48, fill: '#0284c7' },
    { name: 'Particles', count: 35, fill: '#0d9488' },
    { name: 'CD Variance', count: 28, fill: '#06b6d4' },
    { name: 'Edge Damage', count: 22, fill: '#059669' },
    { name: 'Scratch', count: 12, fill: '#14b8a6' },
    { name: 'Random', count: 16, fill: '#0369a1' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-cyan-950 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-teal-800/40 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-semibold backdrop-blur-xs">
              Fab Production Screening Active
            </span>
            <span className="text-xs text-teal-200/80 font-mono">
              Profile: {activeConstraintProfile.name}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            WaferGuard AI • Die Defect &amp; Yield Decision Hub
          </h2>
          <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
            Multi-stage screening for 300mm FinFET production wafers. Pattern-match lithography overlay, critical dimensions, and cleanroom excursions to predict wafer quality before packaging.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('bin-analysis')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-emerald-900/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-slate-950" />
            <span>i9/i7/i5/i3 Bin Analysis</span>
          </button>
          <button
            onClick={() => onNavigate('test-wafer')}
            className="px-4 py-2.5 bg-white/95 hover:bg-white text-teal-900 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-teal-700" />
            <span>New Wafer Analysis</span>
          </button>
        </div>
      </div>

      {/* Featured Silicon Binning Teaser Bar */}
      {activeBatch?.batchBinSummary && (
        <div
          onClick={() => onNavigate('bin-analysis')}
          className="bg-slate-900 text-white rounded-xl p-4 border border-teal-800/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:border-cyan-400/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Intel Core SKU Bin Harvest Active
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold border border-emerald-500/30">
                  {activeBatch.batchBinSummary.harvestYield}% Usable Silicon
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Lot breakdown: i9 ({activeBatch.batchBinSummary.i9Count} dies) • i7 ({activeBatch.batchBinSummary.i7Count}) • i5 ({activeBatch.batchBinSummary.i5Count}) • i3 ({activeBatch.batchBinSummary.i3Count}) • Total Value: ${(activeBatch.batchBinSummary.totalSiliconValueUsd / 1_000_000).toFixed(2)}M
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
            <span>Open Bin Analysis Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Top 7 Core KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Wafers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Wafers Analyzed</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalWafersAnalyzed}
            </span>
            <span className="text-[11px] text-slate-400">wafers</span>
          </div>
          <span className="text-[11px] text-teal-700 font-medium block mt-1">
            {analysisHistory.length} screening runs
          </span>
        </div>

        {/* Latest Batch */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Latest Batch ID</span>
          <div className="flex items-baseline gap-2 mt-1 truncate">
            <span className="text-lg font-bold text-slate-900 font-mono truncate">
              {activeBatch?.id || 'LOT-2026-N7'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">
            {activeBatch?.batchSize || 10} wafers in lot
          </span>
        </div>

        {/* Avg Die Yield */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Average Yield</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              {avgYield}%
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-1 rounded border border-emerald-200">
              Pass
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Target baseline: 90.0%</span>
        </div>

        {/* Avg Defect Rate */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Defect Rate</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-cyan-800 font-mono">
              {avgDefectRate}%
            </span>
            <span className="text-[11px] text-slate-400">avg</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Warning ceiling: 10.0%</span>
        </div>

        {/* Critical Wafers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Critical Wafers</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-teal-800 font-mono">
              {criticalWafersCount}
            </span>
            <span className="text-[11px] text-teal-800 font-semibold bg-teal-50 px-1 rounded border border-teal-200">
              Review
            </span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Requires engineering signoff</span>
        </div>

        {/* Top Influential Param */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">Key Influential Factor</span>
          <div className="mt-1 truncate">
            <span className="text-xs font-bold text-teal-800 truncate block font-sans">
              {mostInfluentialParam}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 truncate">
            Defect: {mostCommonDefect}
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Yield and Defect Trend Over Time */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Wafer Yield &amp; Defect Rate Trend Across Recent Lots
              </h3>
              <p className="text-xs text-slate-500">
                Historical screening timeline with target 90% yield control line.
              </p>
            </div>
            <span className="text-xs text-teal-800 font-mono bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              Control: 90% Spec
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="lot" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis domain={[75, 100]} tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071e28',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: '1px solid #0d9488',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="yieldPct"
                  name="Die Yield (%)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="defectRate"
                  name="Defect Rate (%)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
                <Line
                  type="monotone"
                  dataKey="targetYield"
                  name="Target Benchmark"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Distribution by Category */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Defects by Category</h3>
              <p className="text-xs text-slate-500">Root-cause classification count</p>
            </div>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              Active Batch
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={defectBreakdownData} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#071e28',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: '1px solid #0d9488',
                  }}
                />
                <Bar dataKey="count" name="Observed Defect Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cleanroom Status & Recent Analysis History Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cleanroom Status Summary */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wind className="w-4 h-4 text-teal-600" />
                <span>Cleanroom Status Summary</span>
              </h3>
              <p className="text-xs text-slate-500">Bay sensors and environmental alert levels</p>
            </div>
            <button
              onClick={() => onNavigate('cleanroom')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View 3D Bays</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {cleanroomZones.map((zone) => (
              <div
                key={zone.id}
                className="p-3 rounded-lg bg-slate-50/90 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        zone.alertLevel === 'critical'
                          ? 'bg-cyan-700 ring-4 ring-cyan-100'
                          : zone.alertLevel === 'warning'
                          ? 'bg-teal-500 ring-4 ring-teal-100'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <strong className="text-slate-900">{zone.name}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tool: {zone.activeTool.split(' ')[0]} • {zone.isoClass.split(' ')[0]}
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono">
                  <div className="text-slate-800 font-bold">{zone.temperatureC}°C | {zone.relativeHumidityPct}% RH</div>
                  <div className="text-teal-700">{zone.particleCount} particles/m³</div>
                </div>
              </div>
            ))}
          </div>

          {excursions.length > 0 && (
            <div className="p-3 rounded-lg bg-teal-50/80 border border-teal-200 text-teal-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Active Excursion Alert:</span>
                {excursions[0].zoneName} noted {excursions[0].parameter} ({excursions[0].measuredValue}).
              </div>
            </div>
          )}
        </div>

        {/* Recent Analysis History Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Recent Analysis History</span>
              </h3>
              <p className="text-xs text-slate-500">Screening runs saved in local audit ledger</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-y border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Analysis ID</th>
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">Wafers</th>
                  <th className="py-2.5 px-3">Yield</th>
                  <th className="py-2.5 px-3">Defect %</th>
                  <th className="py-2.5 px-3">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {analysisHistory.slice(0, 5).map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-teal-700">{record.id}</td>
                    <td className="py-2.5 px-3">{record.batchId}</td>
                    <td className="py-2.5 px-3">{record.numberOfWafers}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{record.yield}%</td>
                    <td className="py-2.5 px-3 text-cyan-800">{record.defectRate}%</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          record.classification === 'Excellent'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : record.classification === 'Acceptable'
                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                            : record.classification === 'Watch'
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            : 'bg-slate-200 text-slate-800 border border-slate-300'
                        }`}
                      >
                        {record.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

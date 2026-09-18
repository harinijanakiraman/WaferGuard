import React, { useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Target,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useAppStore } from '../lib/store';

interface DefectAnalyticsPageProps {
  onNavigate: (page: string) => void;
}

export const DefectAnalyticsPage: React.FC<DefectAnalyticsPageProps> = ({ onNavigate }) => {
  const { activeWafer, activeConstraintProfile, currentParameters } = useAppStore();

  // Radial distribution calculations
  const radialData = useMemo(() => {
    if (!activeWafer) return [];

    let centerCount = 0;
    let centerTotal = 0;
    let middleCount = 0;
    let middleTotal = 0;
    let edgeCount = 0;
    let edgeTotal = 0;

    activeWafer.dies.forEach((die) => {
      const isDefect = die.status === 'severe_defect' || die.status === 'probable_defect';
      if (die.distFromCenterMm < 50) {
        centerTotal++;
        if (isDefect) centerCount++;
      } else if (die.distFromCenterMm < 110) {
        middleTotal++;
        if (isDefect) middleCount++;
      } else {
        edgeTotal++;
        if (isDefect) edgeCount++;
      }
    });

    const centerDensity = centerTotal > 0 ? Math.round((centerCount / centerTotal) * 1000) / 10 : 0;
    const middleDensity = middleTotal > 0 ? Math.round((middleCount / middleTotal) * 1000) / 10 : 0;
    const edgeDensity = edgeTotal > 0 ? Math.round((edgeCount / edgeTotal) * 1000) / 10 : 0;

    return [
      { zone: 'Center (<50mm)', defectPct: centerDensity, totalDies: centerTotal, defectDies: centerCount },
      { zone: 'Middle (50-110mm)', defectPct: middleDensity, totalDies: middleTotal, defectDies: middleCount },
      { zone: 'Edge Ring (>110mm)', defectPct: edgeDensity, totalDies: edgeTotal, defectDies: edgeCount },
    ];
  }, [activeWafer]);

  // Defect Category Counts
  const categoryData = useMemo(() => {
    if (!activeWafer) return [];

    const counts: Record<string, number> = {
      'Litho Misalignment': 0,
      'Particle Contamination': 0,
      'CD Variance': 0,
      'Edge Damage': 0,
      'Thermal/RH Stress': 0,
      'Random Pattern': 0,
    };

    activeWafer.dies.forEach((die) => {
      if (die.status === 'severe_defect' || die.status === 'probable_defect') {
        const cat = die.defectCategory || '';
        if (cat.includes('Lithography')) counts['Litho Misalignment']++;
        else if (cat.includes('Particle')) counts['Particle Contamination']++;
        else if (cat.includes('CD')) counts['CD Variance']++;
        else if (cat.includes('Edge')) counts['Edge Damage']++;
        else if (cat.includes('Thermal')) counts['Thermal/RH Stress']++;
        else counts['Random Pattern']++;
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [activeWafer]);

  // Parameter Influence Radar
  const influenceData = [
    { subject: 'Litho Overlay', A: 85, fullMark: 100 },
    { subject: 'Particles', A: 65, fullMark: 100 },
    { subject: 'CD Uniformity', A: 70, fullMark: 100 },
    { subject: 'Thermal Drift', A: 45, fullMark: 100 },
    { subject: 'Humidity RH', A: 40, fullMark: 100 },
    { subject: 'Edge Ring Effect', A: 75, fullMark: 100 },
  ];

  // What-If Sensitivity Analysis Matrix
  const sensitivityScenarios = [
    {
      scenario: 'Particle Contamination Reduced by 25%',
      action: 'Upgrade intake HEPA filtration to ISO Class 1 spec (0.28 part/cm²)',
      yieldImpact: '+2.8%',
      defectImpact: '-2.4%',
      confidence: 'High (88%)',
      primaryBenefit: 'Suppresses clustered defect formation in inner dies',
    },
    {
      scenario: 'Litho Alignment Error Improved by 0.8 nm',
      action: 'Recalibrate Twinscan reticle stage interferometer',
      yieldImpact: '+4.2%',
      defectImpact: '-3.8%',
      confidence: 'Very High (94%)',
      primaryBenefit: 'Eliminates edge-die gate pattern bridges',
    },
    {
      scenario: 'CD Deviation Constrained to ≤0.6 nm',
      action: 'Tighten plasma etch RF power uniformity across chuck',
      yieldImpact: '+2.1%',
      defectImpact: '-1.9%',
      confidence: 'Medium (76%)',
      primaryBenefit: 'Reduces transconductance marginality on peripheral dies',
    },
    {
      scenario: 'Cleanroom Temp Stabilized to ±0.1°C',
      action: 'Increase laminar chilled-water loop flow rate in Bay 01',
      yieldImpact: '+1.1%',
      defectImpact: '-0.9%',
      confidence: 'High (82%)',
      primaryBenefit: 'Prevents thermal expansion drift of reticle glass',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Spatial Defect Analytics &amp; Sensitivity Modeling
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Radial defect density decomposition, root cause attribution, and predictive sensitivity scenarios.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            Target Wafer: {activeWafer?.id || 'Active Selection'}
          </span>
        </div>

        {/* Top 3 Spatial Findings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">Radial Edge Concentration</span>
            <div className="text-xl font-bold font-mono text-amber-600">
              {radialData[2]?.defectPct || 14.5}% at Edge
            </div>
            <p className="text-[11px] text-slate-600">
              Defects rise significantly beyond 110mm radius due to resist meniscus thinning.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">Dominant Defect Mechanism</span>
            <div className="text-xl font-bold text-blue-700">
              {activeWafer?.dominantDefectCategory || 'Lithography Misalignment'}
            </div>
            <p className="text-[11px] text-slate-600">
              Responsible for {activeWafer?.defectiveDies || 8} failed dies in the current test profile.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium">Maximum Yield Upside</span>
            <div className="text-xl font-bold font-mono text-emerald-600">
              +7.1% Potential
            </div>
            <p className="text-[11px] text-slate-600">
              Achievable by coupling litho overlay recalibration with particle reduction.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radial Defect Density Bar Chart */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Defect Rate by Wafer Radius Zone
              </h3>
              <p className="text-xs text-slate-500">Center (&lt;50mm) vs Middle (50-110mm) vs Edge (&gt;110mm)</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">Radial Slice</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radialData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="zone" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="defectPct" name="Defect Density (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Parameter Influence Radar */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Process Influence &amp; Variance Weight
              </h3>
              <p className="text-xs text-slate-500">Relative contribution to die defect probability</p>
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Radar Model
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={influenceData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#475569' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Radar
                  name="Influence Score"
                  dataKey="A"
                  stroke="#2563eb"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis (What-If Scenarios) Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Sensitivity Analysis &amp; What-If Optimization Scenarios</span>
            </h3>
            <p className="text-xs text-slate-500">
              Simulated yield impact resulting from specific parameter tuning and hardware calibrations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('recommendations')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View Reduction Actions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2.5 px-3">Tuning Scenario</th>
                <th className="py-2.5 px-3">Proposed Action</th>
                <th className="py-2.5 px-3">Yield Impact</th>
                <th className="py-2.5 px-3">Defect Impact</th>
                <th className="py-2.5 px-3">Model Confidence</th>
                <th className="py-2.5 px-3">Primary Expected Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sensitivityScenarios.map((sc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">{sc.scenario}</td>
                  <td className="py-3 px-3 text-slate-600">{sc.action}</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-600">{sc.yieldImpact}</td>
                  <td className="py-3 px-3 font-mono font-bold text-blue-600">{sc.defectImpact}</td>
                  <td className="py-3 px-3">
                    <span className="bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded text-[11px]">
                      {sc.confidence}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 text-[11px]">{sc.primaryBenefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

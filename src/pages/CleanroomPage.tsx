import React, { useState } from 'react';
import {
  Wind,
  Thermometer,
  Droplets,
  AlertTriangle,
  Gauge,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { Cleanroom3D } from '../components/cleanroom/Cleanroom3D';
import { CleanroomZone } from '../types';

interface CleanroomPageProps {
  onNavigate: (page: string) => void;
}

export const CleanroomPage: React.FC<CleanroomPageProps> = ({ onNavigate }) => {
  const { cleanroomZones, excursions } = useAppStore();
  const [selectedZone, setSelectedZone] = useState<CleanroomZone | null>(cleanroomZones[0]);

  // Cleanroom correlation findings
  const correlations = [
    {
      parameter: 'Relative Humidity (>45.0% RH)',
      impact: 'Resist Adhesion & Pattern Collapse',
      riskIncrease: '+35% Marginal Die Probability',
      details: 'Elevated moisture alters photoresist surface wetting angle and causes post-exposure bake footing.',
    },
    {
      parameter: 'Airborne Particles (>20 part/m³ @ 0.1μm)',
      impact: 'Killer Gate Pinholes & Vias Shorting',
      riskIncrease: '+42% Severe Defect Increase',
      details: 'Macro particulates interrupt EUV mask projection and precipitate as bridging defects across contact layers.',
    },
    {
      parameter: 'Temperature Instability (±0.3°C Drift)',
      impact: 'Interferometer Overlay Error',
      riskIncrease: '+1.8 nm Overlay Expansion',
      details: 'Thermal expansion of the wafer vacuum stage and quartz reticle induces multi-die registration offsets.',
    },
    {
      parameter: 'Differential Pressure Drop (<20 Pa)',
      impact: 'External Contamination Ingress',
      riskIncrease: '+50% Peripheral Excursion Rate',
      details: 'Loss of positive plenum pressure allows adjacent sub-fab aerosols to infiltrate the laminar core.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Cleanroom Bays &amp; Lithography Environmental Telemetry
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live environmental monitoring across 5 cleanroom fabrication bays. Real-time correlation with wafer defect likelihood.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('layer-comparison')}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3D Multi-Layer Stack</span>
            </button>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sensors Online (100% Coverage)</span>
            </span>
          </div>
        </div>

        {/* Aggregate Cleanroom Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Thermometer className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px]">Litho Bay Temp</span>
            </div>
            <span className="text-xl font-black font-mono text-slate-900 mt-1 block">
              21.2 °C
            </span>
            <span className="text-[10px] text-slate-400">Spec: 21.0 ± 0.2 °C</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Droplets className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px]">Relative Humidity</span>
            </div>
            <span className="text-xl font-black font-mono text-slate-900 mt-1 block">
              42.4 %
            </span>
            <span className="text-[10px] text-slate-400">Spec: 40.0 - 45.0 %</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Gauge className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px]">Positive Pressure</span>
            </div>
            <span className="text-xl font-black font-mono text-slate-900 mt-1 block">
              34.5 Pa
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Positive plenum active</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center gap-1.5 text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px]">Active Excursions</span>
            </div>
            <span className="text-xl font-black font-mono text-amber-600 mt-1 block">
              {excursions.length} Logged
            </span>
            <span className="text-[10px] text-amber-700">Bay 01 Litho tracked</span>
          </div>
        </div>
      </div>

      {/* 3D Cleanroom Interactive Simulation */}
      <Cleanroom3D
        zones={cleanroomZones}
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
        onNavigateToLayer={() => onNavigate('layer-comparison')}
      />

      {/* Cleanroom Zone Cards & Excursion Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cleanroom Bay Cards */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fab Bay Sensor Readings</h3>
              <p className="text-xs text-slate-500">Click any bay to focus the 3D tool view</p>
            </div>
            <span className="text-xs font-mono text-slate-400">5 Monitored Bays</span>
          </div>

          <div className="space-y-3">
            {cleanroomZones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;

              return (
                <div
                  key={zone.id}
                  onClick={() => setSelectedZone(zone)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-300 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          zone.alertLevel === 'critical'
                            ? 'bg-rose-500 ring-4 ring-rose-100'
                            : zone.alertLevel === 'warning'
                            ? 'bg-amber-500 ring-4 ring-amber-100'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <strong className="text-xs font-bold text-slate-900">{zone.name}</strong>
                        <span className="text-[11px] text-slate-500 block font-sans">
                          Tool: {zone.activeTool} • Standard: {zone.isoClass}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                        zone.alertLevel === 'normal'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {zone.alertLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-3 mt-2 border-t border-slate-200/60 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Temp</span>
                      <strong className="text-slate-800">{zone.temperatureC}°C</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Humidity</span>
                      <strong className="text-slate-800">{zone.relativeHumidityPct}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Particles</span>
                      <strong className="text-slate-800">{zone.particleCount} p/m³</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Airflow</span>
                      <strong className="text-slate-800">{zone.airflowVelocityMps} m/s</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Excursions & Correlation Insights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Excursion Log */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Recent Environmental Excursions</span>
                </h3>
                <p className="text-xs text-slate-500">Threshold violations logged within 24h</p>
              </div>
            </div>

            <div className="space-y-3">
              {excursions.map((ex) => (
                <div
                  key={ex.id}
                  className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-900 font-bold">{ex.zoneName}</strong>
                    <span className="text-[10px] font-mono text-amber-700">{ex.timestamp}</span>
                  </div>
                  <div className="text-slate-700">
                    Exceeded threshold for <strong>{ex.parameter}</strong> (Measured:{' '}
                    <span className="font-mono font-bold text-rose-600">{ex.measuredValue}</span> vs Limit:{' '}
                    <span className="font-mono">{ex.thresholdValue}</span>).
                  </div>
                  <div className="text-[11px] text-slate-600 font-sans pt-1 border-t border-amber-200/50">
                    <strong className="text-slate-800">Potential Yield Impact:</strong> {ex.potentialWaferImpact}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Correlation Knowledge Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Cleanroom Defect Correlation Rules</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              {correlations.map((c, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900">{c.parameter}</strong>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                      {c.riskIncrease}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{c.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

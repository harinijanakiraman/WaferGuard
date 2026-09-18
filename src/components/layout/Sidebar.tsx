import React from 'react';
import {
  Cpu,
  LayoutDashboard,
  Compass,
  Layers,
  BarChart3,
  CheckSquare,
  Wind,
  Sliders,
  History,
  Info,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { activeBatch, activeConstraintProfile, analysisHistory } = useAppStore();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'bin-analysis',
      label: 'i9 / i7 / i5 / i3 Binning',
      icon: Cpu,
      badge: 'SKU Sort',
      accent: true,
    },
    {
      id: 'test-wafer',
      label: 'Test Wafer Analysis',
      icon: Compass,
      badge: 'Main',
    },
    {
      id: 'layer-comparison',
      label: '3D Layer Comparison',
      icon: Layers,
      badge: '3D Stack',
    },
    {
      id: 'batch-comparison',
      label: 'Batch Comparison',
      icon: BarChart3,
      badge: activeBatch ? `${activeBatch.batchSize}` : '25',
    },
    {
      id: 'defect-analytics',
      label: 'Defect Analytics',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'recommendations',
      label: 'Defect Reduction Actions',
      icon: CheckSquare,
      badge: '4',
    },
    {
      id: 'cleanroom',
      label: 'Cleanroom & Environment',
      icon: Wind,
      badge: 'Live',
    },
    {
      id: 'calibration',
      label: 'Parameter Constraints',
      icon: Sliders,
      badge: 'v2.4',
    },
    {
      id: 'history',
      label: 'Analysis History',
      icon: History,
      badge: analysisHistory.length > 0 ? `${analysisHistory.length}` : null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]">
      {/* Brand & Title */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-slate-900">WaferGuard</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              AI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">Semiconductor Defect Decision Tool</p>
        </div>
      </div>

      {/* Profile quick tag */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span className="font-medium truncate max-w-[130px]">{activeConstraintProfile.processNode}</span>
        </div>
        <span className="text-[10px] text-teal-800 font-mono bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
          {activeConstraintProfile.version}
        </span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Platform Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                isActive
                  ? 'bg-gradient-to-r from-teal-50/90 to-cyan-50/80 text-teal-900 font-bold shadow-xs border border-teal-200/90'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Prototype notice footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200/70 text-slate-700 flex items-start gap-2 text-[11px] leading-relaxed">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 block">Engineering Prototype</span>
            Decision-support tool for process screening. Calibration thresholds require engineer validation.
          </div>
        </div>
      </div>
    </aside>
  );
};

import React from 'react';
import {
  Play,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../lib/store';

interface HeaderProps {
  onRunTest: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onRunTest }) => {
  const { activeBatch, testWafer, isAnalyzing, activePage, activeConstraintProfile } = useAppStore();

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Fab Yield & Defect Dashboard';
      case 'test-wafer':
        return 'Test Wafer Screening & Analysis';
      case 'batch-comparison':
        return 'Batch Wafer Metrology & Comparison';
      case 'defect-analytics':
        return 'Defect Analytics & Spatial Decomposition';
      case 'recommendations':
        return 'Defect Reduction Actions & Root Causes';
      case 'cleanroom':
        return 'Cleanroom & Lithography Environment';
      case 'calibration':
        return 'Parameter Constraints & Model Calibration';
      case 'history':
        return 'Wafer Analysis History & Audit Trail';
      default:
        return 'WaferGuard AI Metrology Console';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Title & Path */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-none">{getPageTitle()}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>Node: <strong className="text-slate-700">{activeConstraintProfile.processNode}</strong></span>
            <span>•</span>
            <span>Profile: <strong className="text-slate-700">{activeConstraintProfile.version}</strong></span>
            {activeBatch && (
              <>
                <span>•</span>
                <span>Active Batch: <strong className="font-mono text-teal-700">{activeBatch.id}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Center Prototype Disclaimer Pill */}
      <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-teal-50/80 border border-teal-200 rounded-full text-[11px] text-teal-900 font-medium">
        <AlertCircle className="w-3.5 h-3.5 text-teal-600" />
        <span>Prototype Decision Support • Values Based on Configurable Rules &amp; Simulated Data</span>
      </div>

      {/* Right Controls & Quick Action */}
      <div className="flex items-center gap-3">
        {testWafer && (
          <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500">Test Wafer Yield:</span>
            <span
              className={`font-bold font-mono ${
                testWafer.dieYield >= 90
                  ? 'text-emerald-600'
                  : testWafer.dieYield >= 80
                  ? 'text-teal-600'
                  : testWafer.dieYield >= 70
                  ? 'text-cyan-700'
                  : 'text-slate-700'
              }`}
            >
              {testWafer.dieYield}%
            </span>
          </div>
        )}

        <button
          onClick={onRunTest}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 active:from-teal-800 active:to-cyan-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm shadow-teal-600/20 transition-all cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Analyze Wafer</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

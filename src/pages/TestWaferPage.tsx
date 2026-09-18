import React, { useState } from 'react';
import {
  Compass,
  Play,
  RotateCcw,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  HelpCircle,
  Eye,
  Layers,
  Box,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { WaferMap2D } from '../components/wafer/WaferMap2D';
import { WaferMap3D } from '../components/wafer/WaferMap3D';
import { checkParameterStatus } from '../lib/simulationEngine';
import { TECHNICAL_TOOLTIPS } from '../lib/presets';

interface TestWaferPageProps {
  onNavigate: (page: string) => void;
}

export const TestWaferPage: React.FC<TestWaferPageProps> = ({ onNavigate }) => {
  const {
    currentParameters,
    updateParameters,
    activeConstraintProfile,
    activeWafer,
    selectedDie,
    setSelectedDie,
    runAnalysis,
    isAnalyzing,
    analysisProgress,
  } = useAppStore();

  const [waferId, setWaferId] = useState(activeWafer?.id || 'WFR-300-8841-01');
  const [batchId, setBatchId] = useState(activeWafer?.batchId || 'LOT-2026-N7-DEMO');
  const [waferDiameter, setWaferDiameter] = useState<number>(300);
  const [batchMode, setBatchMode] = useState<'1' | '10' | '100' | 'custom'>('10');
  const [customBatchSize, setCustomBatchSize] = useState(25);
  const [activeViewMode, setActiveViewMode] = useState<'2d' | '3d'>('2d');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const cfg = activeConstraintProfile.paramConfigs;

  // Validation helper
  const validateInputs = (): boolean => {
    const errors: Record<string, string> = {};

    if (!waferId.trim()) errors.waferId = 'Wafer ID cannot be blank.';
    if (!batchId.trim()) errors.batchId = 'Batch ID cannot be blank.';

    const p = currentParameters;
    if (isNaN(p.particleContamination) || p.particleContamination < 0) {
      errors.particleContamination = 'Contamination must be a non-negative number.';
    } else if (p.particleContamination > cfg.particleContamination.max) {
      errors.particleContamination = `Exceeds max range ceiling (${cfg.particleContamination.max} ${cfg.particleContamination.unit}).`;
    }

    if (isNaN(p.lithoAlignmentError) || p.lithoAlignmentError < 0) {
      errors.lithoAlignmentError = 'Overlay error must be a non-negative number.';
    } else if (p.lithoAlignmentError > cfg.lithoAlignmentError.max) {
      errors.lithoAlignmentError = `Exceeds max range ceiling (${cfg.lithoAlignmentError.max} ${cfg.lithoAlignmentError.unit}).`;
    }

    if (isNaN(p.cdDeviation) || p.cdDeviation < 0) {
      errors.cdDeviation = 'CD deviation must be a non-negative number.';
    } else if (p.cdDeviation > cfg.cdDeviation.max) {
      errors.cdDeviation = `Exceeds max range ceiling (${cfg.cdDeviation.max} ${cfg.cdDeviation.unit}).`;
    }

    if (isNaN(p.temperature) || p.temperature < cfg.temperature.min || p.temperature > cfg.temperature.max) {
      errors.temperature = `Temp must be between ${cfg.temperature.min}°C and ${cfg.temperature.max}°C.`;
    }

    if (isNaN(p.relativeHumidity) || p.relativeHumidity < cfg.relativeHumidity.min || p.relativeHumidity > cfg.relativeHumidity.max) {
      errors.relativeHumidity = `Humidity must be between ${cfg.relativeHumidity.min}% and ${cfg.relativeHumidity.max}%.`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStartAnalysis = async () => {
    if (!validateInputs()) return;

    let size = 1;
    if (batchMode === '10') size = 10;
    else if (batchMode === '100') size = 100;
    else if (batchMode === 'custom') size = Math.min(200, Math.max(1, customBatchSize));

    await runAnalysis(size, batchId, waferId, uploadedFileName || undefined);
  };

  const handleResetToDemo = () => {
    updateParameters({
      particleContamination: 0.38,
      lithoAlignmentError: 2.1,
      cdDeviation: 0.95,
      temperature: 21.2,
      relativeHumidity: 42.4,
    });
    setValidationErrors({});
    setUploadedFileName(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      // Generate synthetic perturbation based on file upload
      updateParameters({
        particleContamination: 0.45,
        lithoAlignmentError: 2.3,
        cdDeviation: 1.05,
      });
    }
  };

  // Status for each parameter
  const particleStatus = checkParameterStatus(currentParameters.particleContamination, cfg.particleContamination);
  const lithoStatus = checkParameterStatus(currentParameters.lithoAlignmentError, cfg.lithoAlignmentError);
  const cdStatus = checkParameterStatus(currentParameters.cdDeviation, cfg.cdDeviation);
  const tempStatus = checkParameterStatus(currentParameters.temperature, cfg.temperature);
  const rhStatus = checkParameterStatus(currentParameters.relativeHumidity, cfg.relativeHumidity);

  const getStatusBadge = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'normal':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">Normal</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 uppercase">Warning</span>;
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 uppercase">Excursion</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration & Parameter Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                Test Wafer Parameters &amp; Screening Setup
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter key lithography and cleanroom telemetry. The test wafer serves as the baseline screening control before running the full batch.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDemo}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Demo Values</span>
            </button>
          </div>
        </div>

        {/* Wafer Metadata & Batch Selection Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-700 font-semibold block mb-1">Wafer ID:</label>
            <input
              type="text"
              value={waferId}
              onChange={(e) => setWaferId(e.target.value)}
              className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                validationErrors.waferId ? 'border-cyan-400 bg-cyan-50/30' : 'border-slate-200'
              }`}
              placeholder="e.g. WFR-300-8841-01"
            />
            {validationErrors.waferId && (
              <span className="text-[11px] text-cyan-700 block mt-1">{validationErrors.waferId}</span>
            )}
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Lot / Batch ID:</label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                validationErrors.batchId ? 'border-cyan-400 bg-cyan-50/30' : 'border-slate-200'
              }`}
              placeholder="e.g. LOT-2026-N7-B4"
            />
            {validationErrors.batchId && (
              <span className="text-[11px] text-cyan-700 block mt-1">{validationErrors.batchId}</span>
            )}
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Wafer Diameter:</label>
            <select
              value={waferDiameter}
              onChange={(e) => setWaferDiameter(parseInt(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value={300}>300 mm (Standard FinFET)</option>
              <option value={200}>200 mm (Legacy Substrate)</option>
              <option value={450}>450 mm (Advanced Prototype)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Test Run Mode:</label>
            <div className="grid grid-cols-4 gap-1">
              <button
                onClick={() => setBatchMode('1')}
                className={`py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  batchMode === '1'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                1 Wfr
              </button>
              <button
                onClick={() => setBatchMode('10')}
                className={`py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  batchMode === '10'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                10 Wfr
              </button>
              <button
                onClick={() => setBatchMode('100')}
                className={`py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  batchMode === '100'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                100 Wfr
              </button>
              <button
                onClick={() => setBatchMode('custom')}
                className={`py-1.5 rounded-md font-bold text-xs transition-colors cursor-pointer ${
                  batchMode === 'custom'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Custom
              </button>
            </div>
            {batchMode === 'custom' && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Size:</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={customBatchSize}
                  onChange={(e) => setCustomBatchSize(parseInt(e.target.value) || 1)}
                  className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* The Main Five Parameters Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Main Five Process &amp; Environmental Parameters
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              *Thresholds: Prototype Demo Values (Node: {activeConstraintProfile.processNode})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Particle Contamination */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">1. Particles</span>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === 'particles' ? null : 'particles')}
                  className="text-slate-400 hover:text-teal-600 cursor-pointer"
                  title="Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeTooltip === 'particles' && (
                <div className="absolute top-10 left-2 right-2 bg-slate-900 text-white p-2.5 rounded-lg text-[11px] shadow-lg z-20 font-sans">
                  {TECHNICAL_TOOLTIPS.particleContamination}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.01"
                  value={currentParameters.particleContamination}
                  onChange={(e) =>
                    updateParameters({ particleContamination: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">part/cm²</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Norm: 0 - 0.5</span>
                {getStatusBadge(particleStatus)}
              </div>
              {validationErrors.particleContamination && (
                <span className="text-[10px] text-cyan-700 block">{validationErrors.particleContamination}</span>
              )}
            </div>

            {/* 2. Litho Alignment Error */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">2. Litho Overlay</span>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === 'litho' ? null : 'litho')}
                  className="text-slate-400 hover:text-teal-600 cursor-pointer"
                  title="Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeTooltip === 'litho' && (
                <div className="absolute top-10 left-2 right-2 bg-slate-900 text-white p-2.5 rounded-lg text-[11px] shadow-lg z-20 font-sans">
                  {TECHNICAL_TOOLTIPS.lithoAlignmentError}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={currentParameters.lithoAlignmentError}
                  onChange={(e) =>
                    updateParameters({ lithoAlignmentError: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">nm</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Norm: 0 - 2.5</span>
                {getStatusBadge(lithoStatus)}
              </div>
              {validationErrors.lithoAlignmentError && (
                <span className="text-[10px] text-cyan-700 block">{validationErrors.lithoAlignmentError}</span>
              )}
            </div>

            {/* 3. CD Deviation */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">3. CD Deviation</span>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === 'cd' ? null : 'cd')}
                  className="text-slate-400 hover:text-teal-600 cursor-pointer"
                  title="Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeTooltip === 'cd' && (
                <div className="absolute top-10 left-2 right-2 bg-slate-900 text-white p-2.5 rounded-lg text-[11px] shadow-lg z-20 font-sans">
                  {TECHNICAL_TOOLTIPS.cdDeviation}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.05"
                  value={currentParameters.cdDeviation}
                  onChange={(e) =>
                    updateParameters({ cdDeviation: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">nm</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Norm: 0 - 1.2</span>
                {getStatusBadge(cdStatus)}
              </div>
              {validationErrors.cdDeviation && (
                <span className="text-[10px] text-cyan-700 block">{validationErrors.cdDeviation}</span>
              )}
            </div>

            {/* 4. Cleanroom Temp */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">4. Temperature</span>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === 'temp' ? null : 'temp')}
                  className="text-slate-400 hover:text-teal-600 cursor-pointer"
                  title="Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeTooltip === 'temp' && (
                <div className="absolute top-10 left-2 right-2 bg-slate-900 text-white p-2.5 rounded-lg text-[11px] shadow-lg z-20 font-sans">
                  {TECHNICAL_TOOLTIPS.temperature}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={currentParameters.temperature}
                  onChange={(e) =>
                    updateParameters({ temperature: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">°C</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Norm: 20.5 - 22</span>
                {getStatusBadge(tempStatus)}
              </div>
              {validationErrors.temperature && (
                <span className="text-[10px] text-cyan-700 block">{validationErrors.temperature}</span>
              )}
            </div>

            {/* 5. Relative Humidity */}
            <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">5. Humidity</span>
                <button
                  onClick={() => setActiveTooltip(activeTooltip === 'rh' ? null : 'rh')}
                  className="text-slate-400 hover:text-teal-600 cursor-pointer"
                  title="Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeTooltip === 'rh' && (
                <div className="absolute top-10 left-2 right-2 bg-slate-900 text-white p-2.5 rounded-lg text-[11px] shadow-lg z-20 font-sans">
                  {TECHNICAL_TOOLTIPS.relativeHumidity}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={currentParameters.relativeHumidity}
                  onChange={(e) =>
                    updateParameters({ relativeHumidity: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[11px] text-slate-500 shrink-0 font-medium">%</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Norm: 40 - 45</span>
                {getStatusBadge(rhStatus)}
              </div>
              {validationErrors.relativeHumidity && (
                <span className="text-[10px] text-cyan-700 block">{validationErrors.relativeHumidity}</span>
              )}
            </div>
          </div>
        </div>

        {/* Upload & Action Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{uploadedFileName || 'Upload Die Telemetry (CSV / JSON)'}</span>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {uploadedFileName && (
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Loaded File
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 active:from-teal-800 active:to-cyan-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Wafer ({analysisProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute Screening Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress bar during analysis */}
        {isAnalyzing && (
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-600 h-2 transition-all duration-300 rounded-full"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Wafer Metrology Display Header */}
      {activeWafer && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  {activeWafer.id} Metrology &amp; Quality Classification
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                  {activeWafer.totalDies} Total Dies
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dominant pattern:{' '}
                <strong className="text-slate-800">{activeWafer.dominantDefectPattern}</strong> • Influential param:{' '}
                <strong className="text-teal-700">{activeWafer.mostInfluentialParameter}</strong>
              </p>
            </div>

            {/* View Switcher: 2D vs 3D */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveViewMode('2d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeViewMode === '2d'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Wafer Map</span>
              </button>
              <button
                onClick={() => setActiveViewMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  activeViewMode === '3d'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Wafer Simulation</span>
              </button>
            </div>
          </div>

          {/* Render 2D or 3D view */}
          {activeViewMode === '2d' ? (
            <WaferMap2D
              wafer={activeWafer}
              selectedDie={selectedDie}
              onSelectDie={setSelectedDie}
            />
          ) : (
            <WaferMap3D
              wafer={activeWafer}
              selectedDie={selectedDie}
              onSelectDie={setSelectedDie}
            />
          )}
        </div>
      )}
    </div>
  );
};

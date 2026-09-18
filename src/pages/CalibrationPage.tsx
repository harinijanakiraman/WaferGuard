import React, { useState } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Cpu,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { ConstraintProfile, MainParameters } from '../types';

interface CalibrationPageProps {
  onNavigate: (page: string) => void;
}

export const CalibrationPage: React.FC<CalibrationPageProps> = ({ onNavigate }) => {
  const {
    activeConstraintProfile,
    allConstraintProfiles,
    setActiveConstraintProfile,
    saveConstraintProfile,
    resetConstraintsToDefault,
    auditLogs,
  } = useAppStore();

  const [editingProfile, setEditingProfile] = useState<ConstraintProfile>({
    ...activeConstraintProfile,
  });
  const [saveMessage, setSaveMessage] = useState(false);

  const handleProfileSelect = (id: string) => {
    setActiveConstraintProfile(id);
    const found = allConstraintProfiles.find((p) => p.id === id);
    if (found) setEditingProfile({ ...found });
  };

  const handleSave = () => {
    saveConstraintProfile(editingProfile);
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 2500);
  };

  const handleReset = () => {
    resetConstraintsToDefault();
    setEditingProfile({ ...activeConstraintProfile });
  };

  const updateParamRange = (
    key: keyof MainParameters,
    field: 'normalMin' | 'normalMax' | 'warningMin' | 'warningMax',
    val: number
  ) => {
    setEditingProfile((prev) => ({
      ...prev,
      paramConfigs: {
        ...prev.paramConfigs,
        [key]: {
          ...prev.paramConfigs[key],
          [field]: val,
        },
      },
    }));
  };

  const updateWeight = (
    key: keyof MainParameters,
    val: number
  ) => {
    setEditingProfile((prev) => ({
      ...prev,
      paramConfigs: {
        ...prev.paramConfigs,
        [key]: {
          ...prev.paramConfigs[key],
          weight: val,
        },
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Constraint Profiles &amp; Metrology Calibration Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure process node tolerances, scoring weights, and defect probability curves for FinFET lithography.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile</span>
            </button>
          </div>
        </div>

        {saveMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile successfully saved to fab metrology registry. Audit entry logged.</span>
          </div>
        )}

        {/* Profile Selector & Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-slate-700 font-semibold block mb-1">Select Process Node Profile:</label>
            <select
              value={editingProfile.id}
              onChange={(e) => handleProfileSelect(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allConstraintProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.processNode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Profile Name:</label>
            <input
              type="text"
              value={editingProfile.name}
              onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-slate-700 font-semibold block mb-1">Target Process Node:</label>
            <select
              value={editingProfile.processNode}
              onChange={(e) =>
                setEditingProfile({
                  ...editingProfile,
                  processNode: e.target.value as ConstraintProfile['processNode'],
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="28nm Planar">28nm Planar</option>
              <option value="14nm FinFET">14nm FinFET</option>
              <option value="7nm FinFET">7nm FinFET</option>
              <option value="5nm GAA">5nm GAA</option>
              <option value="3nm GAA">3nm GAA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Parameter Ranges Configuration Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Process Threshold Ranges &amp; Limits</h3>
          <p className="text-xs text-slate-500">
            Define boundaries for normal operating baseline, warning window, and scoring importance weight.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2.5 px-3">Parameter Name</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Normal Range (Min - Max)</th>
                <th className="py-2.5 px-3">Warning Max</th>
                <th className="py-2.5 px-3">Parameter Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
              {Object.entries(editingProfile.paramConfigs).map(([key, config]) => {
                const paramKey = key as keyof MainParameters;

                return (
                  <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">
                      {config.label}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-sans">{config.unit}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={config.normalMin}
                          onChange={(e) =>
                            updateParamRange(paramKey, 'normalMin', parseFloat(e.target.value) || 0)
                          }
                          className="w-18 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="number"
                          step="0.1"
                          value={config.normalMax}
                          onChange={(e) =>
                            updateParamRange(paramKey, 'normalMax', parseFloat(e.target.value) || 0)
                          }
                          className="w-18 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step="0.1"
                        value={config.warningMax}
                        onChange={(e) =>
                          updateParamRange(paramKey, 'warningMax', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 bg-slate-50 border border-amber-300 rounded px-2 py-1 text-xs font-mono font-bold text-amber-800"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0.2"
                          max="3.0"
                          step="0.1"
                          value={config.weight}
                          onChange={(e) => updateWeight(paramKey, parseFloat(e.target.value) || 1.0)}
                          className="w-24 accent-blue-600"
                        />
                        <span className="font-mono text-slate-700 font-bold">
                          {config.weight.toFixed(1)}x
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transparent Model Math & ML Interchange Explanation */}
      <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-5 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-blue-950 font-bold">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span>Transparent Rule-Based Scoring Formula</span>
        </div>
        <p className="text-slate-700 leading-relaxed font-sans">
          The prototype evaluation engine calculates total die defect probability through a weighted spatial vector:{' '}
          <code className="bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-blue-900 font-bold">
            P(Defect) = Σ (w_i × (Val_i - Normal_i) / (Warning_i - Normal_i)) + SpatialFactor(r)
          </code>
          . Dies are categorized into Excellent (&gt;92% yield), Acceptable (85-92%), Watch (75-85%), and Reject for Review (&lt;75%).
        </p>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          <strong>Machine Learning Interchange:</strong> This modular rule-based scoring module is deliberately isolated in <code className="font-mono bg-white px-1 py-0.5 rounded border">simulationEngine.ts</code>. In a high-volume fab environment, it can be dropped and replaced by an ONNX, PyTorch, or TensorFlow inference server without changing any frontend components or database schemas.
        </p>
      </div>

      {/* Audit Log of Profile Changes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Metrology Calibration Audit Ledger</span>
            </h3>
            <p className="text-xs text-slate-500">Immutable record of changes to process thresholds</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{auditLogs.length} Events Logged</span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-bold text-slate-900">{log.action}: </span>
                <span className="text-slate-700 font-sans">{log.details}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {log.timestamp} • By: <strong className="text-slate-600 font-sans">{log.user}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

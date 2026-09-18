import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Download,
  Copy,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { DefectReductionAction } from '../types';

interface RecommendationsPageProps {
  onNavigate: (page: string) => void;
}

export const RecommendationsPage: React.FC<RecommendationsPageProps> = ({ onNavigate }) => {
  const { defectActions, updateActionStatus, activeWafer } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<'all' | DefectReductionAction['status']>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | DefectReductionAction['urgency']>('all');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Filter actions
  const filteredActions = useMemo(() => {
    return defectActions.filter((act) => {
      if (statusFilter !== 'all' && act.status !== statusFilter) return false;
      if (urgencyFilter !== 'all' && act.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [defectActions, statusFilter, urgencyFilter]);

  const handleCopyPlan = () => {
    const text = defectActions
      .map(
        (a, i) =>
          `${i + 1}. [${a.urgency.toUpperCase()}] ${a.suspectedCause} - Status: ${a.status.toUpperCase()}\nEvidence: ${a.evidence}\nAction: ${a.recommendedAction}\nExpected Effect: ${a.expectedEffect}\nVerification: ${a.verificationStep}\n`
      )
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(defectActions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `WaferGuard_Defect_Actions_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Actionable Defect Reduction &amp; Process Corrective Actions
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Engineering recommendations generated from wafer spatial patterns, metrology excursion analysis, and fab constraints.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPlan}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copyFeedback ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Action Plan</span>
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-slate-500 block">Total Active Actions</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
              {defectActions.filter((a) => a.status !== 'Executed').length} Pending
            </span>
            <span className="text-[11px] text-slate-400">
              {defectActions.filter((a) => a.status === 'Executed').length} executed this cycle
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-slate-500 block">Primary Target Excursion</span>
            <span className="text-sm font-bold text-blue-700 mt-1 block truncate">
              {activeWafer?.dominantDefectCategory || 'Lithography Misalignment'}
            </span>
            <span className="text-[11px] text-slate-500">
              Affecting active 300mm substrate run
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <span className="text-slate-500 block">Most Critical Bottleneck</span>
            <span className="text-sm font-bold text-indigo-700 mt-1 block truncate">
              {activeWafer?.mostInfluentialParameter || 'Lithography Alignment Error'}
            </span>
            <span className="text-[11px] text-slate-500">
              Correlated with edge pattern excursion
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter By Status:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {(['all', 'Pending Review', 'Approved', 'Executed', 'Dismissed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Urgency:</span>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Urgencies</option>
            <option value="Immediate containment">Immediate containment</option>
            <option value="Process investigation">Process investigation</option>
            <option value="Corrective action">Corrective action</option>
            <option value="Verification on the next test layer">Verification on next layer</option>
          </select>
        </div>
      </div>

      {/* Actions List Grid */}
      <div className="space-y-4">
        {filteredActions.map((action) => {
          const isExecuted = action.status === 'Executed';

          return (
            <div
              key={action.id}
              className={`bg-white rounded-xl border p-5 transition-all space-y-3 ${
                isExecuted
                  ? 'border-slate-200 opacity-75 bg-slate-50/50'
                  : 'border-slate-200 shadow-xs hover:border-blue-200'
              }`}
            >
              {/* Top Row: Title, Urgency, Status */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                        action.urgency === 'Immediate containment'
                          ? 'bg-rose-100 text-rose-800'
                          : action.urgency === 'Process investigation'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {action.urgency}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      Affected: {action.affectedDiesCount} Dies
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Confidence: {action.confidenceScore}%
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {action.suspectedCause}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Physical Evidence:</strong> {action.evidence}
                  </p>
                </div>

                {/* Right Status Selector */}
                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <select
                    value={action.status}
                    onChange={(e) =>
                      updateActionStatus(action.id, e.target.value as DefectReductionAction['status'])
                    }
                    className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Executed">Executed</option>
                    <option value="Dismissed">Dismissed</option>
                  </select>
                </div>
              </div>

              {/* Recommended Action & Expected Effect */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200/80 text-xs">
                <div>
                  <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide block">
                    Recommended Engineering Action:
                  </span>
                  <p className="text-slate-700 mt-0.5 leading-relaxed text-[11px]">
                    {action.recommendedAction}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wide block">
                    Expected Metrology Effect:
                  </span>
                  <p className="text-emerald-900 mt-0.5 leading-relaxed text-[11px] font-medium">
                    {action.expectedEffect}
                  </p>
                </div>
              </div>

              {/* Verification Protocol */}
              <div className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800">Verification Protocol:</strong> {action.verificationStep}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

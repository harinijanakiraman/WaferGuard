import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Trash2,
  RotateCcw,
  Copy,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../lib/store';
import { AnalysisHistoryRecord } from '../types';

interface HistoryPageProps {
  onNavigate: (page: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const {
    analysisHistory,
    loadHistoricalAnalysis,
    duplicateHistoricalAnalysis,
    deleteHistoryItem,
    clearAllHistory,
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<'all' | 'Excellent' | 'Acceptable' | 'Watch' | 'Reject for Review'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  // Filter and search
  const filteredHistory = useMemo(() => {
    return analysisHistory.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.waferId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batchId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesClass =
        classFilter === 'all' || item.classification === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [analysisHistory, searchTerm, classFilter]);

  const handleExportCSV = () => {
    if (analysisHistory.length === 0) return;
    const headers = [
      'AnalysisID',
      'Timestamp',
      'WaferID',
      'BatchID',
      'Wafers',
      'YieldPct',
      'DefectRatePct',
      'GoodDies',
      'DefectiveDies',
      'Classification',
      'Particles',
      'LithoOverlayNm',
      'CDDeviationNm',
      'TempC',
      'HumidityRH',
      'DominantPattern',
    ];

    const rows = analysisHistory.map((item) => [
      item.id,
      item.timestamp,
      item.waferId,
      item.batchId,
      item.numberOfWafers,
      item.yield,
      item.defectRate,
      item.goodDieCount,
      item.defectiveDieCount,
      item.classification,
      item.parameters.particleContamination,
      item.parameters.lithoAlignmentError,
      item.parameters.cdDeviation,
      item.parameters.temperature,
      item.parameters.relativeHumidity,
      item.dominantDefectType,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WaferGuard_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                Wafer Screening History &amp; Metrology Audit Trail
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive log of all wafer screening runs, parameter inputs, and quality classifications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={analysisHistory.length === 0}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    clearAllHistory();
                    setConfirmClear(false);
                  }}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-bold"
                >
                  Confirm Delete All
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={analysisHistory.length === 0}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-lg text-xs font-semibold border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Wafer ID, Batch ID, or Run ID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Classification:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes</option>
              <option value="Excellent">Excellent</option>
              <option value="Acceptable">Acceptable</option>
              <option value="Watch">Watch</option>
              <option value="Reject for Review">Reject for Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2.5 px-3">Run ID / Timestamp</th>
                <th className="py-2.5 px-3">Wafer &amp; Batch</th>
                <th className="py-2.5 px-3">Wafers</th>
                <th className="py-2.5 px-3">Yield</th>
                <th className="py-2.5 px-3">Defect %</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3">Process Params (P/L/CD/T/RH)</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No historical analysis records match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <strong className="text-blue-700 block">{item.id}</strong>
                      <span className="text-[10px] text-slate-400 font-sans">
                        {item.timestamp.replace('T', ' ').substring(0, 16)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <strong className="text-slate-900 block">{item.waferId}</strong>
                      <span className="text-[10px] text-slate-500 font-sans">{item.batchId}</span>
                    </td>
                    <td className="py-3 px-3 font-sans">{item.numberOfWafers}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">{item.yield}%</td>
                    <td className="py-3 px-3 font-bold text-rose-600">{item.defectRate}%</td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.classification === 'Excellent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.classification === 'Acceptable'
                            ? 'bg-blue-100 text-blue-800'
                            : item.classification === 'Watch'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.classification}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500 font-sans">
                      {item.parameters.particleContamination} / {item.parameters.lithoAlignmentError}nm /{' '}
                      {item.parameters.cdDeviation}nm / {item.parameters.temperature}°C /{' '}
                      {item.parameters.relativeHumidity}%
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            loadHistoricalAnalysis(item);
                            onNavigate('test-wafer');
                          }}
                          className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Reload in 2D / 3D Viewer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            duplicateHistoricalAnalysis(item);
                            onNavigate('test-wafer');
                          }}
                          className="p-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Clone Parameters for New Test"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import {
  Wafer,
  Batch,
  Die,
  MainParameters,
  ConstraintProfile,
  DefectReductionAction,
  CleanroomZone,
  EnvironmentalExcursion,
  AnalysisHistoryRecord,
  AuditLog,
} from '../types';
import {
  PROTOTYPE_DEFAULT_PARAMETERS,
  DEFAULT_CONSTRAINT_PROFILE,
  ALTERNATIVE_CONSTRAINT_PROFILE,
  CLEANROOM_ZONES,
  RECENT_EXCURSIONS,
  DEFAULT_DEFECT_ACTIONS,
} from './presets';
import { generateBatchAnalysis } from './simulationEngine';

interface AppState {
  currentParameters: MainParameters;
  activeConstraintProfile: ConstraintProfile;
  allConstraintProfiles: ConstraintProfile[];
  activeBatch: Batch | null;
  activeWafer: Wafer | null;
  selectedDie: Die | null;
  testWafer: Wafer | null;
  defectActions: DefectReductionAction[];
  cleanroomZones: CleanroomZone[];
  excursions: EnvironmentalExcursion[];
  analysisHistory: AnalysisHistoryRecord[];
  auditLogs: AuditLog[];
  isAnalyzing: boolean;
  analysisProgress: number;
  lastError: string | null;
  activePage: string;
}

// Generate initial demo batch (Standard 25-wafer FOUP lot showcasing the 3-phase trend)
const initialBatchRun = generateBatchAnalysis(
  PROTOTYPE_DEFAULT_PARAMETERS,
  25,
  DEFAULT_CONSTRAINT_PROFILE,
  'LOT-2026-N7-FOUP',
  'WFR-300-8841-01'
);

const initialHistoryRecord: AnalysisHistoryRecord = {
  id: 'ANL-2026-0918-001',
  timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  operator: 'Dr. H. Janakiraman (Fab Metrology Lead)',
  waferId: initialBatchRun.testWafer.id,
  batchId: initialBatchRun.batch.id,
  numberOfWafers: 25,
  constraintProfileVersion: DEFAULT_CONSTRAINT_PROFILE.version,
  parameters: { ...PROTOTYPE_DEFAULT_PARAMETERS },
  goodDieCount: initialBatchRun.testWafer.goodDies + initialBatchRun.testWafer.minorConcernDies,
  defectiveDieCount: initialBatchRun.testWafer.defectiveDies,
  defectRate: initialBatchRun.testWafer.defectRate,
  yield: initialBatchRun.testWafer.dieYield,
  classification: initialBatchRun.testWafer.qualityClass,
  dominantDefectType: initialBatchRun.testWafer.dominantDefectCategory,
  recommendations: [
    'Execute reticle stage overlay calibration on Litho Bay 1.',
    'Inspect FOUP carrier cleanliness before releasing subsequent lot.',
  ],
  modelVersion: 'WaferGuard-RuleEngine-v2.4',
  inputFileName: 'Prototype_FinFET_Screening.csv',
  testWafer: initialBatchRun.testWafer,
  batchWafers: initialBatchRun.batch.wafers,
};

// Initial state singleton
let state: AppState = {
  currentParameters: { ...PROTOTYPE_DEFAULT_PARAMETERS },
  activeConstraintProfile: { ...DEFAULT_CONSTRAINT_PROFILE },
  allConstraintProfiles: [{ ...DEFAULT_CONSTRAINT_PROFILE }, { ...ALTERNATIVE_CONSTRAINT_PROFILE }],
  activeBatch: initialBatchRun.batch,
  activeWafer: initialBatchRun.testWafer,
  selectedDie: initialBatchRun.testWafer.dies.find((d) => d.status === 'severe_defect') || initialBatchRun.testWafer.dies[0],
  testWafer: initialBatchRun.testWafer,
  defectActions: [...DEFAULT_DEFECT_ACTIONS],
  cleanroomZones: [...CLEANROOM_ZONES],
  excursions: [...RECENT_EXCURSIONS],
  analysisHistory: [initialHistoryRecord],
  auditLogs: [
    {
      id: 'AUDIT-001',
      timestamp: '2026-09-18 08:30:00',
      action: 'Profile Loaded',
      details: 'Loaded 7nm FinFET Production Screening (Demo) v2.4',
      user: 'System Boot',
    },
    {
      id: 'AUDIT-002',
      timestamp: '2026-09-18 09:15:22',
      action: 'Batch Analysis Completed',
      details: 'Analyzed LOT-2026-N7-DEMO (10 wafers, avg yield 90.8%)',
      user: 'Dr. H. Janakiraman',
    },
  ],
  isAnalyzing: false,
  analysisProgress: 0,
  lastError: null,
  activePage: 'dashboard',
};

// Listener system for React re-renders
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const useAppStore = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((t) => t + 1);
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const setActivePage = (page: string) => {
    state.activePage = page;
    notify();
  };

  const updateParameters = (newParams: Partial<MainParameters>) => {
    state.currentParameters = { ...state.currentParameters, ...newParams };
    notify();
  };

  const setActiveWafer = (wafer: Wafer | null) => {
    state.activeWafer = wafer;
    if (wafer && wafer.dies.length > 0) {
      // Keep selected die or select first defect
      const defectDie = wafer.dies.find((d) => d.status === 'severe_defect' || d.status === 'probable_defect');
      state.selectedDie = defectDie || wafer.dies[0];
    } else {
      state.selectedDie = null;
    }
    notify();
  };

  const setSelectedDie = (die: Die | null) => {
    state.selectedDie = die;
    notify();
  };

  const setActiveConstraintProfile = (profileId: string) => {
    const found = state.allConstraintProfiles.find((p) => p.id === profileId);
    if (found) {
      const prev = state.activeConstraintProfile.name;
      state.activeConstraintProfile = { ...found };
      state.auditLogs.unshift({
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Constraint Profile Activated',
        details: `Switched from "${prev}" to "${found.name}"`,
        user: 'Active Engineer',
        previousValue: prev,
        newValue: found.name,
      });
      notify();
    }
  };

  const saveConstraintProfile = (profile: ConstraintProfile) => {
    const idx = state.allConstraintProfiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) {
      state.allConstraintProfiles[idx] = { ...profile, lastUpdated: new Date().toISOString().split('T')[0] };
    } else {
      state.allConstraintProfiles.push({ ...profile, lastUpdated: new Date().toISOString().split('T')[0] });
    }
    if (state.activeConstraintProfile.id === profile.id) {
      state.activeConstraintProfile = { ...profile };
    }
    state.auditLogs.unshift({
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'Constraint Profile Saved',
      details: `Saved profile "${profile.name}" (v${profile.version})`,
      user: 'Active Engineer',
    });
    notify();
  };

  const resetConstraintsToDefault = () => {
    state.activeConstraintProfile = { ...DEFAULT_CONSTRAINT_PROFILE };
    state.auditLogs.unshift({
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'Reset Constraints',
      details: 'Reset calibration parameters to prototype demo defaults.',
      user: 'Active Engineer',
    });
    notify();
  };

  const updateActionStatus = (actionId: string, newStatus: DefectReductionAction['status']) => {
    state.defectActions = state.defectActions.map((act) =>
      act.id === actionId ? { ...act, status: newStatus } : act
    );
    notify();
  };

  const runAnalysis = async (
    batchSize: number = 25,
    customBatchId?: string,
    customWaferId?: string,
    uploadedFileName?: string
  ) => {
    state.isAnalyzing = true;
    state.analysisProgress = 15;
    state.lastError = null;
    notify();

    try {
      // Step-by-step simulated pipeline progress
      await new Promise((resolve) => setTimeout(resolve, 300));
      state.analysisProgress = 45;
      notify();

      await new Promise((resolve) => setTimeout(resolve, 350));
      state.analysisProgress = 80;
      notify();

      // Perform simulation
      const { testWafer, batch } = generateBatchAnalysis(
        state.currentParameters,
        batchSize,
        state.activeConstraintProfile,
        customBatchId,
        customWaferId
      );

      await new Promise((resolve) => setTimeout(resolve, 250));
      state.analysisProgress = 100;

      state.testWafer = testWafer;
      state.activeWafer = testWafer;
      state.activeBatch = batch;
      state.selectedDie = testWafer.dies.find((d) => d.status === 'severe_defect') || testWafer.dies[0];

      // Save into history
      const historyItem: AnalysisHistoryRecord = {
        id: `ANL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        operator: 'Active Fab Engineer',
        waferId: testWafer.id,
        batchId: batch.id,
        numberOfWafers: batchSize,
        constraintProfileVersion: state.activeConstraintProfile.version,
        parameters: { ...state.currentParameters },
        goodDieCount: testWafer.goodDies + testWafer.minorConcernDies,
        defectiveDieCount: testWafer.defectiveDies,
        defectRate: testWafer.defectRate,
        yield: testWafer.dieYield,
        classification: testWafer.qualityClass,
        dominantDefectType: testWafer.dominantDefectCategory,
        recommendations: [
          `Address ${testWafer.mostInfluentialParameter} variation.`,
          `Verify ${testWafer.dominantDefectPattern} pattern mitigation on subsequent lot.`,
        ],
        modelVersion: 'WaferGuard-RuleEngine-v2.4',
        inputFileName: uploadedFileName || (batchSize === 1 ? 'Single_Wafer_Run.csv' : `Batch_${batchSize}_Wafers.csv`),
        testWafer,
        batchWafers: batch.wafers,
      };

      state.analysisHistory.unshift(historyItem);

      state.auditLogs.unshift({
        id: `AUDIT-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: 'Batch Analyzed',
        details: `Analyzed batch ${batch.id} (${batchSize} wafers, yield ${batch.avgYield}%, class: ${testWafer.qualityClass})`,
        user: 'Active Engineer',
      });

      state.isAnalyzing = false;
      notify();
    } catch (err) {
      state.isAnalyzing = false;
      state.lastError = err instanceof Error ? err.message : 'An unexpected error occurred during wafer analysis.';
      notify();
    }
  };

  const loadHistoricalAnalysis = (record: AnalysisHistoryRecord) => {
    state.testWafer = record.testWafer;
    state.activeWafer = record.testWafer;
    state.currentParameters = { ...record.parameters };
    if (record.batchWafers && record.batchWafers.length > 0) {
      const avgYield = Math.round((record.batchWafers.reduce((acc, w) => acc + w.dieYield, 0) / record.batchWafers.length) * 10) / 10;
      const avgDefect = Math.round((record.batchWafers.reduce((acc, w) => acc + w.defectRate, 0) / record.batchWafers.length) * 10) / 10;
      state.activeBatch = {
        id: record.batchId,
        name: `${record.batchId} (${record.numberOfWafers} Wafers)`,
        testWaferId: record.waferId,
        batchSize: record.numberOfWafers,
        wafers: record.batchWafers,
        avgYield,
        avgDefectRate: avgDefect,
        criticalWafersCount: record.batchWafers.filter((w) => w.qualityClass === 'Reject for Review' || w.qualityClass === 'At Risk').length,
        mostCommonDefect: record.dominantDefectType,
        mostInfluentialParam: record.testWafer.mostInfluentialParameter,
        createdAt: record.timestamp,
      };
    }
    state.selectedDie = record.testWafer.dies.find((d) => d.status === 'severe_defect') || record.testWafer.dies[0];
    state.activePage = 'test-wafer';
    notify();
  };

  const duplicateHistoricalAnalysis = (record: AnalysisHistoryRecord) => {
    state.currentParameters = { ...record.parameters };
    state.activePage = 'test-wafer';
    notify();
  };

  const deleteHistoryItem = (id: string) => {
    state.analysisHistory = state.analysisHistory.filter((item) => item.id !== id);
    state.auditLogs.unshift({
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'History Record Deleted',
      details: `Deleted analysis record ${id}`,
      user: 'Active Engineer',
    });
    notify();
  };

  const clearAllHistory = () => {
    state.analysisHistory = [];
    state.auditLogs.unshift({
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      action: 'History Cleared',
      details: 'All historical test records removed.',
      user: 'Active Engineer',
    });
    notify();
  };

  return {
    ...state,
    setActivePage,
    updateParameters,
    setActiveWafer,
    setSelectedDie,
    setActiveConstraintProfile,
    saveConstraintProfile,
    resetConstraintsToDefault,
    updateActionStatus,
    runAnalysis,
    loadHistoricalAnalysis,
    duplicateHistoricalAnalysis,
    deleteHistoryItem,
    clearAllHistory,
  };
};

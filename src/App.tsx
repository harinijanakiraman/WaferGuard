import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { TestWaferPage } from './pages/TestWaferPage';
import { LayerComparison3DPage } from './pages/LayerComparison3DPage';
import { BatchComparisonPage } from './pages/BatchComparisonPage';
import { BinAnalysisPage } from './pages/BinAnalysisPage';
import { DefectAnalyticsPage } from './pages/DefectAnalyticsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { CleanroomPage } from './pages/CleanroomPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { HistoryPage } from './pages/HistoryPage';
import { useAppStore } from './lib/store';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const { activePage, setActivePage, lastError, runAnalysis } = useAppStore();

  const handleRunQuickTest = () => {
    setActivePage('test-wafer');
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActivePage} />;
      case 'test-wafer':
        return <TestWaferPage onNavigate={setActivePage} />;
      case 'layer-comparison':
        return <LayerComparison3DPage />;
      case 'bin-analysis':
        return <BinAnalysisPage onNavigate={setActivePage} />;
      case 'batch-comparison':
        return <BatchComparisonPage onNavigate={setActivePage} />;
      case 'defect-analytics':
        return <DefectAnalyticsPage onNavigate={setActivePage} />;
      case 'recommendations':
        return <RecommendationsPage onNavigate={setActivePage} />;
      case 'cleanroom':
        return <CleanroomPage onNavigate={setActivePage} />;
      case 'calibration':
        return <CalibrationPage onNavigate={setActivePage} />;
      case 'history':
        return <HistoryPage onNavigate={setActivePage} />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f4f8fa] text-slate-900 overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <Header onRunTest={handleRunQuickTest} />

        {/* Global Error Notification if any */}
        {lastError && (
          <div className="mx-6 mt-4 p-3 bg-teal-950 text-teal-100 border border-teal-700/60 rounded-xl text-xs flex items-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{lastError}</span>
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

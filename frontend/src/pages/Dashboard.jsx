import React from 'react';
import HomePage from './HomePage';
import AnalyzePage from './AnalyzePage';
import ResultsPage from './ResultsPage';
import MapPage from './MapPage';
import HistoryPage from './HistoryPage';
import SettingsPage from './SettingsPage';

const Dashboard = ({
  activeTab = 'home',
  setActiveTab,
  currentAnalysis,
  setCurrentAnalysis,
  analysisHistory = [],
  setAnalysisHistory,
  analysisStatus,
  setAnalysisStatus,
  currentStage,
  setCurrentStage
}) => {
  return (
    <div>
      {/* 1. HOME TAB */}
      {activeTab === 'home' && (
        <HomePage 
          setActiveTab={setActiveTab}
          currentAnalysis={currentAnalysis}
          analysisHistory={analysisHistory}
        />
      )}

      {/* 2. ANALYZE IMAGE TAB */}
      {activeTab === 'analyze' && (
        <AnalyzePage 
          currentAnalysis={currentAnalysis}
          setCurrentAnalysis={setCurrentAnalysis}
          analysisStatus={analysisStatus}
          setAnalysisStatus={setAnalysisStatus}
          currentStage={currentStage}
          setCurrentStage={setCurrentStage}
          analysisHistory={analysisHistory}
          setAnalysisHistory={setAnalysisHistory}
          setActiveTab={setActiveTab}
        />
      )}

      {/* 3. RESULTS TAB */}
      {activeTab === 'results' && (
        <ResultsPage 
          currentAnalysis={currentAnalysis}
          analysisHistory={analysisHistory}
          setActiveTab={setActiveTab}
        />
      )}

      {/* 4. CYCLONE MAP TAB */}
      {activeTab === 'map' && (
        <MapPage 
          currentAnalysis={currentAnalysis}
        />
      )}

      {/* 5. HISTORY TAB */}
      {activeTab === 'history' && (
        <HistoryPage 
          analysisHistory={analysisHistory}
          setCurrentAnalysis={setCurrentAnalysis}
          setActiveTab={setActiveTab}
        />
      )}

      {/* 6. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <SettingsPage />
      )}
    </div>
  );
};

export default Dashboard;

import React from 'react';
import HomePage from './HomePage';
import AnalyzePage from './AnalyzePage';
import ResultsPage from './ResultsPage';
import MapPage from './MapPage';
import HistoryPage from './HistoryPage';
import SettingsPage from './SettingsPage';
import SevenDaysPrediction from './SevenDaysPrediction';
import LogsPage from './LogsPage';
import UserManagementPage from './UserManagementPage';
import ErrorBoundary from '../components/ErrorBoundary';

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
  setCurrentStage,
  adminUser
}) => {
  return (
    <ErrorBoundary fallbackAction={() => setActiveTab('home')}>
      <div>
      {/* 1. HOME TAB */}
      {activeTab === 'home' && (
        <HomePage 
          setActiveTab={setActiveTab}
          currentAnalysis={currentAnalysis}
          analysisHistory={analysisHistory}
          adminUser={adminUser}
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
          setAnalysisHistory={setAnalysisHistory}
          setCurrentAnalysis={setCurrentAnalysis}
          setActiveTab={setActiveTab}
        />
      )}

      {/* 6. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <SettingsPage />
      )}

      {/* 7. 7 DAYS PREDICTION TAB */}
      {activeTab === 'prediction' && (
        <SevenDaysPrediction currentAnalysis={currentAnalysis} />
      )}

      {/* 8. SYSTEM LOGS TAB */}
      {activeTab === 'logs' && (
        <LogsPage 
          currentAnalysis={currentAnalysis} 
          analysisHistory={analysisHistory} 
          setActiveTab={setActiveTab}
        />
      )}

      {/* 9. USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <UserManagementPage />
      )}
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;

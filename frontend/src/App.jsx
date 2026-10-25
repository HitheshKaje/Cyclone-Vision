import React, { useState, useEffect, lazy, Suspense } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';

const CitizenApp = lazy(() => import('./citizen/CitizenApp'));

function App() {
  const [currentPath, setCurrentPath] = useState(() => 
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [activeTab, setActiveTab] = useState('home');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [currentStage, setCurrentStage] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Auto-migrate any legacy port 8000 to active backend port 8001
    try {
      const stored = localStorage.getItem('API_BASE_URL');
      if (stored && stored.includes(':8000')) {
        localStorage.setItem('API_BASE_URL', stored.replace(':8000', ':8001'));
      }
    } catch (_) {}

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  // If path is for the Citizen Portal (/citizen, /citizen/map, etc.) or dedicated Lighthouse Station (/lighthouse)
  if (currentPath.startsWith('/citizen') || currentPath === '/lighthouse') {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 font-semibold text-sm">
          Loading CycloSafe...
        </div>
      }>
        <CitizenApp
          currentPath={currentPath}
          onNavigate={navigateTo}
          onSwitchToAdmin={() => navigateTo('/')}
        />
      </Suspense>
    );
  }

  // Otherwise, render existing Admin Dashboard completely untouched
  return (
    <MainLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      onNavigateToCitizen={() => navigateTo('/citizen')}
      onNavigateToLighthouse={() => navigateTo('/lighthouse')}
    >
      <Dashboard 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        currentAnalysis={currentAnalysis}
        setCurrentAnalysis={setCurrentAnalysis}
        analysisHistory={analysisHistory}
        setAnalysisHistory={setAnalysisHistory}
        analysisStatus={analysisStatus}
        setAnalysisStatus={setAnalysisStatus}
        currentStage={currentStage}
        setCurrentStage={setCurrentStage}
      />
    </MainLayout>
  );
}

export default App;


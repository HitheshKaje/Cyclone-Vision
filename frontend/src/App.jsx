import React, { useState, useEffect, lazy, Suspense } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import { getAdminAuth, logoutAdmin } from './utils/authService';
import { fetchAnalysisHistory } from './utils/analysisApi';

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
  const [adminUser, setAdminUser] = useState(() => getAdminAuth());

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme') || localStorage.getItem('cyclosafe_theme');
      if (savedTheme !== null) {
        return savedTheme === 'dark';
      }
    } catch (_) {}
    return false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
        localStorage.setItem('cyclosafe_theme', next ? 'dark' : 'light');
      } catch (_) {}
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('API_BASE_URL');
      if (stored && (stored.includes(':8000') || stored.includes(':8005'))) {
        localStorage.setItem(
          'API_BASE_URL',
          stored.replace(':8000', ':8001').replace(':8005', ':8001')
        );
      }
    } catch (_) {}

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setAdminUser(getAdminAuth());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Dynamically load analysis records directly from MongoDB on mount
  useEffect(() => {
    let isMounted = true;
    const loadMongoRecords = async () => {
      try {
        const res = await fetchAnalysisHistory(200);
        if (isMounted && res.success && Array.isArray(res.records)) {
          setAnalysisHistory(res.records);
        }
      } catch (err) {
        console.warn('[App] MongoDB analysis load error:', err);
      }
    };
    loadMongoRecords();
    return () => { isMounted = false; };
  }, []);

  const navigateTo = (path) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      setAdminUser(getAdminAuth());
    }
  };

  const handleAdminLogout = () => {
    logoutAdmin();
    setAdminUser(null);
    navigateTo('/admin/login');
  };

  const handleUserLoginSuccess = (user) => {
    if (user?.user_type === 'fisherman') {
      navigateTo('/fisherman');
    } else {
      navigateTo('/citizen');
    }
  };

  // 1. ROUTE: Admin Dedicated Login Page (/admin/login)
  if (currentPath === '/admin/login') {
    return (
      <AuthPage
        portalType="admin"
        initialMode="login"
        onAdminSuccess={() => {
          setAdminUser(getAdminAuth());
          navigateTo('/admin');
        }}
        onUserSuccess={handleUserLoginSuccess}
        onNavigate={navigateTo}
      />
    );
  }

  // 2. ROUTE: Dedicated Fisherman Login & Register (/fisherman/login, /fisherman/register)
  if (currentPath === '/fisherman/login' || currentPath === '/fisherman/register') {
    return (
      <AuthPage
        portalType="fisherman"
        initialMode={currentPath === '/fisherman/register' ? 'register' : 'login'}
        onAdminSuccess={() => {
          setAdminUser(getAdminAuth());
          navigateTo('/admin');
        }}
        onUserSuccess={handleUserLoginSuccess}
        onNavigate={navigateTo}
      />
    );
  }

  // 3. ROUTE: Dedicated Citizen Login & Register (/citizen/login, /citizen/register, /login, /register, /user/login)
  if (
    currentPath === '/citizen/login' || 
    currentPath === '/citizen/register' || 
    currentPath === '/login' || 
    currentPath === '/register' || 
    currentPath === '/user/login'
  ) {
    return (
      <AuthPage
        portalType="citizen"
        initialMode={currentPath === '/register' || currentPath === '/citizen/register' ? 'register' : 'login'}
        onAdminSuccess={() => {
          setAdminUser(getAdminAuth());
          navigateTo('/admin');
        }}
        onUserSuccess={handleUserLoginSuccess}
        onNavigate={navigateTo}
      />
    );
  }

  // 4. ROUTE: Citizen & Fisherman Coastal Safety Portals (/citizen, /fisherman, /lighthouse)
  if (
    currentPath.startsWith('/citizen') || 
    currentPath.startsWith('/fisherman') || 
    currentPath === '/lighthouse'
  ) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm">
          Loading CycloSafe...
        </div>
      }>
        <CitizenApp
          currentPath={currentPath}
          onNavigate={navigateTo}
        />
      </Suspense>
    );
  }

  // 5. ROUTE: Protected Admin Command Center (/admin, /, or other admin routes)
  // Enforces authentication: If unauthenticated, render AuthPage in Admin mode
  if (!adminUser) {
    return (
      <AuthPage
        portalType="admin"
        initialMode="login"
        onAdminSuccess={() => {
          setAdminUser(getAdminAuth());
          navigateTo('/admin');
        }}
        onUserSuccess={handleUserLoginSuccess}
        onNavigate={navigateTo}
      />
    );
  }

  // Render Admin Dashboard for authenticated administrators
  return (
    <MainLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      onLogout={handleAdminLogout}
      adminUser={adminUser}
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
        adminUser={adminUser}
      />
    </MainLayout>
  );
}

export default App;

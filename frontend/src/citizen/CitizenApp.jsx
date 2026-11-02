import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import CitizenLayout from './layouts/CitizenLayout';
import CitizenHome from './pages/CitizenHome';
import { Loader2 } from 'lucide-react';

const CycloneMap = lazy(() => import('./pages/CycloneMap'));
const WeatherSafety = lazy(() => import('./pages/WeatherSafety'));
const EmergencyInformation = lazy(() => import('./pages/EmergencyInformation'));
const LighthouseStation = lazy(() => import('./pages/LighthouseStation'));
const FishermanHome = lazy(() => import('./pages/FishermanHome'));

const PageLoader = () => {
  const { i18n } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-slate-500">
      <Loader2 size={32} className="animate-spin text-sky-500 mb-2" />
      <span className="text-xs font-semibold uppercase tracking-wider">
        {i18n.language === 'kn' ? 'ಕರಾವಳಿ ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading coastal data...'}
      </span>
    </div>
  );
};

const CitizenApp = ({ currentPath, onNavigate }) => {
  const isFishermanRoute = currentPath.startsWith('/fisherman');

  // Dedicated fullscreen Coastal Lighthouse Terminal (for user's secondary mobile phone)
  if (currentPath === '/lighthouse' || currentPath === '/citizen/lighthouse' || currentPath === '/fisherman/lighthouse') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LighthouseStation onNavigateBack={() => onNavigate(isFishermanRoute ? '/fisherman' : '/citizen')} />
      </Suspense>
    );
  }

  // DEDICATED FISHERMAN DASHBOARD
  // Renders directly WITHOUT CitizenLayout wrapper to ensure:
  // 1. Strictly the 3 required tabs: 1. Cyclone Info, 2. Sea Info, 3. Weather Info
  // 2. Zero duplicate headers
  // 3. Zero extra modules (No Emergency SOS, No Trip Planner, No Fish Breeding Advisory)
  if (isFishermanRoute) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
        <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex-1">
          <Suspense fallback={<PageLoader />}>
            <FishermanHome onNavigate={onNavigate} />
          </Suspense>
        </main>
      </div>
    );
  }

  // CITIZEN SAFETY PORTAL
  // Renders within CitizenLayout for general coastal citizens
  const renderCitizenContentPage = () => {
    switch (currentPath) {
      case '/citizen/map':
        return (
          <Suspense fallback={<PageLoader />}>
            <CycloneMap />
          </Suspense>
        );
      case '/citizen/weather':
        return (
          <Suspense fallback={<PageLoader />}>
            <WeatherSafety />
          </Suspense>
        );
      case '/citizen/emergency':
        return (
          <Suspense fallback={<PageLoader />}>
            <EmergencyInformation />
          </Suspense>
        );
      case '/citizen':
      case '/citizen/':
      default:
        return <CitizenHome onNavigate={onNavigate} />;
    }
  };

  return (
    <CitizenLayout
      currentPath={currentPath}
      onNavigate={onNavigate}
    >
      {renderCitizenContentPage()}
    </CitizenLayout>
  );
};

export default CitizenApp;

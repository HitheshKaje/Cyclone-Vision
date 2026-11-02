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

  const renderContentPage = () => {
    switch (currentPath) {
      case '/citizen/map':
      case '/fisherman/map':
        return (
          <Suspense fallback={<PageLoader />}>
            <CycloneMap />
          </Suspense>
        );
      case '/citizen/weather':
      case '/fisherman/weather':
        return (
          <Suspense fallback={<PageLoader />}>
            <WeatherSafety />
          </Suspense>
        );
      case '/citizen/emergency':
      case '/fisherman/emergency':
        return (
          <Suspense fallback={<PageLoader />}>
            <EmergencyInformation />
          </Suspense>
        );
      case '/fisherman':
      case '/fisherman/':
        return (
          <Suspense fallback={<PageLoader />}>
            <FishermanHome onNavigate={onNavigate} />
          </Suspense>
        );
      case '/citizen':
      case '/citizen/':
      default:
        // If currentPath starts with /fisherman, default to FishermanHome, otherwise CitizenHome
        if (isFishermanRoute) {
          return (
            <Suspense fallback={<PageLoader />}>
              <FishermanHome onNavigate={onNavigate} />
            </Suspense>
          );
        }
        return <CitizenHome onNavigate={onNavigate} />;
    }
  };

  return (
    <CitizenLayout
      currentPath={currentPath}
      onNavigate={onNavigate}
    >
      {renderContentPage()}
    </CitizenLayout>
  );
};

export default CitizenApp;

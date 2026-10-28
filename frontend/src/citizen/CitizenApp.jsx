import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import CitizenLayout from './layouts/CitizenLayout';
import CitizenHome from './pages/CitizenHome';
import { Loader2 } from 'lucide-react';

const CycloneMap = lazy(() => import('./pages/CycloneMap'));
const WeatherSafety = lazy(() => import('./pages/WeatherSafety'));
const EmergencyInformation = lazy(() => import('./pages/EmergencyInformation'));
const LighthouseStation = lazy(() => import('./pages/LighthouseStation'));

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
  // Dedicated fullscreen Coastal Lighthouse Terminal (for user's secondary mobile phone)
  if (currentPath === '/lighthouse' || currentPath === '/citizen/lighthouse') {
    return (
      <Suspense fallback={<PageLoader />}>
        <LighthouseStation onNavigateBack={() => onNavigate('/citizen')} />
      </Suspense>
    );
  }
  const renderCitizenPage = () => {
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
      {renderCitizenPage()}
    </CitizenLayout>
  );
};

export default CitizenApp;

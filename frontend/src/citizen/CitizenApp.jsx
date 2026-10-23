import React, { Suspense, lazy } from 'react';
import CitizenLayout from './layouts/CitizenLayout';
import CitizenHome from './pages/CitizenHome';
import { Loader2 } from 'lucide-react';

// Code-split non-essential sub-routes for budget Android devices
const CycloneMap = lazy(() => import('./pages/CycloneMap'));
const CycloneHistory = lazy(() => import('./pages/CycloneHistory'));
const WeatherSafety = lazy(() => import('./pages/WeatherSafety'));
const EmergencyInformation = lazy(() => import('./pages/EmergencyInformation'));
const LighthouseStation = lazy(() => import('./pages/LighthouseStation'));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-slate-500">
    <Loader2 size={32} className="animate-spin text-sky-500 mb-2" />
    <span className="text-xs font-semibold uppercase tracking-wider">Loading coastal data...</span>
  </div>
);

const CitizenApp = ({ currentPath, onNavigate, onSwitchToAdmin }) => {
  const renderCitizenPage = () => {
    switch (currentPath) {
      case '/citizen/map':
        return (
          <Suspense fallback={<PageLoader />}>
            <CycloneMap />
          </Suspense>
        );
      case '/citizen/history':
        return (
          <Suspense fallback={<PageLoader />}>
            <CycloneHistory />
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
      case '/citizen/lighthouse':
        return (
          <Suspense fallback={<PageLoader />}>
            <LighthouseStation />
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
      onSwitchToAdmin={onSwitchToAdmin}
    >
      {renderCitizenPage()}
    </CitizenLayout>
  );
};

export default CitizenApp;

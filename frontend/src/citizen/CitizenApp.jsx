import React from 'react';
import CitizenLayout from './layouts/CitizenLayout';
import CitizenHome from './pages/CitizenHome';
import CycloneMap from './pages/CycloneMap';
import CycloneHistory from './pages/CycloneHistory';
import WeatherSafety from './pages/WeatherSafety';
import EmergencyInformation from './pages/EmergencyInformation';

const CitizenApp = ({ currentPath, onNavigate, onSwitchToAdmin }) => {
  const renderCitizenPage = () => {
    switch (currentPath) {
      case '/citizen/map':
        return <CycloneMap />;
      case '/citizen/history':
        return <CycloneHistory />;
      case '/citizen/weather':
        return <WeatherSafety />;
      case '/citizen/emergency':
        return <EmergencyInformation />;
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

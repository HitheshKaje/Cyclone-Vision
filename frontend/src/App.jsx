import React, { useState } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} />
    </MainLayout>
  );
}

export default App;

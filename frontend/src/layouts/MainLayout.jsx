import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const MainLayout = ({ children, activeTab, setActiveTab }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isOpen={sidebarOpen} 
          isMobile={isMobile} 
          closeSidebar={() => isMobile && setSidebarOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        
        {/* Mobile Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-6 w-full">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

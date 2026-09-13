import React, { useState, useEffect } from 'react';
import { Menu, Clock, User, ShieldCheck, Sparkles, Orbit } from 'lucide-react';

const CycloneLogo = ({ className = "w-10 h-10" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-sm animate-pulse" />
    <svg viewBox="0 0 100 100" className="w-full h-full transform hover:rotate-45 transition-transform duration-700">
      <defs>
        <linearGradient id="cycloneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="cycloneCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#082f49" />
        </linearGradient>
      </defs>
      {/* Outer spiral arms */}
      <path
        d="M50 10 C68 10, 85 24, 88 44 C84 32, 70 24, 54 26 C36 28, 22 42, 22 60 C22 40, 34 20, 50 10 Z"
        fill="url(#cycloneGrad)"
        opacity="0.9"
      />
      <path
        d="M50 90 C32 90, 15 76, 12 56 C16 68, 30 76, 46 74 C64 72, 78 58, 78 40 C78 60, 66 80, 50 90 Z"
        fill="url(#cycloneGrad)"
        opacity="0.9"
      />
      {/* Inner Spiral */}
      <path
        d="M50 25 C62 25, 72 34, 74 46 C70 38, 60 34, 50 36 C38 38, 32 46, 32 55 C32 42, 40 30, 50 25 Z"
        fill="url(#cycloneGrad)"
      />
      <path
        d="M50 75 C38 75, 28 66, 26 54 C30 62, 40 66, 50 64 C62 62, 68 54, 68 45 C68 58, 60 70, 50 75 Z"
        fill="url(#cycloneGrad)"
      />
      {/* Eye of the Cyclone */}
      <circle cx="50" cy="50" r="7" fill="url(#cycloneCore)" />
      <circle cx="50" cy="50" r="3" fill="#ffffff" opacity="0.9" />
    </svg>
  </div>
);

const Header = ({ toggleSidebar }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <header className="relative bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-sm z-30 sticky top-0 w-full overflow-hidden">
      {/* Subtle meteorological satellite ambient gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-50/70 via-blue-50/40 to-cyan-50/60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-sky-100/30 to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 lg:hidden text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors shrink-0"
            aria-label="Toggle navigation"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3">
            <CycloneLogo className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 drop-shadow-sm" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  Cyclone<span className="text-sky-600 font-black">Vision</span>
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                  <Sparkles size={10} className="text-sky-600" />
                  AI v2.0
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                AI-Powered Tropical Cyclone Monitoring
              </p>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-0.5">
                <span className="text-sky-700 font-semibold">Detect</span>
                <span>•</span>
                <span className="text-cyan-700 font-semibold">Estimate Intensity</span>
                <span>•</span>
                <span className="text-slate-400">Classify</span>
                <span>•</span>
                <span className="text-slate-400">Assess Risk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Weather Intelligence Badge & Clock */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden lg:flex flex-col text-right">
            <p className="text-xs font-semibold text-slate-700 italic">
              "A Safer Tomorrow Through Smarter Weather Intelligence"
            </p>
            <span className="text-[10px] text-sky-600 font-medium flex items-center justify-end gap-1 mt-0.5">
              <ShieldCheck size={12} />
              Multi-Source Satellite Observation Active
            </span>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50/90 border border-sky-100 shadow-xs">
            <Clock size={16} className="text-sky-600 shrink-0" />
            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-800 leading-tight">{formattedDate}</p>
              <p className="text-[10px] font-medium text-slate-500 font-mono leading-tight">{formattedTime}</p>
            </div>
          </div>

          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center shadow-xs border-2 border-white shrink-0">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

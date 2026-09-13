import React from 'react';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';

const CycloneLogo = ({ className = "w-10 h-10" }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
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
      />
      <path
        d="M50 90 C32 90, 15 76, 12 56 C16 68, 30 76, 46 74 C64 72, 78 58, 78 40 C78 60, 66 80, 50 90 Z"
        fill="url(#cycloneGrad)"
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
  return (
    <header className="h-[90px] min-h-[90px] bg-white border-b border-sky-100 shadow-xs z-30 sticky top-0 w-full">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 md:px-8 flex items-center justify-between">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 lg:hidden text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors shrink-0"
            aria-label="Toggle navigation"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-3">
            <CycloneLogo className="w-10 h-10 shrink-0 drop-shadow-xs" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              Cyclone<span className="text-sky-600">Vision</span>
            </h1>
          </div>
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Notification Bell with red badge */}
          <button 
            className="relative p-2 text-slate-700 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={22} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-400" />
          </button>

          {/* User Account Button */}
          <div className="flex items-center gap-2.5 pl-2 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <User size={18} />
            </div>
            <div className="flex items-center gap-1 text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
              <span>Hi, User</span>
              <ChevronDown size={14} className="text-slate-500 group-hover:text-sky-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

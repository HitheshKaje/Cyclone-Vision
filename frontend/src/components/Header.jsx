import React from 'react';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';

/* 3D Rotating Cyclone Swirl Logo - Matching the Blue/Cyan Reference Image */
const Cyclone3DLogo = ({ className = "w-[39px] h-[39px] xs:w-[41px] xs:h-[41px] sm:w-10 sm:h-10 md:w-12 md:h-12" }) => (
  <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
    {/* Keyframe animation for smooth 3D continuous rotation around vertical Y-axis */}
    <style>{`
      @keyframes cyclone-3d-y-spin {
        0% {
          transform: perspective(800px) rotateY(0deg);
        }
        100% {
          transform: perspective(800px) rotateY(360deg);
        }
      }
      .cyclone-3d-anim {
        animation: cyclone-3d-y-spin 12s linear infinite;
        transform-style: preserve-3d;
        will-change: transform;
      }
    `}</style>

    {/* Ambient Glow */}
    <div className="absolute inset-0 bg-sky-400/20 rounded-full blur-md transform scale-95 pointer-events-none" />

    {/* 3D Rotating Swirl Container */}
    <div className="w-full h-full cyclone-3d-anim relative flex items-center justify-center">
      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(2,132,199,0.32)]"
      >
        <defs>
          {/* Main Blade Gradient (Deep Navy -> Royal Blue -> Vivid Cerulean -> Electric Cyan) */}
          <linearGradient id="bladeBlueCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0043a8" />
            <stop offset="30%" stopColor="#0284c7" />
            <stop offset="65%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#00e5ff" />
          </linearGradient>

          {/* Inner Luminous Cyan Gradient */}
          <linearGradient id="bladeInnerCyan" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="45%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a5f3fc" />
          </linearGradient>

          {/* 3D Glossy Specular Reflection Highlight */}
          <linearGradient id="bladeGlossSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          {/* Master Blade Path Definition */}
          <g id="cycloneBlade">
            {/* Base Curved Blade Body */}
            <path
              d="M 100 134 C 62 134, 26 98, 38 22 C 42 54, 70 88, 103 86 C 105 102, 103 120, 100 134 Z"
              fill="url(#bladeBlueCyan)"
            />
            {/* Inner High-Intensity Inflow Edge */}
            <path
              d="M 100 134 C 74 134, 46 108, 54 52 C 58 72, 78 94, 103 86 C 105 102, 103 120, 100 134 Z"
              fill="url(#bladeInnerCyan)"
              opacity="0.85"
            />
            {/* Specular 3D Gloss Ridge */}
            <path
              d="M 100 130 C 65 128, 34 94, 42 28 C 45 48, 68 76, 96 82 Z"
              fill="url(#bladeGlossSheen)"
            />
          </g>
        </defs>

        {/* 8 Radial Symmetrical Swirling Arms (45 deg angular offsets) */}
        <use href="#cycloneBlade" transform="rotate(0 100 100)" />
        <use href="#cycloneBlade" transform="rotate(45 100 100)" />
        <use href="#cycloneBlade" transform="rotate(90 100 100)" />
        <use href="#cycloneBlade" transform="rotate(135 100 100)" />
        <use href="#cycloneBlade" transform="rotate(180 100 100)" />
        <use href="#cycloneBlade" transform="rotate(225 100 100)" />
        <use href="#cycloneBlade" transform="rotate(270 100 100)" />
        <use href="#cycloneBlade" transform="rotate(315 100 100)" />

        {/* Central Eye Hollow Boundary Ring (Clean White/Transparent Eye Center) */}
        <circle cx="100" cy="100" r="22" fill="#ffffff" opacity="0.95" />
        <circle cx="100" cy="100" r="17" fill="#f8fafc" />
      </svg>
    </div>
  </div>
);

const Header = ({ toggleSidebar }) => {
  return (
    <header className="h-[76px] sm:h-[84px] md:h-[90px] min-h-[76px] bg-white border-b border-sky-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] z-30 sticky top-0 w-full select-none">
      {/* CSS Rule: Hide right-side notification & user controls at small mobile <= 340px */}
      <style>{`
        @media (max-width: 340px) {
          .header-nav-right {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full h-full px-2.5 sm:px-4 md:px-6 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-3 md:gap-4">
        
        {/* LEFT SIDE: Hamburger + 3D Cyclone Logo + Left-Aligned Branding */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3.5 min-w-0 flex-1 overflow-hidden">
          {/* Mobile Sidebar Toggle Button */}
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 sm:p-2 lg:hidden text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg sm:rounded-xl transition-colors shrink-0 cursor-pointer"
              aria-label="Toggle navigation"
            >
              <Menu size={20} className="sm:hidden" />
              <Menu size={22} className="hidden sm:block" />
            </button>
          )}

          {/* Logo + Brand Name & Tagline */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Cyclone3DLogo className="w-[39px] h-[39px] xs:w-[41px] xs:h-[41px] sm:w-10 sm:h-10 md:w-12 md:h-12 shrink-0" />
            <div className="flex flex-col justify-center min-w-0 overflow-hidden">
              <span className="text-[19px] xs:text-[20px] sm:text-xl md:text-2xl lg:text-[26px] font-extrabold tracking-tight leading-none text-slate-900 flex items-center truncate">
                Cyclone<span className="text-sky-600">Vision</span>
              </span>
              <span className="hidden sm:block text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.12em] sm:tracking-[0.14em] uppercase text-sky-700/90 mt-0.5 sm:mt-1 truncate">
                AI FOR A SAFER TOMORROW
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Notifications + Divider + User Section (Visible for > 300px, hidden at <= 300px) */}
        <div className="header-nav-right flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
          {/* Notification Bell with Red Badge */}
          <button 
            className="relative p-1.5 sm:p-2.5 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg sm:rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Notifications"
          >
            <Bell size={18} className="sm:hidden" />
            <Bell size={21} className="hidden sm:block" />
            <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-400" />
          </button>

          {/* Subtle Vertical Divider */}
          <div className="h-5 sm:h-7 w-[1px] bg-slate-200 shrink-0" />

          {/* User Profile Section */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 pl-0.5 sm:pl-1 py-1 pr-1 sm:pr-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group shrink-0">
            <div className="w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <User size={15} className="sm:hidden" />
              <User size={18} className="hidden sm:block" />
            </div>
            <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">
              <span className="hidden md:inline whitespace-nowrap">Hi, User</span>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-sky-600 transition-colors shrink-0" />
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;

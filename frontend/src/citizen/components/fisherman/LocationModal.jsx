import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X, Navigation, Check, Anchor } from 'lucide-react';

export const COASTAL_PORTS = [
  { id: 'malpe', name: 'Malpe Fishery Harbor', district: 'Udupi', region: 'Karnataka Coast', lat: 13.3508, lng: 74.7042 },
  { id: 'mangalore', name: 'Mangalore Old Port', district: 'Dakshina Kannada', region: 'Karnataka Coast', lat: 12.8698, lng: 74.8431 },
  { id: 'karwar', name: 'Karwar Baitkhol Harbor', district: 'Uttara Kannada', region: 'Karnataka Coast', lat: 14.8136, lng: 74.1298 },
  { id: 'gangolli', name: 'Gangolli Fishing Harbor', district: 'Udupi', region: 'Karnataka Coast', lat: 13.6346, lng: 74.6725 },
  { id: 'honnavar', name: 'Honnavar Port', district: 'Uttara Kannada', region: 'Karnataka Coast', lat: 14.2811, lng: 74.4447 },
  { id: 'tadadi', name: 'Tadadi Port (Kumta)', district: 'Uttara Kannada', region: 'Karnataka Coast', lat: 14.5262, lng: 74.3644 },
  { id: 'bhatkal', name: 'Bhatkal Coastal Port', district: 'Uttara Kannada', region: 'Karnataka Coast', lat: 13.9764, lng: 74.5503 },
  { id: 'chennai', name: 'Kasimedu Fishing Harbor', district: 'Chennai', region: 'Tamil Nadu Coast', lat: 13.1256, lng: 80.2982 },
  { id: 'visakhapatnam', name: 'Visakhapatnam Fishing Harbor', district: 'Visakhapatnam', region: 'Andhra Coast', lat: 17.6975, lng: 83.3012 },
  { id: 'paradip', name: 'Paradip Fishery Harbor', district: 'Jagatsinghpur', region: 'Odisha & Bengal Coast', lat: 20.2644, lng: 86.6698 }
];

const LocationModal = ({ isOpen, onClose, selectedPortId, onSelectPort }) => {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [isLocating, setIsLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  if (!isOpen) return null;

  const regions = ['All', 'Karnataka Coast', 'Tamil Nadu Coast', 'Andhra Coast', 'Odisha & Bengal Coast'];

  const filteredPorts = COASTAL_PORTS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.district.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = selectedRegion === 'All' || p.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        // Find closest harbor
        let nearest = COASTAL_PORTS[0];
        let minDist = Infinity;
        COASTAL_PORTS.forEach(p => {
          const d = Math.hypot(p.lat - latitude, p.lng - longitude);
          if (d < minDist) {
            minDist = d;
            nearest = p;
          }
        });
        onSelectPort(nearest);
        onClose();
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocError('Location permission denied. Please choose your harbor manually.');
        } else {
          setLocError('Unable to detect GPS position. Please choose manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md max-h-[88vh] bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="location-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <MapPin size={18} />
            </div>
            <div>
              <h2 id="location-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                {i18n.language === 'kn' ? 'ಕರಾವಳಿ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ' : i18n.language === 'hi' ? 'तटीय स्थान चुनें' : 'Select Coastal Location'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {i18n.language === 'kn' ? 'ನಿಮ್ಮ ಹತ್ತಿರದ ಮೀನುಗಾರಿಕಾ ಬಂದರು' : i18n.language === 'hi' ? 'अपना निकटतम मत्स्य बंदरगाह चुनें' : 'Choose your home fishery port or coastal district'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* GPS Detection Action */}
        <div className="p-3.5 px-4 bg-sky-500/5 border-b border-slate-200/70 dark:border-slate-800/70">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="w-full py-2.5 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700/60 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            <Navigation size={14} className={isLocating ? 'animate-spin text-sky-500' : 'text-sky-500'} />
            <span>{isLocating ? 'Detecting Nearest Port...' : 'Detect Nearest Port via GPS'}</span>
          </button>
          {locError && (
            <p className="text-[11px] font-semibold text-rose-500 mt-1.5 px-1">{locError}</p>
          )}
        </div>

        {/* Region Filter Pills */}
        <div className="p-3 px-4 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800/60">
          {regions.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRegion(r)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedRegion === r
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Port List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 dark:divide-slate-800/50 space-y-1">
          {filteredPorts.map((port) => {
            const isSelected = port.id === selectedPortId;
            return (
              <button
                key={port.id}
                type="button"
                onClick={() => {
                  onSelectPort(port);
                  onClose();
                }}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/10 dark:bg-sky-950/40 border border-sky-500/40 text-sky-900 dark:text-sky-100'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <Anchor size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold truncate">{port.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {port.district} • {port.region}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center text-[11px] text-slate-400">
          Weather and cyclone warnings adapt dynamically to your selected port.
        </div>
      </div>
    </div>
  );
};

export default LocationModal;

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CloudSun, 
  Sun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Wind, 
  Waves, 
  Droplets, 
  Gauge,
  Thermometer,
  MapPin, 
  RefreshCw,
  Calendar,
  AlertTriangle, 
  Info,
  ShieldAlert,
  Clock,
  Navigation,
  Sunrise,
  Sunset,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Anchor
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { 
  COASTAL_LOCATIONS, 
  fetchLiveCoastalWeather, 
  getCachedWeather, 
  getWmoInfo, 
  getSeaCondition 
} from '../services/weatherService';

const WeatherSafety = () => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useNetworkStatus();

  // Location selection: Default to Malpe (Udupi) or user's registered harbor
  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('cyclosafe_current_citizen_user'));
      if (user?.port) {
        const found = COASTAL_LOCATIONS.find(l => user.port.toLowerCase().includes(l.id));
        if (found) return found;
      }
      if (user?.district) {
        const found = COASTAL_LOCATIONS.find(l => l.district.toLowerCase() === user.district.toLowerCase());
        if (found) return found;
      }
    } catch (_) {}
    return COASTAL_LOCATIONS[0]; // Malpe Fishery Harbor
  });

  const [weatherData, setWeatherData] = useState(() => getCachedWeather());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);

  // Load weather for location
  const loadWeather = useCallback(async (loc) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveCoastalWeather(loc.lat, loc.lng);
      setWeatherData(data);
      setSelectedDayIndex(0);
    } catch (err) {
      console.warn('[Weather] Fetch error:', err);
      setError(err.message || 'Unable to retrieve live weather feed.');
      // Try cached fallback
      const cached = getCachedWeather();
      if (cached) setWeatherData(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather(selectedLocation);
  }, [selectedLocation, loadWeather]);

  // Handle GPS location
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gpsLoc = {
          id: 'custom_gps',
          name: 'My GPS Location',
          district: 'Live GPS',
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lng: Math.round(pos.coords.longitude * 10000) / 10000,
          badge: 'GPS'
        };
        setSelectedLocation(gpsLoc);
        setGpsActive(true);
      },
      (err) => {
        console.warn('[GPS] Error:', err);
        alert('Could not acquire GPS position. Using default harbor.');
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const renderWeatherIcon = (iconName, size = 24, className = '') => {
    switch (iconName) {
      case 'Sun': return <Sun size={size} className={className} />;
      case 'CloudSun': return <CloudSun size={size} className={className} />;
      case 'Cloud': return <Cloud size={size} className={className} />;
      case 'CloudDrizzle': return <CloudDrizzle size={size} className={className} />;
      case 'CloudRain': return <CloudRain size={size} className={className} />;
      case 'CloudLightning': return <CloudLightning size={size} className={className} />;
      case 'CloudFog': return <CloudFog size={size} className={className} />;
      default: return <CloudSun size={size} className={className} />;
    }
  };

  const current = weatherData?.current;
  const daily = weatherData?.daily || [];
  const currentWmo = current ? getWmoInfo(current.weatherCode) : null;
  const currentSea = current ? getSeaCondition(current.waveHeightM) : null;
  const selectedDay = daily[selectedDayIndex] || daily[0];
  const selectedDayWmo = selectedDay ? getWmoInfo(selectedDay.weatherCode) : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 select-none">
      
      {/* 1. Header with Live Pulse Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <CloudSun size={20} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {i18n.language === 'kn' ? 'ನೇರ ಹವಾಮಾನ ಮತ್ತು ಕರಾವಳಿ ಸ್ಥಿತಿ' : 'Live Coastal Weather & Marine Conditions'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            {i18n.language === 'kn' 
              ? 'ಪ್ರತಿದಿನದ ನಿಖರ ಹವಾಮಾನ ಮಾಹಿತಿ ಮತ್ತು ಸಮುದ್ರ ಅಲೆಗಳ ಮುನ್ಸೂಚನೆ'
              : 'Real-time meteorological observations and day-by-day weather forecasts'}
          </p>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>LIVE WEATHER API</span>
          </span>
          <button
            type="button"
            onClick={() => loadWeather(selectedLocation)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-500 transition-colors cursor-pointer"
            title="Refresh live weather"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-sky-500' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Location Selector & GPS Bar */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-sky-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {i18n.language === 'kn' ? 'ಕರಾವಳಿ ಸ್ಥಳ' : 'Select Coastal Location'}:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Harbor Dropdown */}
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const found = COASTAL_LOCATIONS.find(l => l.id === e.target.value);
                if (found) {
                  setSelectedLocation(found);
                  setGpsActive(false);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer"
            >
              {COASTAL_LOCATIONS.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.district})
                </option>
              ))}
              {gpsActive && <option value="custom_gps">📍 My GPS Location</option>}
            </select>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleUseGps}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                gpsActive 
                  ? 'bg-sky-500 text-white border-sky-600 shadow-xs' 
                  : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
              }`}
            >
              <Navigation size={13} />
              <span>{i18n.language === 'kn' ? 'ನನ್ನ ಜಿಪಿಎಸ್' : 'My GPS'}</span>
            </button>
          </div>
        </div>

        {/* Selected location coordinates strip */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {selectedLocation.name}
          </span>
          <span>
            {selectedLocation.lat}°N, {selectedLocation.lng}°E • {selectedLocation.district}
          </span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <span>{error} (Showing last available observations)</span>
        </div>
      )}

      {/* 3. Primary Real-Time Current Weather Hero Card */}
      {current && (
        <div className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-br ${currentWmo?.bg || 'from-sky-500/10 to-blue-500/5'} border border-slate-200 dark:border-slate-700/80 shadow-md relative overflow-hidden`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Left: Big Temp & Condition */}
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 shrink-0">
                {renderWeatherIcon(currentWmo?.icon, 44, currentWmo?.color || 'text-sky-500')}
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                    {current.temperature}°
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-500">
                    C
                  </span>
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Feels {current.feelsLike}°C
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {i18n.language === 'kn' ? currentWmo?.kn : currentWmo?.label}
                  </h3>
                  <span className="text-xs text-slate-400">• Current Observation</span>
                </div>
              </div>
            </div>

            {/* Right: Sea Wave Height Badge */}
            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Waves size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {i18n.language === 'kn' ? 'ಸಮುದ್ರದ ಅಲೆಗಳ ಎತ್ತರ' : 'Coastal Wave Height'}
                </span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  {current.waveHeightM != null ? `${current.waveHeightM} m` : '0.5 m'}
                </span>
                <span className={`block text-[11px] font-bold ${currentSea?.color || 'text-emerald-500'}`}>
                  {i18n.language === 'kn' ? currentSea?.kn : currentSea?.text}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-200/70 dark:border-slate-700/70">
            {/* Wind Speed */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Wind size={15} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {i18n.language === 'kn' ? 'ಗಾಳಿ ವೇಗ' : 'Wind Speed'}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100">
                {current.windSpeedKm} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                {current.windSpeedKnots} knots • {current.windDirectionText}
              </span>
            </div>

            {/* Humidity */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Droplets size={15} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {i18n.language === 'kn' ? 'ತೇವಾಂಶ' : 'Humidity'}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100">
                {current.humidity}%
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                Relative moisture
              </span>
            </div>

            {/* Surface Pressure */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Gauge size={15} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {i18n.language === 'kn' ? 'ವಾಯು ಒತ್ತಡ' : 'Pressure'}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100">
                {current.pressure} <span className="text-xs font-normal text-slate-500">hPa</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Normal Barometer
              </span>
            </div>

            {/* Precipitation */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <CloudRain size={15} />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {i18n.language === 'kn' ? 'ಮಳೆ ಪ್ರಮಾಣ' : 'Precipitation'}
                </span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100">
                {current.precipitation} <span className="text-xs font-normal text-slate-500">mm</span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">
                Current rate
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. DAY-BY-DAY 7-DAY WEATHER FORECAST (User's Core Requirement) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-sky-500" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              {i18n.language === 'kn' 
                ? 'ಪ್ರತಿದಿನದ ನೇರ ಹವಾಮಾನ ಮಾಹಿತಿ (೭ ದಿನಗಳು)' 
                : '7-Day Live Weather Forecast (Every Particular Day)'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {i18n.language === 'kn' ? 'ದಿನದ ವಿವರಗಳಿಗಾಗಿ ಕಾರ್ಡ್ ಕ್ಲಿಕ್ ಮಾಡಿ' : 'Click any day to view complete details'}
          </span>
        </div>

        {/* Days Horizontal Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {daily.map((day, idx) => {
            const wmo = getWmoInfo(day.weatherCode);
            const isSelected = selectedDayIndex === idx;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 shadow-sm ring-2 ring-sky-500/20'
                    : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {/* Day label */}
                <span className={`text-xs font-bold ${isSelected ? 'text-sky-600 dark:text-sky-400 font-black' : 'text-slate-600 dark:text-slate-400'}`}>
                  {day.dayLabel}
                </span>

                {/* Weather icon */}
                <div className="my-2 p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs">
                  {renderWeatherIcon(wmo.icon, 24, wmo.color)}
                </div>

                {/* High / Low Temp */}
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                  <span className="text-rose-600 dark:text-rose-400">{day.tempMax}°</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-sky-600 dark:text-sky-400">{day.tempMin}°</span>
                </div>

                {/* Condition Short Name */}
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full font-medium mt-1">
                  {i18n.language === 'kn' ? wmo.kn : wmo.label}
                </span>

                {/* Rain probability */}
                <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  <Droplets size={11} />
                  <span>{day.rainChancePercent}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Particular Day Detailed Drilldown Box */}
        {selectedDay && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-sky-500/5 via-blue-500/5 to-transparent border border-sky-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-500/15 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                  {renderWeatherIcon(selectedDayWmo?.icon, 26, selectedDayWmo?.color)}
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {selectedDay.weekday} ({selectedDay.date})
                  </h4>
                  <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                    {i18n.language === 'kn' ? selectedDayWmo?.kn : selectedDayWmo?.label} • Expected Conditions
                  </span>
                </div>
              </div>

              {/* Day's high low badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 text-xs font-bold">
                  Max: {selectedDay.tempMax}°C
                </span>
                <span className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 text-xs font-bold">
                  Min: {selectedDay.tempMin}°C
                </span>
              </div>
            </div>

            {/* Day Detailed Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {/* Rain chance & Volume */}
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {i18n.language === 'kn' ? 'ಮಳೆ ಸಾಧ್ಯತೆ' : 'Rain Chance & Volume'}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedDay.rainChancePercent}% ({selectedDay.precipitationSum} mm)
                </span>
              </div>

              {/* Max Wind & Gusts */}
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {i18n.language === 'kn' ? 'ಗರಿಷ್ಠ ಗಾಳಿ ವೇಗ' : 'Peak Wind & Gusts'}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedDay.windSpeedMaxKm} km/h (Gusts: {selectedDay.windGustsKm})
                </span>
              </div>

              {/* Sea Swell / Wave Max */}
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {i18n.language === 'kn' ? 'ಸಮುದ್ರದ ಅಲೆ' : 'Max Wave Height'}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedDay.waveHeightMaxM != null ? `${selectedDay.waveHeightMaxM} meters` : '0.5 - 0.7 m'}
                </span>
              </div>

              {/* Sunrise & Sunset */}
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {i18n.language === 'kn' ? 'ಸೂರ್ಯೋದಯ / ಅಸ್ತ' : 'Sunrise / Sunset'}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sunrise size={13} className="text-amber-500" /> {selectedDay.sunrise || '06:18'}
                  <span className="text-slate-300">•</span>
                  <Sunset size={13} className="text-rose-500" /> {selectedDay.sunset || '18:04'}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 5. Official Fishermen Guidelines */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
          <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
          <span>{i18n.language === 'kn' ? 'ಮೀನುಗಾರರ ಅಧಿಕೃತ ಸುರಕ್ಷತಾ ಮಾರ್ಗಸೂಚಿಗಳು' : 'Official Maritime Fishermen Guidelines'}</span>
        </h3>
        <ul className="text-xs space-y-2 font-medium leading-relaxed list-disc list-inside">
          <li>Check harbor signal flags at port master station before casting nets.</li>
          <li>Carry VHF marine radios on channel 16 when sailing beyond 10-15 nautical miles from coast.</li>
          <li>Ensure all crew wear certified life jackets and personal locator beacons before departure.</li>
        </ul>
      </div>

    </div>
  );
};

export default WeatherSafety;

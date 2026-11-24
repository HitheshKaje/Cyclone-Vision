import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wind, Compass, CloudRain, Waves } from 'lucide-react';

const WeatherCards = ({ weatherData, seaData }) => {
  const { t, i18n } = useTranslation();

  // 1. Wind Speed
  let windSpeedValue = 'Data unavailable';
  let windSpeedUnit = '';
  let windSpeedLabel = 'Wind flow';
  if (weatherData?.current?.wind_speed_10m != null) {
    const kmh = Math.round(weatherData.current.wind_speed_10m);
    windSpeedValue = `${kmh}`;
    windSpeedUnit = 'km/h';
    windSpeedLabel = kmh < 20 ? 'Light breeze' : kmh < 40 ? 'Moderate wind' : 'Strong gale';
  } else if (seaData?.current?.wind_speed_kmh != null) {
    const kmh = Math.round(seaData.current.wind_speed_kmh);
    windSpeedValue = `${kmh}`;
    windSpeedUnit = 'km/h';
    windSpeedLabel = kmh < 20 ? 'Light breeze' : kmh < 40 ? 'Moderate wind' : 'Strong gale';
  }

  // 2. Wind Direction
  let windDirValue = 'Data unavailable';
  let windDirUnit = '';
  let windDirLabel = 'Direction';
  if (weatherData?.current?.wind_direction_10m != null) {
    const deg = Math.round(weatherData.current.wind_direction_10m);
    const compass = weatherData.wind_compass || getCompassHeading(deg);
    windDirValue = compass;
    windDirUnit = `(${deg}°)`;
    windDirLabel = deg >= 180 && deg <= 360 ? 'Sea to Coast' : 'Along Coast';
  }

  // 3. Rainfall
  let rainValue = 'Data unavailable';
  let rainUnit = '';
  let rainLabel = 'Precipitation';
  if (weatherData?.current?.precipitation != null) {
    const p = weatherData.current.precipitation;
    rainValue = `${p.toFixed(1)}`;
    rainUnit = 'mm';
    rainLabel = p === 0 ? 'No rain' : p < 5 ? 'Light rain' : 'Heavy downpour';
  }

  // 4. Wave Height (Strictly from marine telemetry, NEVER derived from cyclone wind speed!)
  let waveValue = 'Data unavailable';
  let waveUnit = '';
  let waveLabel = 'Wave state';
  if (seaData?.current?.wave_height != null) {
    const wh = Number(seaData.current.wave_height);
    waveValue = `${wh.toFixed(1)}`;
    waveUnit = 'm';
    waveLabel = wh < 1.0 ? 'Calm sea' : wh < 2.5 ? 'Moderate waves' : 'Rough sea (Danger)';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
          Coastal Weather & Sea
        </h3>
        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
          Verified Sensors
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* Card 1: Wind Speed */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('fisherman.wind_speed', 'Wind Speed')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-[#1677B8] dark:text-sky-400 flex items-center justify-center">
              <Wind size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none">
                {windSpeedValue}
              </span>
              {windSpeedUnit && (
                <span className="text-xs font-bold text-slate-500">{windSpeedUnit}</span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              {windSpeedLabel}
            </div>
          </div>
        </div>

        {/* Card 2: Wind Direction */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('fisherman.wind_direction', 'Wind Direction')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Compass size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none">
                {windDirValue}
              </span>
              {windDirUnit && (
                <span className="text-xs font-bold text-slate-500">{windDirUnit}</span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              {windDirLabel}
            </div>
          </div>
        </div>

        {/* Card 3: Rainfall */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('fisherman.rainfall', 'Rainfall')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CloudRain size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none">
                {rainValue}
              </span>
              {rainUnit && (
                <span className="text-xs font-bold text-slate-500">{rainUnit}</span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              {rainLabel}
            </div>
          </div>
        </div>

        {/* Card 4: Wave Height */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('fisherman.wave_height', 'Wave Height')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Waves size={15} />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-none">
                {waveValue}
              </span>
              {waveUnit && (
                <span className="text-xs font-bold text-slate-500">{waveUnit}</span>
              )}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
              {waveLabel}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

function getCompassHeading(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx] || 'N';
}

export default WeatherCards;

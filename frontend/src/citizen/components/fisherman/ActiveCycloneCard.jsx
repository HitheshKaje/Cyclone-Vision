import React from 'react';
import { useTranslation } from 'react-i18next';
import { Compass, Wind, MapPin, Map, CheckCircle2, AlertOctagon } from 'lucide-react';

const ActiveCycloneCard = ({ cyclone, selectedPort, onViewMap }) => {
  const { t, i18n } = useTranslation();

  // If there is NO active cyclone relevant to selected port
  if (!cyclone || !cyclone.is_active) {
    return (
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#16A36A] flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              {t('fisherman.active_cyclone_title', 'Active Cyclone Alert')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {t('fisherman.no_active_cyclone', 'No active cyclone information for your selected area.')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewMap}
          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Map size={13} className="text-[#1677B8] dark:text-sky-400" />
          <span className="hidden xs:inline">{t('fisherman.view_cyclone_map', 'View Map')}</span>
        </button>
      </div>
    );
  }

  // Active cyclone is present
  const distanceKm = cyclone.distance_km != null ? Math.round(cyclone.distance_km) : null;
  const windKmh = cyclone.wind_speed_kmh || (cyclone.wind_speed_kt ? Math.round(cyclone.wind_speed_kt * 1.852) : null);
  const direction = cyclone.movement_direction || 'Moving toward Coast';
  const category = cyclone.category || cyclone.intensity_category || 'Tropical Cyclone';

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-white dark:from-red-950/40 dark:via-slate-900 dark:to-[#0f172a] border-2 border-red-500/30 dark:border-red-900/50 shadow-md">
      
      {/* Top Storm Title & Alert Tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <AlertOctagon size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                ACTIVE CYCLONE
              </span>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                {category}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {cyclone.storm_name || cyclone.name || 'Active Cyclonic Storm'}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewMap}
          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Map size={14} />
          <span>{t('fisherman.view_cyclone_map', 'View Map')}</span>
        </button>
      </div>

      {/* Grid of Key Storm Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3.5 text-xs">
        
        {/* Wind Speed */}
        <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Wind size={11} className="text-red-500" />
            <span>Wind Speed</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {windKmh ? `${windKmh} km/h` : 'Elevated Gale'}
          </div>
          <div className="text-[10px] text-slate-500">
            {cyclone.wind_speed_kt ? `(${cyclone.wind_speed_kt} knots)` : 'Marine Gale'}
          </div>
        </div>

        {/* Movement Direction */}
        <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <Compass size={11} className="text-sky-500" />
            <span>Movement</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
            {direction}
          </div>
          <div className="text-[10px] text-slate-500">
            {cyclone.movement_speed_kmh ? `${cyclone.movement_speed_kmh} km/h speed` : 'Steering toward coast'}
          </div>
        </div>

        {/* Distance from Selected Location */}
        <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
          <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
            <MapPin size={11} className="text-amber-500" />
            <span>From {selectedPort?.name?.split(' ')[0] || 'Port'}</span>
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
            {distanceKm != null ? `~${distanceKm} km` : 'Regional Threat'}
          </div>
          <div className="text-[10px] text-slate-500">
            {distanceKm != null && distanceKm <= 150 ? 'Immediate Danger Zone' : 'Monitored offshore'}
          </div>
        </div>

      </div>

      {/* Advisory Timestamp */}
      {cyclone.updated_at && (
        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 text-right font-medium">
          Advisory issued: {new Date(cyclone.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

    </div>
  );
};

export default ActiveCycloneCard;

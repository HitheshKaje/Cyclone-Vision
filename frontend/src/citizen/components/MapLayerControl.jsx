import React from 'react';
import { Map, Eye, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MapLayerControl = ({ activeLayer, onLayerChange }) => {
  const { t } = useTranslation();

  const layers = [
    { id: 'standard', label: t('map.layers.standard'), icon: Map },
    { id: 'satellite', label: t('map.layers.satellite'), icon: Eye }
  ];

  return (
    <div className="inline-flex p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-sm z-10">
      {layers.map((layer) => {
        const Icon = layer.icon;
        const isActive = activeLayer === layer.id;

        return (
          <button
            key={layer.id}
            onClick={() => onLayerChange(layer.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isActive
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon size={14} />
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MapLayerControl;

import React from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

const SatelliteUpload = () => {
  return (
    <div className="glass-panel p-4 sm:p-6 h-full flex flex-col">
      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-slate-200">Satellite Image Analysis</h2>
        <span className="text-xs px-2 py-1 bg-slate-800 rounded-md text-slate-400 border border-slate-700">Awaiting Input</span>
      </div>

      <div className="flex-1 border-2 border-dashed border-slate-700/50 rounded-xl bg-navy-900/50 flex flex-col items-center justify-center p-4 sm:p-6 text-center transition-colors hover:border-cyan-500/30 overflow-hidden">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-navy-800 rounded-full flex items-center justify-center mb-3 sm:mb-4 border border-slate-700">
          <ImageIcon size={28} className="text-slate-500" />
        </div>
        <p className="text-sm sm:text-base text-slate-400 mb-1 sm:mb-2">No satellite image available</p>
        <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6 max-w-sm px-2">
          Drag and drop a satellite image here, or click to browse. Supported formats: JPG, PNG, TIFF.
        </p>
        <button className="px-4 py-3 sm:py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 font-medium transition-colors flex items-center gap-2 w-full sm:w-auto justify-center">
          <UploadCloud size={16} />
          Upload Satellite Image
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button disabled className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-cyan-600/50 text-cyan-200/50 rounded-lg font-medium cursor-not-allowed border border-cyan-500/20">
          Analyze Image
        </button>
      </div>
    </div>
  );
};

export default SatelliteUpload;

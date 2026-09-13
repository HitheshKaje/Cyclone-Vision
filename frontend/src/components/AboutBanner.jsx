import React, { useState } from 'react';
import { FileText, ArrowRight, X, Sparkles, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

const AboutBanner = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              About CycloneVision
            </h4>
            <p className="text-xs sm:text-sm text-slate-600">
              CycloneVision is an AI-driven system for tropical cyclone detection, classification, and future track prediction using multi-source satellite data.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 hover:shadow-xs cursor-pointer"
        >
          <span>Learn More</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Learn More Modal Dialog */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-sky-100 max-h-[90vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    CycloneVision Project Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    AI-Driven Tropical Cyclone Monitoring for Coastal Safety
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">Project Overview</h4>
                <p>
                  CycloneVision is designed to provide real-time meteorological intelligence from multi-source geostationary satellite imagery (Himawari-8, GOES, INSAT-3D) to aid disaster preparedness and coastal protection.
                </p>
              </div>

              {/* Objectives Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1 text-xs sm:text-sm">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Objective 1: Detection (Active)</span>
                  </div>
                  <p className="text-xs text-emerald-700/90">
                    EfficientNetB0 binary classifier identifying tropical cyclone presence in satellite imagery.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200/80">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-800 mb-1 text-xs sm:text-sm">
                    <Cpu size={16} className="text-cyan-600" />
                    <span>Objective 2: Intensity (Active)</span>
                  </div>
                  <p className="text-xs text-cyan-700/90">
                    EfficientNetB0 regression model predicting maximum sustained wind speed (Vmax in knots) trained on TCIR Indian Ocean dataset.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-700 mb-1 text-xs sm:text-sm">
                    Objective 3: Classification (Coming Next)
                  </div>
                  <p className="text-xs text-slate-500">
                    Multi-tier cyclone categorization (Depression, Cyclonic Storm, Severe CS, Super Cyclone).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-700 mb-1 text-xs sm:text-sm">
                    Objective 4: Risk Assessment (Coming Next)
                  </div>
                  <p className="text-xs text-slate-500">
                    Coastal vulnerability mapping and impact forecasting.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs sm:text-sm hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AboutBanner;

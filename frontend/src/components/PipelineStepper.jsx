import React from 'react';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';

const PipelineStepper = ({ analysisStatus, intensityStatus, isCyclone }) => {
  const isImageReady = analysisStatus !== 'Pending';
  const isDetectionDone = analysisStatus === 'Completed';
  const isIntensityDone = intensityStatus === 'Completed';

  const steps = [
    {
      number: 1,
      title: 'Satellite Image',
      subtitle: 'Upload and analyze satellite data',
      status: isImageReady ? 'completed' : 'active',
      badgeColor: 'bg-sky-600 text-white',
    },
    {
      number: 2,
      title: 'Cyclone Detection',
      subtitle: 'Identify cyclone using AI',
      status: isDetectionDone ? 'completed' : isImageReady ? 'active' : 'upcoming',
      badgeColor: isDetectionDone ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white',
    },
    {
      number: 3,
      title: 'Intensity Estimation',
      subtitle: 'Predict maximum sustained wind speed',
      status: isIntensityDone ? 'completed' : isDetectionDone && isCyclone ? 'active' : 'upcoming',
      badgeColor: isIntensityDone ? 'bg-cyan-600 text-white' : 'bg-slate-300 text-slate-700',
    },
    {
      number: 4,
      title: 'Classification',
      subtitle: 'Coming Next',
      status: 'future',
      badgeColor: 'bg-slate-300 text-slate-600',
    },
    {
      number: 5,
      title: 'Risk Assessment',
      subtitle: 'Coming Next',
      status: 'future',
      badgeColor: 'bg-slate-300 text-slate-600',
    },
  ];

  return (
    <div className="glass-panel p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 overflow-x-auto">
        {steps.map((step, index) => {
          return (
            <React.Fragment key={step.number}>
              <div className="flex items-center gap-3 flex-1 min-w-[170px] p-2 rounded-xl transition-colors hover:bg-sky-50/50">
                {/* Number Circle Badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    step.status === 'completed'
                      ? (step.number === 2 ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white')
                      : step.status === 'active'
                      ? 'bg-sky-500 text-white ring-4 ring-sky-100 animate-pulse'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    step.number
                  )}
                </div>

                {/* Text Labels */}
                <div className="min-w-0">
                  <h4 className={`text-xs sm:text-sm font-bold truncate ${
                    step.status === 'completed'
                      ? 'text-slate-900'
                      : step.status === 'active'
                      ? 'text-sky-700 font-extrabold'
                      : 'text-slate-600'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Arrow separator (hidden on mobile vertical stack) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center text-slate-300 px-1 shrink-0">
                  <ArrowRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineStepper;

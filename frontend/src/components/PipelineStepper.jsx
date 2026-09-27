import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const PipelineStepper = ({ currentStage, isCompleted, isCyclone }) => {
  const steps = [
    {
      id: 1,
      name: 'Satellite Image',
      sub: 'Input Acquisition',
      active: true,
      done: true
    },
    {
      id: 2,
      name: 'Cyclone Detection',
      sub: 'Objective 1',
      active: currentStage === 'Detection' || isCompleted,
      done: isCompleted || currentStage === 'Intensity'
    },
    {
      id: 3,
      name: 'Intensity Estimation',
      sub: isCyclone === false ? 'Skipped' : 'Objective 2',
      active: isCyclone !== false && (currentStage === 'Intensity' || isCompleted),
      done: isCyclone !== false && isCompleted,
      skipped: isCyclone === false
    },
    {
      id: 4,
      name: 'Classification',
      sub: isCyclone === false ? 'Skipped' : 'Objective 3',
      active: isCyclone !== false && isCompleted,
      done: isCyclone !== false && isCompleted,
      skipped: isCyclone === false
    }
  ];

  return (
    <div className="app-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-x-auto">
        {steps.map((step, idx) => {
          const isDone = step.done;
          const isActive = step.active && !isDone;
          const isSkipped = step.skipped;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2.5 flex-1 min-w-[140px]">
                {/* Step Indicator */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isSkipped
                    ? 'bg-slate-100 text-slate-400 border border-slate-200'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : isActive
                    ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                  {isDone ? <CheckCircle2 size={15} /> : step.id}
                </div>

                {/* Step Text */}
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${
                    isDone ? 'text-slate-900' : isActive ? 'text-sky-700' : 'text-slate-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {step.sub}
                  </p>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden sm:flex text-slate-300 px-1 shrink-0">
                  <ArrowRight size={14} />
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

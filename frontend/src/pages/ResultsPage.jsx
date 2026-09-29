import React from 'react';
import { 
  ArrowRight, 
  Target, 
  Wind, 
  Gauge, 
  ShieldAlert, 
  ShieldCheck, 
  FileQuestion,
  Info
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ReferenceLine,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis
} from 'recharts';

const ResultsPage = ({
  currentAnalysis,
  setActiveTab
}) => {
  if (!currentAnalysis) {
    return (
      <div className="space-y-6 pb-8">
        <div className="pb-3 border-b border-slate-700/50">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Analysis Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Detailed results from the analyzed satellite image
          </p>
        </div>

        <div className="app-card p-10 sm:p-14 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
            <FileQuestion size={26} />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-slate-100">
            No analysis available
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
            Upload and analyze a satellite image to inspect detection, intensity, and classification results.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('analyze')}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Go to Analyze Image</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { detection, intensity, classification, fileName, imagePreview, timestamp } = currentAnalysis;
  const isCyclone = detection?.is_cyclone;
  const confidencePercent = detection?.confidence_percent != null 
    ? detection.confidence_percent 
    : (detection?.confidence != null ? Number((detection.confidence * 100).toFixed(1)) : null);

  const windKt = intensity?.wind_speed_kt != null ? intensity.wind_speed_kt : null;
  const windKmh = intensity?.wind_speed_kmh != null 
    ? intensity.wind_speed_kmh 
    : (windKt != null ? Number((windKt * 1.852).toFixed(1)) : null);

  const calculatedClassification = isCyclone === false 
    ? 'Not Applicable' 
    : (classification?.classification || intensity?.classification || null);

  // Recharts Data Prepare
  const confidenceData = [
    { name: 'Confidence', value: confidencePercent != null ? confidencePercent : 0 },
    { name: 'Uncertainty', value: confidencePercent != null ? 100 - confidencePercent : 100 }
  ];
  const pieColor = isCyclone ? '#ef4444' : '#10b981';

  const intensityData = [
    { name: 'Wind Speed', value: windKt != null ? windKt : 0 }
  ];

  // Dynamic Risk Factors derived from Wind Speed and Confidence
  const stormRiskData = isCyclone ? [
    { subject: 'Wind Force', value: windKt != null ? Math.min(100, Math.round((windKt / 140) * 100)) : 0 },
    { subject: 'Model Certainty', value: confidencePercent || 0 },
    { subject: 'Structural Threat', value: windKt > 64 ? 85 : windKt > 34 ? 50 : 15 },
    { subject: 'Surge Potential', value: windKt > 64 ? 90 : windKt > 34 ? 40 : 10 },
    { subject: 'Impact Spread', value: windKt > 64 ? 80 : windKt > 34 ? 55 : 30 },
  ] : [
    { subject: 'Wind Force', value: 0 },
    { subject: 'Model Certainty', value: confidencePercent || 0 },
    { subject: 'Structural Threat', value: 0 },
    { subject: 'Surge Potential', value: 0 },
    { subject: 'Impact Spread', value: 0 },
  ];

  // Colors based on classification
  const classColor = calculatedClassification === 'SEVERE' ? '#ef4444' : calculatedClassification === 'MEDIUM' ? '#f59e0b' : '#10b981';
  const gradientId = calculatedClassification === 'SEVERE' ? 'gradSevere' : calculatedClassification === 'MEDIUM' ? 'gradMedium' : 'gradLow';

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Analysis Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Detailed results from the analyzed satellite image.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('analyze')}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <span>New Analysis</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* 2. Desktop Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Satellite Image + Image Information (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-100">
                Satellite Image
              </h3>
              <span className="text-[11px] font-medium text-slate-400 truncate max-w-[180px]">
                {fileName || 'Uploaded Image'}
              </span>
            </div>

            {/* Satellite Image Display */}
            <div className="w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50 shadow-xs flex items-center justify-center p-3 min-h-[300px]">
              <img 
                src={imagePreview} 
                alt="Satellite Observation" 
                className="max-h-[360px] w-full object-contain"
              />
            </div>

            {/* Image Information */}
            <div className="space-y-2 pt-2 border-t border-slate-700/30">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Info size={14} className="text-emerald-400" />
                <span>Image Information</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/30">
                  <span className="text-slate-500">File Name</span>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">
                    {fileName || 'satellite_image'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/30">
                  <span className="text-slate-500">Analysis Date / Time</span>
                  <span className="font-medium text-slate-200">
                    {timestamp}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Input Resolution</span>
                  <span className="font-medium text-slate-200">
                    224 × 224 pixels
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* New Radar Chart for Dynamic Impact Risk */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/30">
              <h3 className="text-sm font-semibold text-slate-100">
                Derived Risk Impact Matrix
              </h3>
            </div>
            
            <div className="w-full h-[240px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stormRiskData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Impact Risk"
                    dataKey="value"
                    stroke={classColor}
                    strokeWidth={3}
                    fill={classColor}
                    fillOpacity={0.4}
                  />
                  <RechartsTooltip 
                    formatter={(value) => [`${value}%`, 'Risk Level']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400 text-center italic">
              Multivariate risk analysis scaled 0-100% based on intensity constraints.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Three Result Cards (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* CARD 1: Cyclone Detection */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Cyclone Detection
                  </h3>
                  <span className="text-[11px] text-slate-400">Objective 1</span>
                </div>
              </div>

              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isCyclone 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {isCyclone ? 'Cyclone Detected' : 'No Cyclone'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 py-2">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs text-slate-500 font-medium">Detection Result</p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5">
                  {isCyclone ? (
                    <ShieldAlert size={22} className="text-red-500 shrink-0" />
                  ) : (
                    <ShieldCheck size={22} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-xl sm:text-2xl font-bold text-slate-100">
                    {isCyclone ? 'Cyclone Detected' : 'No Cyclone Detected'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isCyclone 
                    ? 'Satellite pattern indicates active cyclonic circulation.' 
                    : 'No evidence of cyclonic formation detected in image.'}
                </p>
              </div>

              {/* Professional Recharts PieChart Visualization */}
              <div className="relative w-28 h-28 shrink-0">
                <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                  <defs>
                    <linearGradient id="gradPie" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={isCyclone ? '#ef4444' : '#10b981'} />
                      <stop offset="100%" stopColor={isCyclone ? '#b91c1c' : '#047857'} />
                    </linearGradient>
                  </defs>
                </svg>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={confidenceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={46}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={true}
                    >
                      <Cell key="cell-0" fill="url(#gradPie)" />
                      <Cell key="cell-1" fill="#f1f5f9" />
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value, name) => [`${value}%`, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-base font-bold text-slate-100 leading-none">
                    {confidencePercent != null ? `${confidencePercent}%` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Confidence
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Intensity Estimation */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                  <Wind size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Intensity Estimation
                  </h3>
                  <span className="text-[11px] text-slate-400">Objective 2</span>
                </div>
              </div>

              <span className="text-[11px] font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                Maximum Sustained Wind Speed
              </span>
            </div>

            {isCyclone === false ? (
              /* No Cyclone Case: Not Applicable */
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700/30 text-center space-y-1">
                <p className="text-sm font-bold text-slate-400">
                  Intensity: Not Applicable
                </p>
                <p className="text-xs text-slate-400">
                  Skipped because Objective 1 determined no cyclone is present.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Estimated Wind Speed</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-bold text-slate-100">
                        {windKt != null ? windKt : '—'}
                      </span>
                      <span className="text-sm font-bold text-slate-500 uppercase">kt</span>
                      {windKmh != null && (
                        <span className="text-xs sm:text-sm text-slate-500 font-medium ml-1">
                          (≈ {windKmh} km/h)
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    Scale: 0 – 140 kt
                  </span>
                </div>

                {/* Dynamic Recharts BarChart Gauge */}
                <div className="space-y-1 mt-2">
                  <div className="h-20 w-full relative -ml-2">
                    <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                      <defs>
                        <linearGradient id="gradSevere" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#fca5a5" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <linearGradient id="gradMedium" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#fcd34d" />
                          <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <linearGradient id="gradLow" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6ee7b7" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={intensityData} margin={{ top: 15, right: 15, bottom: 5, left: 15 }}>
                        <XAxis type="number" domain={[0, 140]} hide />
                        <YAxis dataKey="name" type="category" hide />
                        
                        <ReferenceLine x={34} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: '34kt', fill: '#f59e0b', fontSize: 10, fontWeight: 600 }} />
                        <ReferenceLine x={64} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: '64kt', fill: '#ef4444', fontSize: 10, fontWeight: 600 }} />
                        
                        <RechartsTooltip 
                          cursor={{ fill: 'transparent' }} 
                          formatter={(value) => [`${value} kt`, 'Estimated Wind Speed']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        
                        <Bar 
                          dataKey="value" 
                          barSize={16}
                          radius={[4, 4, 4, 4]}
                          fill={`url(#${gradientId})`}
                          background={{ fill: '#f1f5f9', radius: 4 }}
                          isAnimationActive={true}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium px-2 pb-1">
                    <span>0 kt</span>
                    <span>140 kt</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CARD 3: Classification */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/30">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                  <Gauge size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Classification
                  </h3>
                  <span className="text-[11px] text-slate-400">Objective 3</span>
                </div>
              </div>

              {calculatedClassification && calculatedClassification !== 'Not Applicable' && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  calculatedClassification === 'SEVERE'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : calculatedClassification === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {calculatedClassification}
                </span>
              )}
            </div>

            {isCyclone === false ? (
              /* No Cyclone Case: Not Applicable */
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700/30 text-center space-y-1">
                <p className="text-sm font-bold text-slate-400">
                  Classification: Not Applicable
                </p>
                <p className="text-xs text-slate-400">
                  Rule-based classification requires cyclone detection.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 3-Tier Classification Cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  {/* LOW (< 34 kt) */}
                  <div className={`p-3 rounded-xl border text-xs transition-colors ${
                    calculatedClassification === 'LOW'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold ring-2 ring-emerald-300 shadow-xs'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}>
                    <p className="font-bold text-xs">LOW</p>
                    <p className="text-[10px] mt-0.5">&lt; 34 kt</p>
                  </div>

                  {/* MEDIUM (34–63 kt) */}
                  <div className={`p-3 rounded-xl border text-xs transition-colors ${
                    calculatedClassification === 'MEDIUM'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold ring-2 ring-amber-300 shadow-xs'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}>
                    <p className="font-bold text-xs">MEDIUM</p>
                    <p className="text-[10px] mt-0.5">34–63 kt</p>
                  </div>

                  {/* SEVERE (>= 64 kt) */}
                  <div className={`p-3 rounded-xl border text-xs transition-colors ${
                    calculatedClassification === 'SEVERE'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400 font-bold ring-2 ring-red-300 shadow-xs'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                  }`}>
                    <p className="font-bold text-xs">SEVERE</p>
                    <p className="text-[10px] mt-0.5">&ge; 64 kt</p>
                  </div>
                </div>

                {classification?.description && (
                  <p className="text-xs text-slate-400 font-medium pt-1">
                    {classification.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;

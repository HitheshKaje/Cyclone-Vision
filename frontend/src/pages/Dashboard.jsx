import React, { useState } from 'react';
import { Target, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import OverviewCard from '../components/OverviewCard';
import SatelliteUpload from '../components/SatelliteUpload';
import DetectionResult from '../components/DetectionResult';
import IntensityCard from '../components/IntensityCard';
import ClassificationChart from '../components/ClassificationChart';
import RiskAssessment from '../components/RiskAssessment';
import LocationMap from '../components/LocationMap';
import AlertPanel from '../components/AlertPanel';
import RecentAnalysis from '../components/RecentAnalysis';
import SystemStatus from '../components/SystemStatus';

const Dashboard = () => {
  const [analysisStatus, setAnalysisStatus] = useState("Pending"); // Pending, Analyzing, Completed, Error
  const [intensityStatus, setIntensityStatus] = useState("Pending"); // Pending, Estimating, Completed, Not Applicable, Error
  const [predictionResult, setPredictionResult] = useState(null);
  const [intensityResult, setIntensityResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleAnalysisComplete = (data) => {
    setPredictionResult(data);
  };

  const handleIntensityComplete = (data) => {
    setIntensityResult(data);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard 
          title="Detection Status" 
          icon={Target} 
          value={analysisStatus === 'Analyzing' ? 'Analyzing...' : analysisStatus === 'Completed' ? (predictionResult?.is_cyclone ? 'Cyclone Detected' : 'No Cyclone') : analysisStatus} 
          subtitle={analysisStatus === 'Completed' ? `Confidence: ${predictionResult?.confidence_percent}%` : "Waiting for image upload"} 
          iconColor={analysisStatus === 'Completed' && predictionResult?.is_cyclone ? 'text-red-400' : 'text-cyan-400'}
        />
        <OverviewCard 
          title="Current Intensity" 
          icon={Activity} 
          value={
            intensityStatus === 'Estimating'
              ? 'Estimating...'
              : intensityStatus === 'Completed' && intensityResult
              ? `${intensityResult.predicted_wind_speed_kt} kt`
              : intensityStatus === 'Not Applicable'
              ? 'N/A'
              : 'Pending'
          } 
          subtitle={
            intensityStatus === 'Completed' && intensityResult
              ? `Model: ${intensityResult.model}`
              : intensityStatus === 'Not Applicable'
              ? 'No cyclone detected'
              : intensityStatus === 'Estimating'
              ? 'Estimating intensity...'
              : 'Awaiting cyclone detection'
          } 
          iconColor={intensityStatus === 'Completed' && intensityResult ? 'text-amber-400' : 'text-cyan-400'}
        />
        <OverviewCard 
          title="Cyclone Category" 
          icon={BarChart3} 
          value="Unknown" 
          subtitle="Not available yet — Intensity module pending" 
        />
        <OverviewCard 
          title="Risk Level" 
          icon={AlertTriangle} 
          value="None" 
          subtitle="Not available yet — Intensity module pending" 
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Image & Detection */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="min-h-[300px] md:min-h-[400px] flex flex-col">
            <SatelliteUpload 
              onAnalysisComplete={handleAnalysisComplete}
              onIntensityComplete={handleIntensityComplete}
              analysisStatus={analysisStatus}
              setAnalysisStatus={setAnalysisStatus}
              intensityStatus={intensityStatus}
              setIntensityStatus={setIntensityStatus}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <DetectionResult predictionResult={predictionResult} analysisStatus={analysisStatus} />
            <IntensityCard 
              intensityResult={intensityResult} 
              intensityStatus={intensityStatus} 
              isCyclone={predictionResult?.is_cyclone}
            />
          </div>
          
          <div className="min-h-[300px] md:min-h-[400px] flex flex-col">
            <LocationMap />
          </div>
          
          <RecentAnalysis />
        </div>
        
        {/* Right Column - Analysis & Alerts */}
        <div className="space-y-6 flex flex-col">
          <ClassificationChart />
          <RiskAssessment />
          <AlertPanel />
          <div className="mt-auto pt-6">
            <SystemStatus />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p className="font-semibold text-slate-400">CycloneVision</p>
        <p>AI Based Tropical Cyclone Monitoring for Coastal Safety</p>
      </footer>
    </div>
  );
};

export default Dashboard;

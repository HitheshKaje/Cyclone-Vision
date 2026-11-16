import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { Compass, Info, Gauge, ArrowDownRight } from 'lucide-react';

/**
 * Atmospheric Pressure (MSLP - Mean Sea Level Pressure) Isobar Layer for Leaflet.
 * Visualizes the cyclonic barometric depression, concentric isobar contours (980 - 1012 hPa),
 * and live surface pressure readings from Open-Meteo.
 */
export default function PressureIsobarOverlay({
  stormLat = 15.5,
  stormLng = 81.8,
  stormWindKt = 65,
  active = false,
  showLegend = true
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const [livePressure, setLivePressure] = useState(null);
  const [sampledPressure, setSampledPressure] = useState(null);

  // Approximate central pressure based on Dvorak wind-pressure relationship
  const centerLat = stormLat ?? 15.5;
  const centerLng = stormLng ?? 81.8;
  const peakKt = stormWindKt || 65;
  // Estimated central core pressure (e.g. 65 kt -> ~978 hPa, 115 kt -> ~930 hPa)
  const estimatedCoreMb = Math.round(1012 - (peakKt * 0.52));

  // Fetch real-time live surface barometric pressure from Open-Meteo
  useEffect(() => {
    if (!active) return;
    let isMounted = true;

    const fetchPressureData = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${centerLat}&longitude=${centerLng}&current=surface_pressure,temperature_2m`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.current) {
          setLivePressure({
            pressure: Math.round(data.current.surface_pressure || estimatedCoreMb),
            temp: data.current.temperature_2m || 28.0
          });
        }
      } catch (e) {
        if (isMounted) {
          setLivePressure({ pressure: estimatedCoreMb, temp: 28.0 });
        }
      }
    };

    fetchPressureData();
    const interval = setInterval(fetchPressureData, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [active, centerLat, centerLng, estimatedCoreMb]);

  // Physics pressure calculation at any geographic point
  const getPressureAtCoord = useCallback((lat, lng) => {
    const dLat = (lat - centerLat) * 111.0;
    const dLng = (lng - centerLng) * 111.0 * Math.cos((centerLat * Math.PI) / 180);
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

    const ambientMb = 1012;
    const coreMb = livePressure?.pressure || estimatedCoreMb;
    const deltaP = ambientMb - coreMb;

    // Modified Holland pressure profile
    const rMax = 40.0; // km
    const p = ambientMb - deltaP * Math.exp(-Math.pow(rMax / Math.max(1, distKm), 1.15));

    return Math.round(p);
  }, [centerLat, centerLng, livePressure, estimatedCoreMb]);

  // Click on map to sample pressure
  useEffect(() => {
    if (!active || !map) return;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      const mb = getPressureAtCoord(lat, lng);
      setSampledPressure({
        lat: lat.toFixed(2),
        lng: lng.toFixed(2),
        pressure: mb
      });
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [active, map, getPressureAtCoord]);

  // Draw Pressure Gradient & Isobars on Canvas
  useEffect(() => {
    if (!active || !map) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderPressure = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const centerPoint = map.latLngToContainerPoint([centerLat, centerLng]);
      const maxRadius = Math.max(size.x, size.y) * 0.9;

      // 1. Color Heatmap Radial Gradient (Deep Low = Purple/Indigo -> Cyan -> Green -> Amber)
      const grad = ctx.createRadialGradient(
        centerPoint.x, centerPoint.y, 20,
        centerPoint.x, centerPoint.y, maxRadius
      );
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');    // < 980 hPa (Deep Violet Low)
      grad.addColorStop(0.18, 'rgba(59, 130, 246, 0.38)'); // ~ 988 hPa (Royal Blue)
      grad.addColorStop(0.38, 'rgba(6, 182, 212, 0.30)');  // ~ 996 hPa (Cyan)
      grad.addColorStop(0.60, 'rgba(16, 185, 129, 0.22)'); // ~ 1004 hPa (Emerald)
      grad.addColorStop(0.85, 'rgba(234, 179, 8, 0.14)');  // ~ 1008 hPa (Amber)
      grad.addColorStop(1, 'rgba(249, 115, 22, 0.05)');    // ~ 1012 hPa (Ridge)

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Concentric Isobar Contours
      // Each isobar represents a 4 hPa contour step: 980, 984, 988, 992, 996, 1000, 1004, 1008 hPa
      const isobars = [
        { label: '980 hPa', km: 45 },
        { label: '984 hPa', km: 90 },
        { label: '988 hPa', km: 150 },
        { label: '992 hPa', km: 230 },
        { label: '996 hPa', km: 330 },
        { label: '1000 hPa', km: 460 },
        { label: '1004 hPa', km: 620 },
        { label: '1008 hPa', km: 800 }
      ];

      isobars.forEach(({ label, km }) => {
        // Compute pixel radius by sampling a point km distance east
        const pointEast = map.latLngToContainerPoint([centerLat, centerLng + (km / 111.0)]);
        const pixelRadius = Math.abs(pointEast.x - centerPoint.x);

        if (pixelRadius > 5 && pixelRadius < maxRadius * 1.5) {
          // Draw isobar circle
          ctx.beginPath();
          ctx.arc(centerPoint.x, centerPoint.y, pixelRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 4]); // Dashed isobar style
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash

          // Draw Isobar Label along the ring (North and South)
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, centerPoint.x, centerPoint.y - pixelRadius);
        }
      });

      // 3. Central "LOW" (L) Marker Badge
      ctx.beginPath();
      ctx.arc(centerPoint.x, centerPoint.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = 'black 14px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('L', centerPoint.x, centerPoint.y);
    };

    renderPressure();
    map.on('move', renderPressure);
    map.on('resize', renderPressure);

    return () => {
      map.off('move', renderPressure);
      map.off('resize', renderPressure);
    };
  }, [active, map, centerLat, centerLng]);

  if (!active) return null;

  return (
    <>
      {/* Canvas Isobars Layer */}
      <div 
        className="leaflet-pane leaflet-overlay-pane"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 435
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* Floating Pressure Scale Legend (Bottom Left) */}
      {showLegend && (
        <div className="absolute bottom-5 left-5 z-[500] pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-purple-500/40 rounded-xl p-2.5 shadow-2xl text-white text-xs select-none min-w-[250px]">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-700/60">
            <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-purple-400">
              <Compass size={13} className="text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
              Barometric Isobars (hPa / mb)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Mean Sea Level
            </span>
          </div>

          {/* Color Gradient Scale */}
          <div className="space-y-1">
            <div 
              className="h-2.5 w-full rounded-md shadow-inner"
              style={{
                background: 'linear-gradient(to right, #a855f7 0%, #3b82f6 25%, #06b6d4 50%, #10b981 75%, #f97316 100%)'
              }}
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-300 px-0.5">
              <span>970 (Deep Low)</span>
              <span>985</span>
              <span>1000</span>
              <span>1012+ (High)</span>
            </div>
          </div>

          {/* Live Telemetry */}
          <div className="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] text-purple-300 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
              Core: {livePressure?.pressure || estimatedCoreMb} hPa (LOW)
            </span>
            <span className="text-slate-400">Isobars: 4 hPa</span>
          </div>
        </div>
      )}

      {/* Click Sample Tooltip Pin */}
      {sampledPressure && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-purple-500/50 rounded-xl px-3.5 py-1.5 shadow-2xl text-white text-xs flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5 font-black text-purple-300">
            <Compass size={14} className="text-purple-400" />
            <span>{sampledPressure.pressure} hPa</span>
          </div>
          <span className="h-3 w-px bg-slate-700" />
          <span className="font-bold text-slate-300">
            {sampledPressure.pressure < 985 
              ? '🚨 Severe Cyclonic Low' 
              : sampledPressure.pressure < 1000 
              ? '⚠️ Deep Depression' 
              : 'Normal Pressure Field'}
          </span>
          <span className="text-[10px] text-slate-400">({sampledPressure.lat}°N, {sampledPressure.lng}°E)</span>
          <button 
            type="button" 
            onClick={() => setSampledPressure(null)}
            className="text-slate-400 hover:text-white text-xs ml-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}


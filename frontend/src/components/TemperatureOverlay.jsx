import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { Thermometer, Info } from 'lucide-react';

/**
 * Deterministic geographic and synoptic temperature calculation for North Indian Ocean & South Asia.
 * Combines live Open-Meteo core SST/air telemetry with equatorial warm pool physics,
 * cyclone warm core anomaly, and latitudinal lapse rate.
 */
export function calculateTemperatureAtLatLng(
  lat, 
  lng, 
  centerLat = 15.5, 
  centerLng = 81.8, 
  liveCoreTemp = 29.4
) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;

  // Approximate distance in km from cyclone warm core center
  const dLat = (lat - centerLat) * 111.0;
  const dLng = (lng - centerLng) * 111.0 * Math.cos((centerLat * Math.PI) / 180);
  const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

  // Warm core anomaly: max +2.5°C at the eye/core, tapering smoothly over ~420km
  const coreAnomaly = 2.5 * Math.exp(-Math.pow(distKm / 420, 1.7));

  // Latitudinal lapse in South Asia (subtropical cooling towards northern latitudes ~ 0.35°C / deg)
  const latOffset = (lat - centerLat);
  const latEffect = -0.35 * latOffset;

  // Base ambient oceanic temperature anchored to real Open-Meteo telemetry
  const base = (liveCoreTemp || 29.4) - 1.2;

  let calculated = base + coreAnomaly + latEffect;

  // Meteorological bounds for tropical seas & coastal subcontinent (18°C to 36°C)
  calculated = Math.max(18.0, Math.min(36.0, calculated));

  return Math.round(calculated);
}

/**
 * Sea Surface & Coastal Air Temperature Layer for Leaflet.
 * Visualizes the tropical thermal pool (20°C - 34°C+) providing convective energy for cyclogenesis.
 */
export default function TemperatureOverlay({
  stormLat = 15.5,
  stormLng = 81.8,
  active = false,
  showLegend = false,
  onThermalData = null
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const [liveTemp, setLiveTemp] = useState({ temp: 29.4, feelsLike: 33.5 });

  // Fetch real-time thermal telemetry from Open-Meteo
  useEffect(() => {
    if (!active) return;
    let isMounted = true;

    const fetchThermal = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${stormLat}&longitude=${stormLng}&current=temperature_2m,apparent_temperature`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.current) {
          const thermal = {
            temp: data.current.temperature_2m ?? 29.2,
            feelsLike: data.current.apparent_temperature ?? 33.5
          };
          setLiveTemp(thermal);
          if (onThermalData) onThermalData(thermal);
        }
      } catch (e) {
        if (isMounted) {
          const fallback = { temp: 29.4, feelsLike: 33.8 };
          setLiveTemp(fallback);
          if (onThermalData) onThermalData(fallback);
        }
      }
    };

    fetchThermal();
    const interval = setInterval(fetchThermal, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [active, stormLat, stormLng, onThermalData]);

  // Draw thermal continuous gradient on canvas
  useEffect(() => {
    if (!active || !map) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderThermal = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;

      const centerPoint = map.latLngToContainerPoint([stormLat, stormLng]);
      const maxRadius = Math.max(size.x, size.y) * 0.95;

      // Continuous meteorological color scale: 20°C (Deep Blue) to 34°C+ (Crimson/Coral)
      const grad = ctx.createRadialGradient(
        centerPoint.x, centerPoint.y, 25,
        centerPoint.x, centerPoint.y, maxRadius
      );
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.40)');     // 32°C - 34°C+ Tropical Warm Core
      grad.addColorStop(0.22, 'rgba(249, 115, 22, 0.32)'); // ~30°C - 31°C Warm Pool
      grad.addColorStop(0.48, 'rgba(234, 179, 8, 0.24)');  // ~28°C Ambient Tropical Waters
      grad.addColorStop(0.72, 'rgba(16, 185, 129, 0.16)'); // ~25°C Coastal / Subtropical
      grad.addColorStop(0.88, 'rgba(6, 182, 212, 0.12)');  // ~22°C Outer Boundaries
      grad.addColorStop(1.0, 'rgba(59, 130, 246, 0.06)');  // ~20°C Cooler Waters / Inland

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    renderThermal();
    map.on('move', renderThermal);
    map.on('resize', renderThermal);

    return () => {
      map.off('move', renderThermal);
      map.off('resize', renderThermal);
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [active, map, stormLat, stormLng]);

  if (!active) return null;

  return (
    <>
      <div 
        className="leaflet-pane leaflet-overlay-pane"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 432
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {showLegend && (
        <div className="absolute bottom-5 left-5 z-[500] pointer-events-auto bg-[#0a1b24]/95 backdrop-blur-md border border-teal-500/40 rounded-xl p-2.5 shadow-2xl text-white text-xs select-none min-w-[260px]">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-teal-500/20">
            <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-teal-300">
              <Thermometer size={13} className="text-orange-400 animate-pulse" />
              Temperature (°C)
            </span>
            <span className="text-[10px] text-teal-400/80 font-mono">
              SST & 2m Air
            </span>
          </div>

          <div className="space-y-1">
            <div 
              className="h-2.5 w-full rounded shadow-inner"
              style={{
                background: 'linear-gradient(to right, #3b82f6 0%, #06b6d4 20%, #10b981 40%, #eab308 60%, #f97316 80%, #ef4444 100%)'
              }}
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-300 px-0.5">
              <span>20°C</span>
              <span>23°C</span>
              <span>26°C</span>
              <span>28°C</span>
              <span>31°C</span>
              <span>34°C+</span>
            </div>
          </div>

          <div className="mt-2 pt-1 border-t border-teal-500/15 flex items-center justify-between text-[10px] text-orange-300 font-mono">
            <span>SST Warm Core: {liveTemp?.temp || 29.4}°C</span>
            <span className="text-slate-400">Feels: {liveTemp?.feelsLike || 33.5}°C</span>
          </div>
        </div>
      )}
    </>
  );
}

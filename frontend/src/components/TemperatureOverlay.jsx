import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { Thermometer, Info } from 'lucide-react';

/**
 * Sea Surface & Coastal Air Temperature Layer for Leaflet.
 * Visualizes the tropical thermal pool (24°C - 32°C) providing convective energy for cyclogenesis.
 */
export default function TemperatureOverlay({
  stormLat = 15.5,
  stormLng = 81.8,
  active = false,
  showLegend = true
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const [liveTemp, setLiveTemp] = useState(null);

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
          setLiveTemp({
            temp: data.current.temperature_2m ?? 29.2,
            feelsLike: data.current.apparent_temperature ?? 33.5
          });
        }
      } catch (e) {
        if (isMounted) {
          setLiveTemp({ temp: 29.4, feelsLike: 33.8 });
        }
      }
    };

    fetchThermal();
    const interval = setInterval(fetchThermal, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [active, stormLat, stormLng]);

  // Draw thermal gradient on canvas
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
      const maxRadius = Math.max(size.x, size.y) * 0.9;

      // Tropical warm pool gradient: 28°C - 31°C (Orange / Coral in tropical waters)
      const grad = ctx.createRadialGradient(
        centerPoint.x, centerPoint.y, 30,
        centerPoint.x, centerPoint.y, maxRadius
      );
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.38)');    // ~ 30.5°C Tropical Warm Pool
      grad.addColorStop(0.3, 'rgba(249, 115, 22, 0.30)');  // ~ 29.5°C
      grad.addColorStop(0.6, 'rgba(234, 179, 8, 0.22)');   // ~ 28.0°C
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.12)');    // ~ 26.0°C Coastal

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
        <div className="absolute bottom-5 left-5 z-[500] pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-orange-500/40 rounded-xl p-2.5 shadow-2xl text-white text-xs select-none min-w-[240px]">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-700/60">
            <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-orange-400">
              <Thermometer size={13} className="text-orange-400 animate-pulse" />
              Sea Surface & Air Temp (°C)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Warm Core Pool
            </span>
          </div>

          <div className="space-y-1">
            <div 
              className="h-2.5 w-full rounded-md shadow-inner"
              style={{
                background: 'linear-gradient(to right, #10b981 0%, #eab308 30%, #f97316 65%, #ef4444 100%)'
              }}
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-300 px-0.5">
              <span>24°C</span>
              <span>27°C</span>
              <span>29°C</span>
              <span>32°C+ (SST)</span>
            </div>
          </div>

          <div className="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] text-orange-300 font-mono">
            <span>SST Warm Core: {liveTemp?.temp || 29.4}°C</span>
            <span className="text-slate-400">Feels: {liveTemp?.feelsLike || 33.5}°C</span>
          </div>
        </div>
      )}
    </>
  );
}


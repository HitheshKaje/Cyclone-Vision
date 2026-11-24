import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { Wind, Compass, Info } from 'lucide-react';

/**
 * High-performance HTML5 Canvas Wind Streamline & Particle Flow Overlay for Leaflet.
 * 100% Transparent Canvas: Accurately preserves complete visibility of the underlying map tiles
 * (coastlines, topography, satellite, and ocean) while animating flowing wind vectors.
 */
export default function WindParticleOverlay({
  stormLat = 15.5,
  stormLng = 81.8,
  stormWindKt = 65,
  active = true,
  showLegend = true,
  onWindSample = null
}) {
  const map = useMap();
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const [inspectedWind, setInspectedWind] = useState(null);

  // Convert wind speed to vibrant color with proper alpha
  const getWindColor = (speedKmh, alpha = 0.85) => {
    if (speedKmh < 25) return `rgba(129, 140, 248, ${alpha})`; // Indigo/Purple
    if (speedKmh < 50) return `rgba(6, 182, 212, ${alpha})`;   // Cyan/Teal
    if (speedKmh < 75) return `rgba(16, 185, 129, ${alpha})`;  // Emerald
    if (speedKmh < 100) return `rgba(234, 179, 8, ${alpha})`;  // Amber/Yellow
    if (speedKmh < 125) return `rgba(249, 115, 22, ${alpha})`; // Orange
    return `rgba(239, 68, 68, ${alpha})`;                      // Red/Magenta
  };

  // Physics wind field calculation for any geographic point (lat, lng)
  const getWindVector = useCallback((lat, lng) => {
    const centerLat = stormLat ?? 15.5;
    const centerLng = stormLng ?? 81.8;
    const peakKt = stormWindKt || 65;
    const peakKmh = peakKt * 1.852;

    // Approximate distance in km using equirectangular projection
    const dLat = (lat - centerLat) * 111.0;
    const dLng = (lng - centerLng) * 111.0 * Math.cos((centerLat * Math.PI) / 180);
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

    // Tangential angle (polar)
    const angle = Math.atan2(dLat, dLng);

    // Modified Rankine vortex with eye radius (Rmax ~ 45 km)
    const rMax = 45.0;
    let vTan = 0;
    if (distKm <= rMax) {
      vTan = peakKmh * (distKm / rMax);
    } else {
      vTan = peakKmh * Math.pow(rMax / distKm, 0.55);
    }

    // Inflow angle (spiral inflow into the cyclone center ~ 22 degrees)
    const inflowAngle = 0.38; // ~22 degrees inwards

    // Counter-clockwise cyclonic rotation in Northern Hemisphere
    const rotAngle = angle + Math.PI / 2 + inflowAngle;
    let u = vTan * Math.cos(rotAngle);
    let v = vTan * Math.sin(rotAngle);

    // Add ambient background monsoon / trade wind flow (WNW ~ 18 km/h)
    u += -14.0;
    v += 6.0;

    const totalSpeedKmh = Math.max(12, Math.sqrt(u * u + v * v));
    const totalSpeedKt = totalSpeedKmh / 1.852;

    // Meteorological direction (where wind blows from)
    let dirDeg = Math.round((Math.atan2(-u, -v) * 180) / Math.PI);
    if (dirDeg < 0) dirDeg += 360;

    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const compass = dirs[Math.floor(((dirDeg + 11.25) % 360) / 22.5)];

    return { u, v, speedKmh: Math.round(totalSpeedKmh), speedKt: Math.round(totalSpeedKt), compass, dirDeg };
  }, [stormLat, stormLng, stormWindKt]);

  // Click on map to inspect live wind at that point
  useEffect(() => {
    if (!active || !map) return;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      const wind = getWindVector(lat, lng);
      setInspectedWind({ lat: lat.toFixed(2), lng: lng.toFixed(2), ...wind });
      if (onWindSample) onWindSample({ lat, lng, ...wind });
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  }, [active, map, getWindVector, onWindSample]);

  // Canvas animation loop
  useEffect(() => {
    if (!active || !map) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
    };
    resizeCanvas();

    // Spawn animated particles with trail history
    const particleCount = 380;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        age: Math.floor(Math.random() * 40),
        maxAge: 45 + Math.floor(Math.random() * 35),
        speed: 0.9 + Math.random() * 0.7,
        history: [] // stores previous positions for transparent fading trails
      });
    }
    particlesRef.current = particles;

    let isRunning = true;

    const draw = () => {
      if (!isRunning) return;

      // CRITICAL: Fully clear the canvas every single frame!
      // This guarantees the Leaflet map (ocean, land, cities, borders) remains 100% visible and crystal clear!
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentParticles = particlesRef.current;
      const maxTrailLength = 7;

      for (let i = 0; i < currentParticles.length; i++) {
        const p = currentParticles[i];

        // Convert canvas pixel position to Lat/Lng
        const latLng = map.containerPointToLatLng([p.x, p.y]);

        // Evaluate physical wind vector
        const wind = getWindVector(latLng.lat, latLng.lng);

        // Convert geographic velocity into screen pixel velocity
        const scale = 0.045 * p.speed;
        const dx = wind.u * scale;
        const dy = -wind.v * scale; // Invert latitude to screen Y

        const nextX = p.x + dx;
        const nextY = p.y + dy;

        // Push current point to history
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > maxTrailLength) {
          p.history.shift();
        }

        // Draw smooth streamline trail
        if (p.history.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let j = 1; j < p.history.length; j++) {
            ctx.lineTo(p.history[j].x, p.history[j].y);
          }
          ctx.lineTo(nextX, nextY);

          // Alpha fades in as particle matures
          const alpha = Math.min(0.9, Math.max(0.2, p.age / 12));
          ctx.strokeStyle = getWindColor(wind.speedKmh, alpha);
          ctx.lineWidth = Math.min(2.4, 1.2 + (wind.speedKmh / 55));
          ctx.lineCap = 'round';
          ctx.stroke();

          // Leading particle head dot
          ctx.beginPath();
          ctx.arc(nextX, nextY, Math.min(2.2, 1.0 + (wind.speedKmh / 65)), 0, Math.PI * 2);
          ctx.fillStyle = getWindColor(wind.speedKmh, 1.0);
          ctx.fill();
        }

        // Advance position
        p.x = nextX;
        p.y = nextY;
        p.age++;

        // Reset if out of bounds or age exceeded
        if (
          p.age >= p.maxAge ||
          p.x < -10 ||
          p.x > canvas.width + 10 ||
          p.y < -10 ||
          p.y > canvas.height + 10
        ) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.age = 0;
          p.maxAge = 40 + Math.floor(Math.random() * 40);
          p.history = [];
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleMapMove = () => {
      resizeCanvas();
      // Clear trail histories on zoom/pan so lines don't stretch
      particlesRef.current.forEach(p => { p.history = []; });
    };

    map.on('move', handleMapMove);
    map.on('resize', handleMapMove);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.off('move', handleMapMove);
      map.off('resize', handleMapMove);
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }, [active, map, getWindVector]);

  if (!active) return null;

  return (
    <>
      {/* HTML5 Canvas Streamline Layer - Strictly Transparent */}
      <div 
        className="leaflet-pane leaflet-overlay-pane"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 450
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
      </div>

      {/* Floating Wind Speed Legend Scale */}
      {showLegend && (
        <div className="absolute bottom-5 left-5 z-[500] pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl text-white text-xs select-none min-w-[240px]">
          <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-700/60">
            <span className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-teal-400">
              <Wind size={13} className="text-teal-400 animate-pulse" />
              Live Wind Speed (km/h)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Vector Streamlines
            </span>
          </div>

          {/* Color Gradient Scale */}
          <div className="space-y-1">
            <div 
              className="h-2.5 w-full rounded-md shadow-inner"
              style={{
                background: 'linear-gradient(to right, #818cf8 0%, #06b6d4 25%, #10b981 50%, #eab308 75%, #ef4444 100%)'
              }}
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-300 px-0.5">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
              <span>125+</span>
            </div>
          </div>

          {/* Click to inspect tip */}
          <div className="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Info size={10} className="text-sky-400" /> Click ocean to sample
            </span>
            {inspectedWind && (
              <span className="font-bold text-amber-400 font-mono">
                {inspectedWind.speedKmh} km/h ({inspectedWind.compass})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Click Sample Tooltip Pin */}
      {inspectedWind && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-teal-500/50 rounded-xl px-3.5 py-1.5 shadow-2xl text-white text-xs flex items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-1.5 font-black text-teal-300">
            <Compass size={14} className="animate-spin text-teal-400" style={{ animationDuration: '4s' }} />
            <span>{inspectedWind.speedKmh} km/h</span>
            <span className="text-slate-400 font-normal">({inspectedWind.speedKt} kt)</span>
          </div>
          <span className="h-3 w-px bg-slate-700" />
          <span className="font-bold text-amber-400">← {inspectedWind.compass}</span>
          <span className="text-[10px] text-slate-400">({inspectedWind.lat}°N, {inspectedWind.lng}°E)</span>
          <button 
            type="button" 
            onClick={() => setInspectedWind(null)}
            className="text-slate-400 hover:text-white text-xs ml-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

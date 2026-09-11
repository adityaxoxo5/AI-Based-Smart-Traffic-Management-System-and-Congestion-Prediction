import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Play, Pause, RotateCcw, Navigation, MapPin, Clock, Route } from 'lucide-react';

// Calculate compass bearing between two GPS points
function getBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export default function LiveNavigation({ routes, startQuery, destQuery }) {
  const mapRef      = useRef(null);
  const mapInst     = useRef(null);
  const layerGroup  = useRef(null);
  const vehicleMark = useRef(null);
  const intervalRef = useRef(null);

  const [playing,   setPlaying]   = useState(false);
  const [stepIdx,   setStepIdx]   = useState(0);
  const [finished,  setFinished]  = useState(false);
  
  const speed = 1; // Hardcoded default speed

  // Coordinates are already in [lat, lon] format from the API
  const coords = routes?.[0]?.coordinates || [];
  const hasRoute = coords.length > 1;

  const totalKm    = routes?.[0]?.distanceKm ? parseFloat(routes[0].distanceKm) : 0;
  // Calculate how much we've covered roughly by percentage of steps
  const progressPct = hasRoute ? (stepIdx / (coords.length - 1)) : 0;
  const coveredKm  = totalKm * progressPct;
  const remainKm   = Math.max(0, totalKm - coveredKm).toFixed(1);
  // ETA: assume avg 45 km/h city speed
  const etaMins = Math.ceil((totalKm - coveredKm) / 45 * 60);

  // ── Initialise Leaflet map once ─────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { zoomControl: false }).setView([20, 78], 5);
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, attribution: 'Tiles © Esri' }
    ).addTo(map);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map);
    mapInst.current = map;
    layerGroup.current = L.layerGroup().addTo(map);
  }, []);

  // ── Draw route and markers whenever route changes ───────────────────────
  useEffect(() => {
    const map = mapInst.current;
    const lg  = layerGroup.current;
    if (!map || !lg) return;

    lg.clearLayers();
    vehicleMark.current = null;
    setStepIdx(0);
    setPlaying(false);
    setFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!hasRoute) return;

    // Route polyline
    L.polyline(coords, { color: '#3b82f6', weight: 5, opacity: 0.85 }).addTo(lg);

    // Start pin
    L.circleMarker(coords[0], {
      radius: 9, fillColor: '#10b981', color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(lg).bindPopup('🟢 Start');

    // End pin
    L.circleMarker(coords[coords.length - 1], {
      radius: 9, fillColor: '#ef4444', color: '#fff', weight: 2, fillOpacity: 1,
    }).addTo(lg).bindPopup('🔴 Destination');

    // Fit map to route
    map.fitBounds(L.polyline(coords).getBounds(), { padding: [50, 50] });

    // Initial vehicle marker at start
    const bearing = getBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1]);
    const icon = makeIcon(bearing);
    vehicleMark.current = L.marker(coords[0], { icon, zIndexOffset: 1000 }).addTo(lg);
  }, [routes]);

  // ── Animation tick ──────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setStepIdx((prev) => {
      const next = prev + 1;
      if (next >= coords.length) {
        setPlaying(false);
        setFinished(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return coords.length - 1;
      }

      const pos = coords[next];
      const bearing =
        next < coords.length - 1
          ? getBearing(pos[0], pos[1], coords[next + 1][0], coords[next + 1][1])
          : 0;

      if (vehicleMark.current) {
        vehicleMark.current.setLatLng(pos);
        vehicleMark.current.setIcon(makeIcon(bearing));
        // Smooth pan following the arrow
        mapInst.current?.panTo(pos, { animate: true, duration: 0.25 });
      }
      return next;
    });
  }, [coords]);

  // ── Start / stop interval when playing ──────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!playing || !hasRoute) return;
    // Base interval: traverse full route in ~40s at 1x
    const baseMs = Math.max(30, Math.round(40000 / coords.length));
    const ms = Math.round(baseMs / speed);
    intervalRef.current = setInterval(tick, ms);
    return () => clearInterval(intervalRef.current);
  }, [playing, tick, hasRoute, coords.length]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function makeIcon(bearing) {
    return L.divIcon({
      html: `<div style="
        transform: rotate(${bearing}deg);
        transition: transform 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="white" stroke-width="2.5" fill="#3b82f6" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.6));">
          <path d="M12 2L3 21L12 17L21 21L12 2Z" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
      </div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }

  const handleReset = () => {
    setPlaying(false);
    setFinished(false);
    setStepIdx(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (vehicleMark.current && coords[0]) {
      vehicleMark.current.setLatLng(coords[0]);
      vehicleMark.current.setIcon(makeIcon(0));
      mapInst.current?.panTo(coords[0], { animate: true });
    }
  };

  return (
    <div className="flex-1 h-full bg-[#0d121d] text-slate-200 flex overflow-hidden font-sans">

      {/* ── LEFT CONTROL PANEL ──────────────────────────── */}
      <div className="w-[340px] bg-[#0d121d] border-r border-slate-800 p-5 flex flex-col gap-4 overflow-y-auto select-none">

        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Live Navigation
              {playing && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
            </h2>
            <p className="text-[10px] text-slate-400">Simulated GPS Tracking</p>
          </div>
        </div>

        {/* No Route State */}
        {!hasRoute && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
            <div className="text-5xl">🗺️</div>
            <p className="text-sm font-semibold text-slate-400">No Route Planned</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Go to the <span className="text-blue-400 font-medium">Route Planner</span> tab, search a route first, then come back here to simulate GPS navigation.
            </p>
          </div>
        )}

        {/* Route Info */}
        {hasRoute && (
          <>
            <div className="bg-[#141b29] border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">From</p>
                  <p className="text-[11px] text-slate-200 font-medium">{startQuery || 'Start Point'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold">To</p>
                  <p className="text-[11px] text-slate-200 font-medium">{destQuery || 'Destination'}</p>
                </div>
              </div>
            </div>

            {/* Live Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#141b29] border border-slate-800 rounded-xl p-3 text-center">
                <Route className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-100">{totalKm.toFixed(1)}</p>
                <p className="text-[9px] text-slate-500">Total km</p>
              </div>
              <div className="bg-[#141b29] border border-slate-800 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-100">{finished ? '0' : etaMins}</p>
                <p className="text-[9px] text-slate-500">ETA (mins)</p>
              </div>
              <div className="bg-[#141b29] border border-slate-800 rounded-xl p-3 text-center col-span-2">
                <MapPin className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-100">{remainKm}</p>
                <p className="text-[9px] text-slate-500">km remaining</p>
              </div>
            </div>

            {/* Finished Banner */}
            {finished && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-sm font-bold text-emerald-400">Destination reached successfully</p>
               
              </div>
            )}

            {/* Playback Controls */}
            <div className="bg-[#141b29] border border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Navigation Controls</p>

              {/* Play / Pause / Reset */}
              <div className="flex gap-2">
                <button
                  onClick={() => { if (!finished) setPlaying((p) => !p); }}
                  disabled={finished}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer
                    ${finished ? 'bg-slate-800 text-slate-600 cursor-not-allowed' :
                      playing ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30'}`}
                >
                  {playing
                    ? <><Pause className="w-3.5 h-3.5" /> Pause Tracking</>
                    : <><Play  className="w-3.5 h-3.5" /> {finished ? 'Done' : stepIdx === 0 ? 'Start Navigation' : 'Resume Tracking'}</>
                  }
                </button>
                <button
                  onClick={handleReset}
                  className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Reset to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT MAP PANEL ─────────────────────────────── */}
      <div className="flex-1 h-full flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0f18]">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block">Live GPS Tracking</span>
            <h3 className="text-base font-bold text-slate-100">
              {hasRoute ? `${startQuery?.split(',')[0] || 'Start'} → ${destQuery?.split(',')[0] || 'Destination'}` : 'Awaiting Route'}
            </h3>
          </div>
          {playing && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[11px] text-blue-300 font-medium">Tracking Active</span>
            </div>
          )}
          {finished && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <span className="text-[11px] text-emerald-300 font-medium">✅ Arrived</span>
            </div>
          )}
        </div>

        {/* Leaflet Map */}
        <div ref={mapRef} className="flex-1" style={{ background: '#0a0f18' }} />
      </div>

    </div>
  );
}

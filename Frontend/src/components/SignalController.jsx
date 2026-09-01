import React, { useState, useEffect } from 'react';
import { Sliders, Activity, Play, Pause, TrendingDown, Fuel, Leaf, CheckCircle } from 'lucide-react';

export default function SignalController() {
  // Demand sliders state (Vehicles Per Hour per approach)
  const [northFlow, setNorthFlow] = useState(650);
  const [southFlow, setSouthFlow] = useState(580);
  const [eastFlow, setEastFlow] = useState(1100);
  const [westFlow, setWestFlow] = useState(350);

  // Optimization calculation output state
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);

  // Live simulation state
  const [simRunning, setSimRunning] = useState(true);
  const [currentPhase, setCurrentPhase] = useState('EW_GREEN'); // 'EW_GREEN', 'EW_YELLOW', 'NS_GREEN', 'NS_YELLOW'
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(45);

  // Fetch optimal timing from backend using Webster Minimum Delay Formula
  const fetchOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/signals/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          north_flow: northFlow,
          south_flow: southFlow,
          east_flow: eastFlow,
          west_flow: westFlow
        })
      });
      if (res.ok) {
        const data = await res.json();
        setOptimization(data);
      }
    } catch (err) {
      console.warn("Signal optimization fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever sliders change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOptimization();
    }, 150);
    return () => clearTimeout(timer);
  }, [northFlow, southFlow, eastFlow, westFlow]);

  // Real-time Simulation Clock Cycle
  useEffect(() => {
    if (!simRunning || !optimization) return;

    const interval = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        const ewGreen = optimization.phase_ew_green_sec || 45;
        const nsGreen = optimization.phase_ns_green_sec || 35;
        const yellowSec = optimization.yellow_sec || 4;

        if (currentPhase === 'EW_GREEN') {
          setCurrentPhase('EW_YELLOW');
          return yellowSec;
        } else if (currentPhase === 'EW_YELLOW') {
          setCurrentPhase('NS_GREEN');
          return nsGreen;
        } else if (currentPhase === 'NS_GREEN') {
          setCurrentPhase('NS_YELLOW');
          return yellowSec;
        } else {
          setCurrentPhase('EW_GREEN');
          return ewGreen;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [simRunning, currentPhase, optimization]);

  // Helper for light states
  const isEWGreen = currentPhase === 'EW_GREEN';
  const isEWYellow = currentPhase === 'EW_YELLOW';
  const isNSGreen = currentPhase === 'NS_GREEN';
  const isNSYellow = currentPhase === 'NS_YELLOW';

  return (
    <div className="flex-1 h-full bg-[#0d121d] text-slate-200 flex overflow-hidden font-sans">
      
      {/* LEFT CONTROL & TELEMETRY PANEL */}
      <div className="w-[420px] bg-[#0d121d]/95 border-r border-slate-800 p-5 flex flex-col justify-between overflow-y-auto select-none">
        <div className="space-y-4">
          
          {/* Header */}
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Adaptive Signal Controller
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h2>
              <p className="text-[10px] text-slate-400">Webster's Delay Optimization Algorithm</p>
            </div>
          </div>

          {/* Demand Sliders (North, South, East, West) */}
          <div className="bg-[#141b29] border border-slate-800 p-4 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Approach Volumes (Vehicles / Hr)
              </span>
              <button 
                onClick={() => { setNorthFlow(600); setSouthFlow(600); setEastFlow(600); setWestFlow(600); }}
                title="Balance all lanes"
                className="text-[10px] text-slate-400 hover:text-amber-400 cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* North Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">⬆ North Approach</span>
                <span className="font-bold text-amber-400">{northFlow} <span className="text-[9px] font-normal text-slate-500">vph</span></span>
              </div>
              <input
                type="range" min="100" max="1800" step="50"
                value={northFlow} onChange={(e) => setNorthFlow(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* South Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">⬇ South Approach</span>
                <span className="font-bold text-amber-400">{southFlow} <span className="text-[9px] font-normal text-slate-500">vph</span></span>
              </div>
              <input
                type="range" min="100" max="1800" step="50"
                value={southFlow} onChange={(e) => setSouthFlow(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* East Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">➡ East Approach</span>
                <span className="font-bold text-amber-400">{eastFlow} <span className="text-[9px] font-normal text-slate-500">vph</span></span>
              </div>
              <input
                type="range" min="100" max="1800" step="50"
                value={eastFlow} onChange={(e) => setEastFlow(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* West Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400 font-medium">⬅ West Approach</span>
                <span className="font-bold text-amber-400">{westFlow} <span className="text-[9px] font-normal text-slate-500">vph</span></span>
              </div>
              <input
                type="range" min="100" max="1800" step="50"
                value={westFlow} onChange={(e) => setWestFlow(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* AI Webster Optimization Results */}
          {optimization && (
            <div className="bg-[#141b29] border border-slate-800 p-4 rounded-xl space-y-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block border-b border-slate-800 pb-1.5">
                Webster Adaptive Timing Split
              </span>

              {/* Dual Green Split Visual Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-emerald-400 font-bold">East-West: {optimization.phase_ew_green_sec}s Green</span>
                  <span className="text-sky-400 font-bold">North-South: {optimization.phase_ns_green_sec}s Green</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${(optimization.phase_ew_green_sec / optimization.cycle_length_sec) * 100}%` }} 
                    className="bg-emerald-500 transition-all duration-500" 
                    title="East-West Green Allocation"
                  />
                  <div 
                    style={{ width: `${((optimization.yellow_sec * 2) / optimization.cycle_length_sec) * 100}%` }} 
                    className="bg-amber-400" 
                    title="Clearance Intervals"
                  />
                  <div 
                    style={{ width: `${(optimization.phase_ns_green_sec / optimization.cycle_length_sec) * 100}%` }} 
                    className="bg-sky-500 transition-all duration-500" 
                    title="North-South Green Allocation"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                  <span>Cycle Length: {optimization.cycle_length_sec}s</span>
                  <span>Clearance: {optimization.yellow_sec * 2}s</span>
                </div>
              </div>

              {/* Key Impact Metric Cards */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-[#0d121d] p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <TrendingDown className="w-3 h-3 text-emerald-400" />
                    <span>Delay Reduced</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {optimization.metrics?.delay_reduction_pct}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">vs. static 45s timers</span>
                </div>

                <div className="bg-[#0d121d] p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <CheckCircle className="w-3 h-3 text-amber-400" />
                    <span>Avg Wait Time</span>
                  </div>
                  <span className="text-sm font-bold text-amber-400">
                    {optimization.metrics?.avg_vehicle_wait_sec}s
                  </span>
                  <span className="text-[9px] text-slate-500 block">per vehicle</span>
                </div>

                <div className="bg-[#0d121d] p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <Fuel className="w-3 h-3 text-sky-400" />
                    <span>Fuel Saved</span>
                  </div>
                  <span className="text-sm font-bold text-sky-400">
                    {optimization.metrics?.fuel_saved_liters_hr} L/h
                  </span>
                  <span className="text-[9px] text-slate-500 block">idle fuel saved</span>
                </div>

                <div className="bg-[#0d121d] p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                    <Leaf className="w-3 h-3 text-emerald-400" />
                    <span>CO2 Cut</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400">
                    {optimization.metrics?.co2_saved_kg_hr} kg/h
                  </span>
                  <span className="text-[9px] text-slate-500 block">emissions cut</span>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* RIGHT INTERACTIVE 4-WAY CROSSROAD VISUALIZATION */}
      <div className="flex-1 h-full bg-[#0a0f18] relative flex flex-col justify-between p-6 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between z-10">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-widest block">Intersection Control Simulation</span>
            <h3 className="text-base font-bold text-slate-100">Smart 4-Way Traffic Intersection</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#141b29] px-3.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className="text-xs text-slate-400">Active Phase:</span>
              <span className="text-xs font-bold font-mono text-amber-400">
                {currentPhase.replace('_', ' ')} ({phaseSecondsLeft}s)
              </span>
            </div>

            <button
              onClick={() => setSimRunning(!simRunning)}
              className="p-2 bg-[#141b29] hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition flex items-center gap-1.5 text-xs"
            >
              {simRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
              <span>{simRunning ? 'Pause' : 'Resume'}</span>
            </button>
          </div>
        </div>

        {/* 4-WAY CROSSROAD GRAPHICAL CANVAS */}
        <div className="flex-1 flex items-center justify-center relative my-4 select-none">
          
          {/* Intersection Road Asphalt Cross */}
          <div className="relative w-[500px] h-[500px] bg-[#101726] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            
            {/* North-South Vertical Road */}
            <div className="absolute top-0 bottom-0 w-36 bg-[#182236] border-x border-slate-700/50 flex flex-col justify-between items-center py-2">
              {/* Lane Divider Dashes Top */}
              <div className="w-0.5 h-36 border-l border-dashed border-amber-400/50"></div>
              {/* Lane Divider Dashes Bottom */}
              <div className="w-0.5 h-36 border-l border-dashed border-amber-400/50"></div>
            </div>

            {/* East-West Horizontal Road */}
            <div className="absolute left-0 right-0 h-36 bg-[#182236] border-y border-slate-700/50 flex justify-between items-center px-2">
              {/* Lane Divider Dashes Left */}
              <div className="h-0.5 w-36 border-t border-dashed border-amber-400/50"></div>
              {/* Lane Divider Dashes Right */}
              <div className="h-0.5 w-36 border-t border-dashed border-amber-400/50"></div>
            </div>

            {/* Center Junction Intersection Box */}
            <div className="w-36 h-36 bg-[#151d2f] border border-amber-500/20 z-0 flex items-center justify-center">
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest text-center">
                Conflict<br/>Zone
              </div>
            </div>

            {/* ----------------- TRAFFIC SIGNALS & QUEUES ----------------- */}

            {/* NORTH SIGNAL (Faces Southward) */}
            <div className="absolute top-8 flex flex-col items-center z-10">
              <div className="bg-[#0b101d] border border-slate-700 p-1.5 rounded-lg flex flex-col gap-1 shadow-lg">
                <div className={`w-3.5 h-3.5 rounded-full ${(!isNSGreen && !isNSYellow) ? 'bg-rose-500 shadow-md shadow-rose-500' : 'bg-rose-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isNSYellow ? 'bg-amber-400 shadow-md shadow-amber-400 animate-pulse' : 'bg-amber-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isNSGreen ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-emerald-950/40'}`}></div>
              </div>
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded mt-1 ${isNSGreen ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-900/60'}`}>
                {isNSGreen ? `${phaseSecondsLeft}s` : 'RED'}
              </span>
              <div className="mt-2 flex items-center gap-1 bg-[#141b29]/90 px-2.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-300">
                <span>🚗 Queue:</span>
                <span className="font-bold text-amber-400">{Math.round(northFlow / 20)} cars</span>
              </div>
            </div>

            {/* SOUTH SIGNAL (Faces Northward) */}
            <div className="absolute bottom-8 flex flex-col items-center z-10">
              <div className="mb-2 flex items-center gap-1 bg-[#141b29]/90 px-2.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-300">
                <span>🚗 Queue:</span>
                <span className="font-bold text-amber-400">{Math.round(southFlow / 20)} cars</span>
              </div>
              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded mb-1 ${isNSGreen ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-900/60'}`}>
                {isNSGreen ? `${phaseSecondsLeft}s` : 'RED'}
              </span>
              <div className="bg-[#0b101d] border border-slate-700 p-1.5 rounded-lg flex flex-col gap-1 shadow-lg">
                <div className={`w-3.5 h-3.5 rounded-full ${(!isNSGreen && !isNSYellow) ? 'bg-rose-500 shadow-md shadow-rose-500' : 'bg-rose-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isNSYellow ? 'bg-amber-400 shadow-md shadow-amber-400 animate-pulse' : 'bg-amber-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isNSGreen ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-emerald-950/40'}`}></div>
              </div>
            </div>

            {/* WEST SIGNAL (Faces Eastward) */}
            <div className="absolute left-6 flex items-center gap-2 z-10">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 bg-[#141b29]/90 px-2.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-300 mb-1">
                  <span>🚗 Queue:</span>
                  <span className="font-bold text-amber-400">{Math.round(westFlow / 20)} cars</span>
                </div>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${isEWGreen ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-900/60'}`}>
                  {isEWGreen ? `${phaseSecondsLeft}s` : 'RED'}
                </span>
              </div>
              <div className="bg-[#0b101d] border border-slate-700 p-1.5 rounded-lg flex gap-1 shadow-lg">
                <div className={`w-3.5 h-3.5 rounded-full ${(!isEWGreen && !isEWYellow) ? 'bg-rose-500 shadow-md shadow-rose-500' : 'bg-rose-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isEWYellow ? 'bg-amber-400 shadow-md shadow-amber-400 animate-pulse' : 'bg-amber-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isEWGreen ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-emerald-950/40'}`}></div>
              </div>
            </div>

            {/* EAST SIGNAL (Faces Westward) */}
            <div className="absolute right-6 flex items-center gap-2 z-10">
              <div className="bg-[#0b101d] border border-slate-700 p-1.5 rounded-lg flex gap-1 shadow-lg">
                <div className={`w-3.5 h-3.5 rounded-full ${(!isEWGreen && !isEWYellow) ? 'bg-rose-500 shadow-md shadow-rose-500' : 'bg-rose-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isEWYellow ? 'bg-amber-400 shadow-md shadow-amber-400 animate-pulse' : 'bg-amber-950/40'}`}></div>
                <div className={`w-3.5 h-3.5 rounded-full ${isEWGreen ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-emerald-950/40'}`}></div>
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1 bg-[#141b29]/90 px-2.5 py-0.5 rounded border border-slate-700 text-[10px] text-slate-300 mb-1">
                  <span>🚗 Queue:</span>
                  <span className="font-bold text-amber-400">{Math.round(eastFlow / 20)} cars</span>
                </div>
                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${isEWGreen ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-400 bg-slate-900/60'}`}>
                  {isEWGreen ? `${phaseSecondsLeft}s` : 'RED'}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

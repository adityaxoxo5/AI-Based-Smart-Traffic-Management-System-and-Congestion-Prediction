import React, { useState, useEffect } from 'react';
import { Ambulance, MapPin, Zap } from 'lucide-react';

export default function EmergencyDispatch({ startCoords, destCoords, startQuery, destQuery }) {
  const [incidentType, setIncidentType] = useState('Medical Emergency');
  const [dispatchResult, setDispatchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeLat = startCoords?.lat || 17.3850;
  const activeLon = startCoords?.lon || 78.4867;
  const routeLabel = startQuery && destQuery 
    ? `${startQuery.split(',')[0]} → ${destQuery.split(',')[0]}` 
    : 'Active Searched Route Corridor';

  const handleDispatch = async (currentIncidentType = incidentType) => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/emergency/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_lat: activeLat,
          incident_lon: activeLon,
          incident_type: currentIncidentType,
          route_hint: routeLabel
        }),
      });
      const data = await res.json();
      setDispatchResult(data);
    } catch (err) {
      console.error("Dispatch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleDispatch(incidentType);
  }, [startCoords, destCoords]);

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setIncidentType(newType);
    handleDispatch(newType);
  };

  return (
    <div className="w-[420px] h-full bg-[#0d121d]/95 border-r border-slate-800 p-5 z-10 flex flex-col justify-between select-none overflow-y-auto font-sans">
      <div>
        {/* Title */}
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800 mb-4">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
            <Ambulance className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              Emergency Vehicle Dispatch
            </h2>
            
          </div>
        </div>

        {/* Current Active Route Banner */}
        <div className="bg-[#141b29] border border-slate-800 p-3 rounded-xl mb-4">
          <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">Route Corridor:</span>
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            {routeLabel}
          </span>
        </div>

        {/* Incident Trigger Form (Dropdown + Dispatch Button) */}
        <div className="bg-[#141b29] border border-slate-800 p-4 rounded-xl space-y-3 mb-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-medium">Select Incident Type</label>
            <select
              value={incidentType}
              onChange={handleTypeChange}
              className="w-full bg-[#0d121d] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="Medical Emergency">🏥 Medical Emergency </option>
              <option value="Fire Incident">🚒 Fire Incident </option>
              <option value="Vehicle Collision">🚓 Vehicle Collision </option>
            </select>
          </div>

          <button
            onClick={() => handleDispatch(incidentType)}
            disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shadow-rose-500/20 cursor-pointer uppercase tracking-wider"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            {loading ? 'DISPATCHING NEAREST FACILITY...' : 'DISPATCH NEAREST UNIT'}
          </button>
        </div>

        {/* Registered Emergency Facilities List */}
        {dispatchResult?.all_stations && (
          <div className="bg-[#141b29] border border-slate-800 p-4 rounded-xl">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Available Facilities for {incidentType}
            </h4>
            <div className="space-y-2">
              {dispatchResult.all_stations.map((hub) => (
                <div 
                  key={hub.id} 
                  className={`flex items-center gap-2 p-2.5 rounded-lg border transition ${
                    dispatchResult.assigned_hub.id === hub.id
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#0d121d] border-slate-800'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${dispatchResult.assigned_hub.id === hub.id ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">{hub.name}</div>
                    <div className="text-[9px] text-slate-500">{hub.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

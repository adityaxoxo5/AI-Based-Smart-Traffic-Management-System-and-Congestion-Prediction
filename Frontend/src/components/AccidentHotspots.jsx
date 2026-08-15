import React from 'react';
import { AlertTriangle, MapPin } from 'lucide-react';

const AccidentHotspots = ({ hotspots }) => {
  return (
    <div className="w-[380px] bg-[#0d121d]/95 backdrop-blur-md border-r border-slate-800 p-5 z-10 overflow-y-auto text-slate-200">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-100">Accident Hotspots</h2>
        <p className="text-xs text-slate-400 mt-1">DBSCAN Spatial Corridor Clustering</p>
      </div>

      <div className="space-y-3">
        {hotspots.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Please search a route in Route Planner to calculate corridor hotspots.</p>
        ) : (
          hotspots.map((item) => (
            <div key={item.cluster_id} className="p-4 bg-[#131a28] border border-slate-800 rounded-lg">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-slate-100 font-sans">{item.area_name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    item.risk_level === 'Critical'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {item.risk_level} Risk
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1 mt-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span>Cluster ID: {item.cluster_id}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
                <span className="text-amber-400 font-semibold">{item.incident_count} Incidents Reported</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AccidentHotspots;
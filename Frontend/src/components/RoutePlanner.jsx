import React, { useState } from 'react';
import { MapPin, Navigation, Crosshair, Loader2, Clock, Gauge } from 'lucide-react';
import { searchLocation, calculateRoute } from '../services/routingService';

const RoutePlanner = ({
  startQuery, setStartQuery,
  destQuery, setDestQuery,
  startCoords, setStartCoords,
  destCoords, setDestCoords,
  routes, setRoutes,
  selectedRouteId, setSelectedRouteId,
  onRoutesFound
}) => {
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleStartChange = async (e) => {
    const val = e.target.value;
    setStartQuery(val);
    setStartCoords(null);
    if (val.length > 2) setStartSuggestions(await searchLocation(val));
    else setStartSuggestions([]);
  };

  const handleDestChange = async (e) => {
    const val = e.target.value;
    setDestQuery(val);
    setDestCoords(null);
    if (val.length > 2) setDestSuggestions(await searchLocation(val));
    else setDestSuggestions([]);
  };

  const handleUseGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setStartCoords(coords);
        setStartQuery('My Current Location');
        setStartSuggestions([]);
      });
    }
  };

  const handleSearch = async () => {
    let currentStart = startCoords;
    let currentDest = destCoords;

    setLoading(true);
    try {
      if (!currentStart && startQuery.trim()) {
        const startResults = await searchLocation(startQuery);
        if (startResults.length > 0) {
          currentStart = { lat: startResults[0].lat, lon: startResults[0].lon };
          setStartCoords(currentStart);
        }
      }

      if (!currentDest && destQuery.trim()) {
        const destResults = await searchLocation(destQuery);
        if (destResults.length > 0) {
          currentDest = { lat: destResults[0].lat, lon: destResults[0].lon };
          setDestCoords(currentDest);
        }
      }

      if (!currentStart || !currentDest) {
        alert("Please enter valid starting and destination locations.");
        setLoading(false);
        return;
      }

      const res = await calculateRoute(currentStart, currentDest);

     


      setRoutes(res);
      onRoutesFound(res, currentStart, currentDest);
    } catch (e) {
      alert("Could not calculate driving routes between these locations. Try searching specific city names.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-[380px] bg-[#0d121d]/95 backdrop-blur-md border-r border-slate-800 p-5 z-10 flex flex-col justify-between text-slate-200 overflow-y-auto">
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-100">Plan a Route</h2>
          <p className="text-xs text-slate-400 mt-1">Any two places, anywhere in the world.</p>
        </div>

        <div className="space-y-4">
          {/* Start Input */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Start</span>
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={startQuery}
                onChange={handleStartChange}
                placeholder="Enter starting point..."
                className="w-full bg-[#151c2c] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleUseGPS}
                title="Use Current Location"
                className="ml-2 p-2.5 bg-[#151c2c] border border-slate-700/80 rounded-lg text-slate-400 hover:text-amber-400 hover:border-amber-500 transition-colors cursor-pointer"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </div>
            {startSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[#151c2c] border border-slate-700 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
                {startSuggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => {
                      setStartCoords({ lat: item.lat, lon: item.lon });
                      setStartQuery(item.name.split(',')[0]);
                      setStartSuggestions([]);
                    }}
                    className="p-2.5 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destination Input */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-400 mb-1.5 flex items-center space-x-1">
              <Navigation className="w-3.5 h-3.5 text-slate-400" />
              <span>Destination</span>
            </label>
            <input
              type="text"
              value={destQuery}
              onChange={handleDestChange}
              placeholder="Enter destination..."
              className="w-full bg-[#151c2c] border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {destSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-[#151c2c] border border-slate-700 rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
                {destSuggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => {
                      setDestCoords({ lat: item.lat, lon: item.lon });
                      setDestQuery(item.name.split(',')[0]);
                      setDestSuggestions([]);
                    }}
                    className="p-2.5 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Find Routes Button */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-lg shadow-lg shadow-amber-500/10 transition-all duration-200 flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Finding Routes...</span>
              </>
            ) : (
              <span>Find Routes</span>
            )}
          </button>
        </div>

        {/* Saved Calculated Routes */}
        {routes.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Optimal Routes ({routes.length})
            </h3>
            {routes.map((rt) => (
              <div
                key={rt.id}
                onClick={() => setSelectedRouteId(rt.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedRouteId === rt.id
                    ? 'bg-[#1a2335] border-amber-500 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-[#131a28] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-200">{rt.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                      rt.congestionIndex > 70
                        ? 'bg-red-500/20 text-red-400'
                        : rt.congestionIndex > 45
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {rt.congestionIndex > 70 ? 'Heavy Traffic' : rt.congestionIndex > 45 ? 'Moderate' : 'Smooth'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{rt.durationMins} mins</span>
                  </span>
                  <span>{rt.distanceKm} km</span>
                  <span className="flex items-center space-x-1 text-slate-300 font-mono">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span>Congestion: {rt.congestionIndex}%</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutePlanner;
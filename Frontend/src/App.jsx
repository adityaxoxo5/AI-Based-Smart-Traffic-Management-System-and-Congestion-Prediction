import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import RoutePlanner from './components/RoutePlanner';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AccidentHotspots from './components/AccidentHotspots';
import AITrafficAssistant from './components/AITrafficAssistant';
import EmergencyDispatch from './components/EmergencyDispatch';

export default function App() {
  const [activeTab, setActiveTab] = useState('route');
  
  const [startQuery, setStartQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(0);

  const [hotspots, setHotspots] = useState([]);

  const handleRoutesFound = (foundRoutes, start, dest) => {
    setRoutes(foundRoutes);
    setSelectedRouteId(0);
    setStartCoords(start);
    setDestCoords(dest);

    // Fetch Route-Specific Hotspots from FastAPI
    fetch('http://127.0.0.1:8000/api/hotspots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_lat: start.lat,
        start_lon: start.lon,
        dest_lat: dest.lat,
        dest_lon: dest.lon
      })
    })
      .then((res) => res.json())
      .then((data) => setHotspots(data))
      .catch((err) => console.error("Error fetching route hotspots:", err));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d121d]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'route' && (
        <RoutePlanner 
          startQuery={startQuery}
          setStartQuery={setStartQuery}
          destQuery={destQuery}
          setDestQuery={setDestQuery}
          startCoords={startCoords}
          setStartCoords={setStartCoords}
          destCoords={destCoords}
          setDestCoords={setDestCoords}
          routes={routes}
          setRoutes={setRoutes}
          selectedRouteId={selectedRouteId}
          setSelectedRouteId={setSelectedRouteId}
          onRoutesFound={handleRoutesFound}
        />
      )}
      {activeTab === 'analytics' && <AnalyticsDashboard startCoords={startCoords} destCoords={destCoords} />}
      {activeTab === 'hotspots' && <AccidentHotspots hotspots={hotspots} />}
      {activeTab === 'insights' && <AITrafficAssistant />}
      {activeTab === 'dispatch' && (
        <EmergencyDispatch 
          startCoords={startCoords}
          destCoords={destCoords}
          startQuery={startQuery}
          destQuery={destQuery}
        />
      )}

      <div className="flex-1 h-full relative">
        <MapView
          routes={routes}
          selectedRouteId={selectedRouteId}
          startCoords={startCoords}
          destCoords={destCoords}
          hotspots={hotspots}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
}
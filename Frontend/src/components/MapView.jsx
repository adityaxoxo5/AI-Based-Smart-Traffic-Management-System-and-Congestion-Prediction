import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const MapView = ({ routes, selectedRouteId, startCoords, destCoords, hotspots, activeTab }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      // Global World Map Initial View!
      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([20.0, 0.0], 3);

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Esri Dark Canvas Base Map (Completely free, no API key, no watermark)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      }).addTo(map);

      // Esri Reference Labels Overlay
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
      }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Render DBSCAN Hotspots if on Hotspots tab
    if (activeTab === 'hotspots' && hotspots.length > 0) {
      const bounds = L.latLngBounds();
      hotspots.forEach((hs) => {
        const hazardIcon = L.divIcon({
          className: 'hazard-marker',
          html: `<div style="background-color:#ef4444; width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 14px #ef4444;" class="animate-pulse"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        L.marker([hs.center_lat, hs.center_lon], { icon: hazardIcon })
          .bindPopup(`<b>${hs.area_name}</b><br><span style="color:#ef4444;">${hs.risk_level} Risk Zone</span><br>${hs.incident_count} Incidents Reported`)
          .addTo(layerGroup);

        bounds.extend([hs.center_lat, hs.center_lon]);
      });
      map.fitBounds(bounds, { padding: [60, 60] });
      return;
    }

    // 2. Render Route Polylines
    if (startCoords && destCoords && routes.length > 0) {
      const bounds = L.latLngBounds();

      const startIcon = L.divIcon({
        className: 'custom-start',
        html: `<div style="background-color:#10b981; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px #10b981;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const destIcon = L.divIcon({
        className: 'custom-dest',
        html: `<div style="background-color:#f59e0b; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 10px #f59e0b;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      L.marker([startCoords.lat, startCoords.lon], { icon: startIcon }).addTo(layerGroup);
      L.marker([destCoords.lat, destCoords.lon], { icon: destIcon }).addTo(layerGroup);

      bounds.extend([startCoords.lat, startCoords.lon]);
      bounds.extend([destCoords.lat, destCoords.lon]);

      routes.forEach((route) => {
        const isSelected = route.id === selectedRouteId;
        L.polyline(route.coordinates, {
          color: isSelected ? '#f59e0b' : '#38bdf8',
          weight: isSelected ? 6 : 3,
          opacity: isSelected ? 0.95 : 0.4,
          dashArray: isSelected ? null : '6, 8',
        }).addTo(layerGroup);

        route.coordinates.forEach((pt) => bounds.extend(pt));
      });

      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, selectedRouteId, startCoords, destCoords, hotspots, activeTab]);

  return <div ref={mapRef} className="w-full h-full bg-[#0d121d] select-none" />;
};

export default MapView;
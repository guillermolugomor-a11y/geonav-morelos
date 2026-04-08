import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MiniMapProps {
  geometry: any;
  className?: string;
}

const MapAutoCenter: React.FC<{ geometry: any }> = ({ geometry }) => {
  const map = useMap();

  useEffect(() => {
    if (!geometry) return;
    try {
      const bounds = L.geoJSON(geometry).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [10, 10], animate: true });
      }
    } catch (e) {
      console.error('Error fitting bounds in MiniMap:', e);
    }
  }, [geometry, map]);

  return null;
};

export const MiniMap: React.FC<MiniMapProps> = ({ geometry, className = "" }) => {
  if (!geometry) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-inner ${className}`}>
      <MapContainer
        center={[18.92, -99.23]}
        zoom={13}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON 
          data={geometry} 
          style={{
            color: '#8C3154',
            weight: 2,
            fillColor: '#8C3154',
            fillOpacity: 0.15
          }}
        />
        <MapAutoCenter geometry={geometry} />
      </MapContainer>
      <div className="absolute inset-0 pointer-events-none border-[6px] border-white/20 rounded-2xl z-[1000]" />
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface StateBoundaryLayerProps {
    isRoutingActive: boolean;
    isAdmin: boolean;
    userId?: string;
}

export const StateBoundaryLayer: React.FC<StateBoundaryLayerProps> = ({ isRoutingActive, isAdmin, userId }) => {
    const [geojsonData, setGeojsonData] = useState<any>(null);
    const map = useMapEvents({
        zoomend: () => {
            setZoomLevel(map.getZoom());
        }
    });
    const [zoomLevel, setZoomLevel] = useState<number>(map.getZoom());

    useEffect(() => {
        fetch('/morelos_outline.geojson')
            .then(res => res.json())
            .then(data => {
                setGeojsonData(data);
            })
            .catch(err => console.error('Error cargando contorno del estado:', err));
    }, []);

    const style = () => {
        return {
            fillColor: 'transparent',
            weight: 3,
            opacity: 1,
            color: '#8C3154', // Color distintivo del sistema
            fillOpacity: 0
        };
    };

    // Solo visible en zoom lejano (menor a 13) y para administradores
    if (zoomLevel >= 13 || !isAdmin) return null;
    if (!geojsonData) return null;

    return (
        <GeoJSON 
            data={geojsonData} 
            style={style}
            interactive={false} // No necesita clics, es solo decorativo/informativo
        />
    );
};

import React, { useCallback, useRef, useEffect } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { Poligono } from '../../types';

interface PolygonLayerProps {
    data: any; // FeatureCollection
    tareas: any[];
    searchedPoligonoIds: number[];
    isHighZoom: boolean;
    onPoligonoSelect: (poligono: any) => void;
    handleMapSelection: (latlng: { lat: number; lng: number }) => void;
    isRoutingActive: boolean;
}

export const PolygonLayer: React.FC<PolygonLayerProps> = ({
    data,
    tareas,
    searchedPoligonoIds,
    isHighZoom,
    onPoligonoSelect,
    handleMapSelection,
    isRoutingActive
}) => {

    const routeStateRef = useRef({ isRoutingActive });
    useEffect(() => {
        routeStateRef.current = { isRoutingActive };
    }, [isRoutingActive]);

    const getStyle = useCallback((p: any) => {
        const isAssigned = tareas.some(t => t.polygon_id === p.id && t.status !== 'completada');
        const isSearched = searchedPoligonoIds.includes(p.id);

        return {
            fillColor: isSearched ? '#773357' : (isAssigned ? '#ef4444' : 'transparent'),
            weight: isSearched ? 4 : 3,
            opacity: 0.8,
            color: isSearched ? '#773357' : (isAssigned ? '#b91c1c' : '#2E3B2B'),
            fillOpacity: isSearched ? 0.3 : (isAssigned ? 0.2 : 0),
            interactive: true
        };
    }, [tareas, searchedPoligonoIds]);

    const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
        layer.on({
            click: (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                if (routeStateRef.current.isRoutingActive) {
                    handleMapSelection({ lat: e.latlng.lat, lng: e.latlng.lng });
                } else {
                    onPoligonoSelect(feature.properties);
                }
            },
            mouseover: (e: L.LeafletMouseEvent) => {
                const l = e.target as L.Path;
                l.setStyle({ fillOpacity: 0.1 });
            },
            mouseout: (e: L.LeafletMouseEvent) => {
                const l = e.target as L.Path;
                l.setStyle({ fillOpacity: 0 }); // Restaura a transparente original
            }
        });
    }, [onPoligonoSelect, handleMapSelection]);

    return (
        <GeoJSON
            key={`layer-secciones-${data.features.length}-${searchedPoligonoIds.join(',')}-${isHighZoom}`}
            data={data}
            style={(feature) => getStyle(feature?.properties)}
            onEachFeature={onEachFeature}
        />
    );
};

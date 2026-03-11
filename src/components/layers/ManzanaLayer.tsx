import React, { useCallback, useRef, useEffect } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { Poligono } from '../../types';

const MANZANA_COLORS = [
    '#f43f5e', // rose
    '#8b5cf6', // violet
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#84cc16', // lime
    '#f97316', // orange
];

const getManzanaColor = (id: number) => {
    return MANZANA_COLORS[id % MANZANA_COLORS.length];
};

interface ManzanaLayerProps {
    data: any; // FeatureCollection
    tareas: any[];
    searchedPoligonoIds: number[];
    isHighZoom: boolean;
    onPoligonoSelect: (poligono: any) => void;
    handleMapSelection: (latlng: { lat: number; lng: number }) => void;
    isRoutingActive: boolean;
    layerKeyPrefix: string;
}

export const ManzanaLayer: React.FC<ManzanaLayerProps> = ({
    data,
    tareas,
    searchedPoligonoIds,
    isHighZoom,
    onPoligonoSelect,
    handleMapSelection,
    isRoutingActive,
    layerKeyPrefix
}) => {

    const routeStateRef = useRef({ isRoutingActive });
    useEffect(() => {
        routeStateRef.current = { isRoutingActive };
    }, [isRoutingActive]);

    const getStyle = useCallback((p: any) => {
        const isAssigned = tareas.some(t => t.polygon_id === p.id && t.status !== 'completada');
        const isSearched = searchedPoligonoIds.includes(p.id);

        // Determine base color based on zoom level
        let baseColor = '';
        let borderColor = '';

        if (isHighZoom) {
            // High zoom: different color per manzana
            baseColor = getManzanaColor(p.id);
            borderColor = '#2E3B2B'; // Verde Oscuro institucional
        } else {
            // Low zoom: uniform color using warm grey and institutional green
            baseColor = p.tipo === 'Manzana Completa' ? '#CDA077' : '#7C2855';
            borderColor = '#2E3B2B';
        }

        return {
            fillColor: isSearched ? '#773357' : (isAssigned ? '#ef4444' : baseColor),
            weight: isSearched ? 2 : 1,
            opacity: 1,
            color: isSearched ? '#773357' : (isAssigned ? '#b91c1c' : borderColor),
            fillOpacity: isSearched ? 0.8 : (isAssigned ? 0.6 : (isHighZoom ? 0.6 : 0.4)),
            interactive: true
        };
    }, [tareas, searchedPoligonoIds, isHighZoom]);

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
                l.setStyle({ fillOpacity: 0.5 });
            },
            mouseout: (e: L.LeafletMouseEvent) => {
                const l = e.target as L.Path;
                l.setStyle({ fillOpacity: getStyle(feature.properties).fillOpacity }); // Restaura original
            }
        });
    }, [onPoligonoSelect, handleMapSelection, getStyle]);

    return (
        <GeoJSON
            key={`${layerKeyPrefix}-${data.features.length}-${searchedPoligonoIds.join(',')}-${isHighZoom}`}
            data={data}
            style={(feature) => getStyle(feature?.properties)}
            onEachFeature={onEachFeature}
        />
    );
};

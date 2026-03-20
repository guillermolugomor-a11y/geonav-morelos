import React, { useEffect, useRef } from 'react';

import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { routeService } from '../services/routeService';

interface LatLng {
    lat: number;
    lng: number;
}

interface RouteResult {
    distance: number; // meters
    duration: number; // seconds
    geometry: any;    // GeoJSON LineString
}

export type { LatLng, RouteResult };

interface RouteControllerProps {
    active: boolean;
    origin: LatLng | null;
    destination: LatLng | null;
    travelMode: 'driving' | 'foot';
    onOriginSet: (latlng: LatLng) => void;
    onDestinationSet: (latlng: LatLng) => void;
    onRouteResult: (result: RouteResult) => void;
    onReset: () => void;
}

export const RouteController: React.FC<RouteControllerProps> = ({
    active,
    origin,
    destination,
    travelMode,
    onOriginSet,
    onDestinationSet,
    onRouteResult,
    onReset,
}) => {
    const map = useMap();
    const originMarkerRef = useRef<L.Marker | null>(null);
    const destMarkerRef = useRef<L.Marker | null>(null);
    const routeLayerRef = useRef<L.GeoJSON | null>(null);

    // Cleanup function
    const cleanup = () => {
        if (originMarkerRef.current) {
            if (map.hasLayer(originMarkerRef.current)) originMarkerRef.current.remove();
            originMarkerRef.current = null;
        }
        if (destMarkerRef.current) {
            if (map.hasLayer(destMarkerRef.current)) destMarkerRef.current.remove();
            destMarkerRef.current = null;
        }
        if (routeLayerRef.current) {
            if (map.hasLayer(routeLayerRef.current)) routeLayerRef.current.remove();
            routeLayerRef.current = null;
        }
    };

    // Manage map cursor and click handler
    useEffect(() => {
        if (!active) {
            cleanup();
            map.getContainer().style.cursor = '';
            return;
        }

        map.getContainer().style.cursor = 'crosshair';

        const handleClick = (e: L.LeafletMouseEvent) => {
            if (!origin) {
                onOriginSet(e.latlng);
            } else if (!destination) {
                onDestinationSet(e.latlng);
            }
        };

        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
            map.getContainer().style.cursor = '';
        };
    }, [active, origin, destination, map, onOriginSet, onDestinationSet]);

    // Draw origin marker
    useEffect(() => {
        if (originMarkerRef.current && map.hasLayer(originMarkerRef.current)) {
            originMarkerRef.current.remove();
        }
        originMarkerRef.current = null;

        if (origin) {
            const icon = L.divIcon({
                html: `<div style="background:#2563eb;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
                className: '',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });
            const marker = L.marker([origin.lat, origin.lng], { icon })
                .addTo(map)
                .bindPopup('<b>🔵 Origen</b>')
                .openPopup();
            originMarkerRef.current = marker;
        }
    }, [origin, map]);

    // Draw destination marker and fetch route
    useEffect(() => {
        if (destMarkerRef.current && map.hasLayer(destMarkerRef.current)) {
            destMarkerRef.current.remove();
        }
        destMarkerRef.current = null;

        if (routeLayerRef.current && map.hasLayer(routeLayerRef.current)) {
            routeLayerRef.current.remove();
        }
        routeLayerRef.current = null;

        if (destination) {
            const icon = L.divIcon({
                html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
                className: '',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });
            const marker = L.marker([destination.lat, destination.lng], { icon })
                .addTo(map)
                .bindPopup('<b>🔴 Destino</b>')
                .openPopup();
            destMarkerRef.current = marker;

            // Fetch route from OSRM
            if (origin) {
                routeService.calculateRoute(origin, destination, travelMode)
                    .then(route => {
                        if (route && routeLayerRef.current === null) {
                            // Draw route line
                            const routeColor = travelMode === 'driving' ? '#2563eb' : '#059669'; // Azul Real para auto, Verde Esmeralda para caminata
                            const layer = L.geoJSON(route.geometry, {
                                style: {
                                    color: routeColor,
                                    weight: 5,
                                    opacity: 0.85,
                                    dashArray: travelMode === 'foot' ? '8, 8' : '8, 4',
                                    lineCap: 'round',
                                    lineJoin: 'round',
                                },
                            }).addTo(map);
                            routeLayerRef.current = layer;

                            // Fit the map to the route
                            map.flyToBounds(layer.getBounds(), { padding: [60, 60], duration: 1.2 });

                            onRouteResult(route);
                        }
                    });
            }
        }
    }, [destination, origin, map, onRouteResult, travelMode]);

    // Handle external reset
    useEffect(() => {
        if (!active) {
            cleanup();
        }
    }, [active]);

    return null;
};

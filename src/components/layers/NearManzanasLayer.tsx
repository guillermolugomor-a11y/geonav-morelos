import React, { useEffect, useState, useMemo, useRef } from 'react';
import { GeoJSON, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { isAdminUser } from '../../constants/roles';
import { debugError, debugLog } from '../../utils/debug';
import { SECCIONES_POR_DISTRITO } from '../../constants/seccionesDistritos';
import { SECCIONES_POR_MUNICIPIO } from '../../constants/seccionesMunicipios';

interface NearManzanasLayerProps {
    tareas: any[];
    tasksUpdateKey?: number;
    handleMapSelection: (latlng: { lat: number; lng: number }) => void;
    isRoutingActive?: boolean;
    manzanasGeojson?: any;
}

export const NearManzanasLayer: React.FC<NearManzanasLayerProps> = React.memo(({
    tareas,
    tasksUpdateKey = 0,
    handleMapSelection,
    isRoutingActive,
    manzanasGeojson
}) => {
    const { perfil, selectedPoligono, setSelectedPoligono } = useStore();
    const selectedDistrito = useStore(s => s.selectedDistrito);
    const selectedMunicipio = useStore(s => s.selectedMunicipio);
    const mapZonaTipo = useStore(s => s.mapZonaTipo);
    const showRank1Pins = useStore(s => s.showRank1Pins);
    const isAdmin = isAdminUser(perfil);

    const vectorGridRef = useRef<any>(null);
    const routeStateRef = useRef({ isRoutingActive });

    const mapInstance = useMapEvents({
        zoomend: () => {
            setZoomLevel(mapInstance.getZoom());
            setMapBounds(mapInstance.getBounds());
        },
        moveend: () => {
            setMapBounds(mapInstance.getBounds());
        }
    });
    const [zoomLevel, setZoomLevel] = useState<number>(mapInstance.getZoom());
    const [mapBounds, setMapBounds] = useState<L.LatLngBounds>(mapInstance.getBounds());

    useEffect(() => {
        routeStateRef.current = { isRoutingActive };
    }, [isRoutingActive]);

    const { assignedManzanaIds, assignedSectionIds } = useMemo(() => {
        const manzanas = new Set<number>();
        const sections = new Set<number>();
        
        tareas.forEach(t => {
            if (['manzana', 'manzanas'].includes(t.tipo_capa)) {
                manzanas.add(Number(t.polygon_id));
            } else if (['padron', 'seccion', 'secciones', 'Sección'].includes(t.tipo_capa)) {
                sections.add(Number(t.polygon_id));
            }
        });
        return { assignedManzanaIds: manzanas, assignedSectionIds: sections };
    }, [tareas]);

    const filteredGeoJSON = useMemo(() => {
        if (!manzanasGeojson) return null;

        const isMunicipioMode = mapZonaTipo === 'municipio';
        const zonaValue = isMunicipioMode ? selectedMunicipio : selectedDistrito;

        // Al cargar la aplicación, no mostrar automáticamente todas las manzanas
        if (zonaValue === null) {
            return {
                ...manzanasGeojson,
                features: []
            };
        }

        let features = manzanasGeojson.features;

        const isTodos = isMunicipioMode ? zonaValue === 'ALL' : zonaValue === 0;
        if (!isTodos) {
            const allowedSections = isMunicipioMode
                ? (SECCIONES_POR_MUNICIPIO[zonaValue as string] || [])
                : (SECCIONES_POR_DISTRITO[zonaValue as number] || []);
            features = features.filter((f: any) =>
                allowedSections.includes(Number(f.properties.SECCION))
            );
        }

        // Filtrar por asignación si no es admin
        if (!isAdmin) {
            features = features.filter((f: any) => {
                const featureManzanaId = Number(f.properties.ID);
                const featureSectionId = Number(f.properties.SECCION);
                return assignedManzanaIds.has(featureManzanaId) || assignedSectionIds.has(featureSectionId);
            });
        }

        return {
            ...manzanasGeojson,
            features
        };
    }, [manzanasGeojson, selectedDistrito, selectedMunicipio, mapZonaTipo, isAdmin, assignedManzanaIds, assignedSectionIds]);

    // Auto-zoom autónomo para manzanas (Prioridad sobre secciones)
    useEffect(() => {
        if (!isAdmin && filteredGeoJSON && filteredGeoJSON.features.length > 0) {
            // Verificamos si hay alguna manzana asignada directamente para darle prioridad de zoom
            const hasDirectManzana = tareas.some(t => t.tipo_capa === 'manzana');
            
            if (hasDirectManzana) {
                debugLog('NearManzanasLayer: Ejecutando fitBounds prioritario para manzanas...');
                try {
                    const layer = L.geoJSON(filteredGeoJSON);
                    const bounds = layer.getBounds();
                    if (bounds.isValid()) {
                        mapInstance.flyToBounds(bounds, { padding: [100, 100], duration: 1.5 });
                    }
                } catch (err) {
                    debugError('Error en fitBounds de NearManzanasLayer:', err);
                }
            }
        }
    }, [filteredGeoJSON, isAdmin, mapInstance, tareas]);

    // Todas las manzanas con rank_near === 1 en el conjunto visible
    const rank1Features = useMemo(() => {
        if (!filteredGeoJSON) return [];
        return filteredGeoJSON.features.filter(
            (f: any) => f.properties.rank_near === 1 || f.properties.rank === 1
        );
    }, [filteredGeoJSON]);

    // Centroide de cada manzana rank 1
    const rank1Centroids = useMemo(() => {
        const result: { pos: [number, number]; id: number }[] = [];
        rank1Features.forEach((f: any) => {
            try {
                const bounds = L.geoJSON(f).getBounds();
                if (bounds.isValid()) {
                    const c = bounds.getCenter();
                    result.push({ pos: [c.lat, c.lng] as [number, number], id: f.properties.ID ?? Math.random() });
                }
            } catch { /* skip geometría inválida */ }
        });
        return result;
    }, [rank1Features]);

    // Icono SVG personalizado: globito azul en forma de pin de ubicación
    const rank1Icon = useMemo(() => L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38" width="28" height="38">
            <defs>
                <filter id="pin-shadow" x="-40%" y="-20%" width="180%" height="180%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#00000050"/>
                </filter>
                <radialGradient id="pin-grad" cx="38%" cy="32%" r="60%">
                    <stop offset="0%" stop-color="#60a5fa"/>
                    <stop offset="100%" stop-color="#1d4ed8"/>
                </radialGradient>
            </defs>
            <path d="M14 0 C6.268 0 0 6.268 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.268 21.732 0 14 0 Z"
                fill="url(#pin-grad)" stroke="#1e3a8a" stroke-width="1.5" filter="url(#pin-shadow)"/>
            <ellipse cx="9" cy="8" rx="4.5" ry="3" fill="white" opacity="0.28"/>
            <circle cx="14" cy="14" r="5.5" fill="white" opacity="0.92"/>
            <circle cx="14" cy="14" r="2.8" fill="#2563eb"/>
        </svg>`,
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -40]
    }), []);

    const style = (feature: any) => {
        const featureId = Number(feature.properties.ID);
        const featureSectionId = Number(feature.properties.SECCION);
        
        const isAssigned = assignedManzanaIds.has(featureId) || assignedSectionIds.has(featureSectionId);
        
        // Determinar si esta manzana está seleccionada actualmente
        const isSelected = selectedPoligono && (
            (Number(selectedPoligono.id) === featureId) ||
            (selectedPoligono.tipo.includes('Manzana') && Number(selectedPoligono.metadata?.id) === featureId)
        );

        const rank = feature.properties.rank_near || 0;
        
        // Paleta optimizada: Rango 1 es el protagonista (Rojo)
        const colors = [
            '#dc2626', // 1 - Rojo Vibrante (Protagonista)
            '#f97316', // 2 - Naranja
            '#eab308', // 3 - Amarillo Post-it
            '#84cc16', // 4 - Lima
            '#10b981'  // 5 - Esmeralda
        ];
        
        // Si ya tiene tarea, usamos el color de la aplicación (Guinda/Maroon) para diferenciar
        const color = isAssigned ? '#8C3154' : (colors[rank - 1] || '#a8a29e');

        if (isSelected) {
            return {
                fillColor: color,
                weight: 6,
                opacity: 1,
                color: '#06b6d4', // Cyan para selección
                fillOpacity: 0.8,
                zIndex: 3000
            };
        }

        const isRank1 = rank === 1;

        return {
            fillColor: color,
            weight: isRank1 ? 4 : (isAssigned ? 3 : 1),
            opacity: 1,
            color: isRank1 ? '#ffffff' : (isAssigned ? '#620041' : 'white'),
            fillOpacity: isRank1 ? 0.9 : (isAssigned ? 0.7 : 0.5),
            dashArray: isAssigned ? '5, 5' : '0', // Tareas asignadas con borde punteado si se solapan
            zIndex: isRank1 ? 2000 : (isAssigned ? 1500 : 1)
        };
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({
            click: (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                if (routeStateRef.current.isRoutingActive) {
                    handleMapSelection({ lat: e.latlng.lat, lng: e.latlng.lng });
                } else {
                    if (feature.properties) {
                        const { ID, MANZANA, SECCION, MUNICIPIO, LOCALIDAD, ENTIDAD, DISTRITO_F, CONTROL, STATUS, rank_near, dist_m } = feature.properties;
                        
                        const syntheticPoligono = {
                            id: ID || Math.random(),
                            nombre: `Manzana ${MANZANA}`,
                            municipio: MUNICIPIO?.toString() || 'N/A', 
                            tipo: 'Manzana (Cercana)',
                            metadata: {
                                seccion: SECCION,
                                manzana: MANZANA,
                                localidad: LOCALIDAD,
                                entidad: ENTIDAD,
                                municipio: MUNICIPIO,
                                distrito_f: DISTRITO_F,
                                control: CONTROL,
                                status: STATUS,
                                rank_near: rank_near,
                                dist_m: dist_m !== undefined ? Math.round(dist_m) : undefined,
                                isNearManzana: true
                            },
                            geom: feature.geometry
                        };
                        
                        setSelectedPoligono(syntheticPoligono);
                    }
                }
            }
        });
        
        if (feature.properties && feature.properties.MANZANA) {
            layer.bindTooltip(`Manzana: ${feature.properties.MANZANA}<br>Rank: ${feature.properties.rank_near}`, { 
                sticky: true,
                opacity: 0.8
            });
        }
    };

    // Filtro de visibilidad por Zoom: Solo visible en zoom 11 o superior para ADMIN
    // Pero SIEMPRE visible para Field Worker si es su manzana asignada
    if (isAdmin && zoomLevel < 11) return null;
    if (!filteredGeoJSON || filteredGeoJSON.features.length === 0) return null;

    return (
        <>
            <GeoJSON
                key={`near-manzanas-layer-${mapZonaTipo}-${(mapZonaTipo === 'municipio' ? selectedMunicipio : selectedDistrito) || 'none'}-${tasksUpdateKey}-${isRoutingActive}-${isAdmin}-${selectedPoligono?.id || 'none'}`}
                data={filteredGeoJSON}
                onEachFeature={onEachFeature}
                style={style}
            />
            {showRank1Pins && zoomLevel >= 13 && rank1Centroids.map(({ pos, id }) => (
                <Marker key={`rank1-pin-${id}`} position={pos} icon={rank1Icon}>
                    <Tooltip direction="top" offset={[0, -40]} permanent={false} opacity={0.92}>
                        <span style={{ fontWeight: 700, fontSize: 12 }}>
                            📍 Manzana Prioritaria · Rank 1
                        </span>
                    </Tooltip>
                </Marker>
            ))}
        </>
    );
});

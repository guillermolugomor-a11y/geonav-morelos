import React, { useEffect, useState, useMemo, useRef } from 'react';
import { GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { isAdminUser } from '../../constants/roles';
import { debugError, debugLog } from '../../utils/debug';

interface NearManzanasLayerProps {
    tareas: any[];
    tasksUpdateKey?: number;
    handleMapSelection: (latlng: { lat: number; lng: number }) => void;
    isRoutingActive: boolean;
}

export const NearManzanasLayer: React.FC<NearManzanasLayerProps> = React.memo(({
    tareas,
    tasksUpdateKey = 0,
    handleMapSelection,
    isRoutingActive
}) => {
    const { perfil, selectedPoligono, setSelectedPoligono } = useStore();
    const isAdmin = isAdminUser(perfil);

    const [geojsonData, setGeojsonData] = useState<any>(null);
    const routeStateRef = useRef({ isRoutingActive });

    const map = useMapEvents({
        zoomend: () => {
            setZoomLevel(map.getZoom());
        }
    });
    const [zoomLevel, setZoomLevel] = useState<number>(map.getZoom());

    useEffect(() => {
        routeStateRef.current = { isRoutingActive };
    }, [isRoutingActive]);

    useEffect(() => {
        fetch('/manzanas_5_mas_cercanas_full.geojson')
            .then(res => res.json())
            .then(data => {
                setGeojsonData(data);
            })
            .catch(err => console.error('Error cargando manzanas cercanas:', err));
    }, []);

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
        if (!geojsonData) return null;

        if (isAdmin) return geojsonData;

        const filtered = {
            ...geojsonData,
            features: geojsonData.features.filter((f: any) => {
                const featureManzanaId = Number(f.properties.ID);
                const featureSectionId = Number(f.properties.SECCION);
                return assignedManzanaIds.has(featureManzanaId) || assignedSectionIds.has(featureSectionId);
            })
        };

        return filtered;
    }, [geojsonData, isAdmin, assignedManzanaIds, assignedSectionIds]);

    // Auto-zoom autónomo para manzanas (Prioridad sobre secciones)
    const mapInstance = useMapEvents({});
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
                                status: STATUS, // 1=Urbana, 0=Dispersa
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

    // Filtro de visibilidad por Zoom: Solo visible en zoom 11 o superior para ADMIN
    // Pero SIEMPRE visible para Field Worker si es su manzana asignada
    if (isAdmin && zoomLevel < 11) return null;
    if (!geojsonData) return null;

    return (
        <GeoJSON 
            key={`near-manzanas-layer-${tasksUpdateKey}-${isRoutingActive}-${isAdmin}-${selectedPoligono?.id || 'none'}`}
            data={filteredGeoJSON} 
            onEachFeature={onEachFeature}
            style={style}
        />
    );
});

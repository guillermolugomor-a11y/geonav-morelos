import React, { useEffect, useState, useMemo, useRef } from 'react';
import { GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { isAdminUser } from '../../constants/roles';

interface PadronLayerProps {
    tareas: any[];
    tasksUpdateKey?: number;
    handleMapSelection: (latlng: { lat: number; lng: number }) => void;
    isRoutingActive: boolean;
    manzanasPadron?: any[];
}

export const PadronLayer: React.FC<PadronLayerProps> = React.memo(({
    tareas,
    tasksUpdateKey = 0,
    handleMapSelection,
    isRoutingActive,
    manzanasPadron = []
}) => {
    const { perfil, selectedPoligono, setSelectedPoligono } = useStore();
    const isAdmin = isAdminUser(perfil);

    const [geojsonData, setGeojsonData] = useState<any>(null);
    const routeStateRef = useRef({ isRoutingActive });

    // Lógica de Visibilidad por Zoom
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
        fetch('/secciones_padron_optimizado.geojson')
            .then(res => res.json())
            .then(data => {
                setGeojsonData(data);
            })
            .catch(err => console.error('Error cargando padrón:', err));
    }, []);

    const { assignedSectionIds, assignedManzanaIds } = useMemo(() => {
        const sections = new Set<number>();
        const manzanas = new Set<number>();
        
        tareas.forEach(t => {
            if (['padron', 'seccion', 'secciones', 'Sección'].includes(t.tipo_capa)) {
                sections.add(Number(t.polygon_id));
            } else if (['manzana', 'manzanas'].includes(t.tipo_capa)) {
                manzanas.add(Number(t.polygon_id));
                // También marcar la sección a la que pertenece la manzana
                const mzInfo = manzanasPadron.find(m => Number(m.id) === Number(t.polygon_id));
                if (mzInfo && mzInfo.seccion) {
                    sections.add(Number(mzInfo.seccion));
                }
            }
        });
        return { assignedSectionIds: sections, assignedManzanaIds: manzanas };
    }, [tareas, manzanasPadron]);

    const filteredGeoJSON = useMemo(() => {
        if (!geojsonData) return null;

        // 1. Caso Admin: mostrar todo el GeoJSON
        if (isAdmin) return geojsonData;

        // 2. Caso Field Worker: filtrar usando el Set pre-calculado
        const filtered = {
            ...geojsonData,
            features: geojsonData.features.filter((f: any) => 
                assignedSectionIds.has(Number(f.properties.SECCION))
            )
        };

        return filtered;
    }, [geojsonData, isAdmin, assignedSectionIds]);

    // Auto-zoom autónomo basado en geometría real cargada
    const mapInstance = useMapEvents({});
    useEffect(() => {
        if (!isAdmin && filteredGeoJSON && filteredGeoJSON.features.length > 0) {
            console.log('PadronLayer: Ejecutando fitBounds autónomo...');
            try {
                const layer = L.geoJSON(filteredGeoJSON);
                const bounds = layer.getBounds();
                if (bounds.isValid()) {
                    mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
                }
            } catch (err) {
                console.error('Error en fitBounds autónomo de PadronLayer:', err);
            }
        }
    }, [filteredGeoJSON, isAdmin, mapInstance]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({
            click: (e: L.LeafletMouseEvent) => {
                L.DomEvent.stopPropagation(e);
                if (routeStateRef.current.isRoutingActive) {
                    handleMapSelection({ lat: e.latlng.lat, lng: e.latlng.lng });
                } else {
                    // Notificar selección al Dashboard para abrir el panel lateral
                    if (feature.properties) {
                        const { SECCION, total, hombres, mujeres, fecha_actualizacion } = feature.properties;
                        
                        // Creamos un objeto que simule la interfaz Poligono para que sea compatible con el Sidebar
                        const syntheticPoligono = {
                            id: Number(SECCION),
                            nombre: `Sección ${SECCION}`,
                            municipio: 'Morelos', 
                            tipo: 'Sección Electoral',
                            metadata: {
                                seccion: Number(SECCION),
                                total: total,
                                hombres: hombres,
                                mujeres: mujeres,
                                fecha_actualizacion: fecha_actualizacion,
                                padron: true // Flag para identificar que es del padrón
                            },
                            geom: feature.geometry
                        };
                        
                        setSelectedPoligono(syntheticPoligono);
                    }
                }
            }
        });
    };

    const style = (feature: any) => {
        const featureSectionId = Number(feature.properties.SECCION);
        const isAssigned = assignedSectionIds.has(featureSectionId);
        
        // Determinar si esta sección está seleccionada actualmente (por búsqueda o clic)
        const isSelected = selectedPoligono && (
            (selectedPoligono.tipo.includes('Sección') && Number(selectedPoligono.metadata?.seccion) === featureSectionId) ||
            (selectedPoligono.tipo.includes('Manzana') && Number(selectedPoligono.metadata?.seccion) === featureSectionId)
        );

        if (isSelected) {
            return {
                fillColor: isAssigned ? '#ef4444' : '#8C3154',
                weight: 6,
                opacity: 1,
                color: '#06b6d4', // Cyan vibrante para resaltar la búsqueda
                fillOpacity: isAssigned ? 0.3 : 0.15,
                zIndex: 2000
            };
        }

        return {
            fillColor: isAssigned ? '#ef4444' : '#8C3154',
            weight: isAssigned ? 4 : (zoomLevel >= 14 ? 3 : (zoomLevel >= 13 ? 2 : 1)),
            opacity: 1,
            color: isAssigned ? '#b91c1c' : '#7a2a49', 
            fillOpacity: isAssigned ? 0.25 : (zoomLevel >= 13 ? 0.1 : 0.05),
            dashArray: isAssigned ? '' : '0'
        };
    };

    // Filtro de visibilidad por Zoom: Solo visible en zoom 12 o superior para ADMIN
    // Pero SIEMPRE visible para Field Worker si es su área asignada
    if (isAdmin && zoomLevel < 12) return null;

    if (!geojsonData || !filteredGeoJSON || filteredGeoJSON.features.length === 0) return null;

    return (
        <GeoJSON 
            key={`padron-layer-${tasksUpdateKey}-${isRoutingActive}-${isAdmin}`}
            data={filteredGeoJSON} 
            onEachFeature={onEachFeature}
            style={style}
        />
    );
});

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { GeoJSON, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { debugLog } from '../../utils/debug';
import { useStore } from '../../store/useStore';
import { isAdminUser } from '../../constants/roles';
import { SECCIONES_POR_DISTRITO } from '../../constants/seccionesDistritos';
import { SECCIONES_POR_MUNICIPIO } from '../../constants/seccionesMunicipios';
import { TEAM_HEX_COLORS } from '../../utils/teamColors';

interface PadronLayerProps {
    tareas: any[];
    tasksUpdateKey?: number;
    handleMapSelection: (latlng: { lat: number; lng: number }) => void;
    isRoutingActive: boolean;
    manzanasPadron?: any[];
    padronGeojson?: any;
}

export const PadronLayer: React.FC<PadronLayerProps> = React.memo(({
    tareas,
    tasksUpdateKey = 0,
    handleMapSelection,
    isRoutingActive,
    manzanasPadron = [],
    padronGeojson
}) => {
    const { perfil, selectedPoligono, setSelectedPoligono, usuarios } = useStore();
    const selectedDistrito = useStore(s => s.selectedDistrito);
    const selectedMunicipio = useStore(s => s.selectedMunicipio);
    const mapZonaTipo = useStore(s => s.mapZonaTipo);
    const mapTeamFilter = useStore(s => s.mapTeamFilter);
    const isAdmin = isAdminUser(perfil);

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

    // Map userId → hex color: sorted field users get a stable color index (Equipo 1 = index 0, etc.)
    const userColorMap = useMemo(() => {
        const map = new Map<string, string>();
        usuarios
            .filter(u => u.rol !== 'admin')
            .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))
            .forEach((u, idx) => {
                map.set(u.id, TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length]);
            });
        return map;
    }, [usuarios]);

    // Map sectionId → userId: first assigned team wins (handles duplicates)
    const { assignedSectionIds, sectionToUserMap } = useMemo(() => {
        const sections = new Set<number>();
        const sToU = new Map<number, string>();

        tareas.forEach(t => {
            if (['padron', 'seccion', 'secciones', 'Sección'].includes(t.tipo_capa)) {
                const sid = Number(t.polygon_id);
                sections.add(sid);
                if (!sToU.has(sid)) sToU.set(sid, t.user_id);
            } else if (['manzana', 'manzanas'].includes(t.tipo_capa)) {
                const mzInfo = manzanasPadron.find(m => Number(m.id) === Number(t.polygon_id));
                if (mzInfo && mzInfo.seccion) {
                    const sid = Number(mzInfo.seccion);
                    sections.add(sid);
                    if (!sToU.has(sid)) sToU.set(sid, t.user_id);
                }
            }
        });
        return { assignedSectionIds: sections, sectionToUserMap: sToU };
    }, [tareas, manzanasPadron]);

    const filteredGeoJSON = useMemo(() => {
        if (!padronGeojson) return null;

        const isMunicipioMode = mapZonaTipo === 'municipio';
        const zonaValue = isMunicipioMode ? selectedMunicipio : selectedDistrito;

        if (zonaValue === null) {
            return { ...padronGeojson, features: [] };
        }

        let features = padronGeojson.features;

        const isTodos = isMunicipioMode ? zonaValue === 'ALL' : zonaValue === 0;
        if (!isTodos) {
            const allowedSections = isMunicipioMode
                ? (SECCIONES_POR_MUNICIPIO[zonaValue as string] || [])
                : (SECCIONES_POR_DISTRITO[zonaValue as number] || []);
            features = features.filter((f: any) =>
                allowedSections.includes(Number(f.properties.SECCION))
            );
        }

        if (!isAdmin) {
            features = features.filter((f: any) =>
                assignedSectionIds.has(Number(f.properties.SECCION))
            );
        }

        // When a team filter is active, show only that team's sections
        if (isAdmin && mapTeamFilter) {
            features = features.filter((f: any) =>
                sectionToUserMap.get(Number(f.properties.SECCION)) === mapTeamFilter
            );
        }

        return { ...padronGeojson, features };
    }, [padronGeojson, selectedDistrito, selectedMunicipio, mapZonaTipo, isAdmin, assignedSectionIds, mapTeamFilter, sectionToUserMap]);

    useEffect(() => {
        if (!isAdmin && filteredGeoJSON && filteredGeoJSON.features.length > 0) {
            debugLog('PadronLayer: Ejecutando fitBounds autónomo...');
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
                    if (feature.properties) {
                        const { SECCION, total, hombres, mujeres, fecha_actualizacion } = feature.properties;
                        const syntheticPoligono = {
                            id: Number(SECCION),
                            nombre: `Sección ${SECCION}`,
                            municipio: 'Morelos',
                            tipo: 'Sección Electoral',
                            metadata: {
                                seccion: Number(SECCION),
                                total,
                                hombres,
                                mujeres,
                                fecha_actualizacion,
                                padron: true
                            },
                            geom: feature.geometry
                        };
                        setSelectedPoligono(syntheticPoligono);
                    }
                }
            }
        });
    };

    const style = (feature: any): L.PathOptions => {
        const seccionId = Number(feature.properties.SECCION);
        const assignedUserId = sectionToUserMap.get(seccionId);
        const isAssigned = !!assignedUserId;
        const teamColor = assignedUserId ? (userColorMap.get(assignedUserId) ?? '#6366f1') : null;
        const baseWeight = zoomLevel >= 14 ? 1.5 : zoomLevel >= 13 ? 1 : 0.8;

        const isSelected = !!selectedPoligono && (
            (selectedPoligono.tipo.includes('Sección') && Number(selectedPoligono.metadata?.seccion) === seccionId) ||
            (selectedPoligono.tipo.includes('Manzana') && Number(selectedPoligono.metadata?.seccion) === seccionId)
        );

        // ── Prioridad 1: Sección seleccionada — borde cyan, siempre encima ──
        if (isSelected) {
            return {
                fillColor: teamColor ?? '#8C3154',
                weight: 5,
                opacity: 1,
                color: '#06b6d4',
                fillOpacity: isAssigned ? 0.55 : 0.35,
            };
        }

        // ── Prioridad 2: Filtro de equipo activo ──
        // (solo llegan features de ese equipo; el filtro de features ya excluyó el resto)
        if (mapTeamFilter && isAdmin) {
            const activeColor = userColorMap.get(mapTeamFilter) ?? '#3b82f6';
            return {
                fillColor: activeColor,
                weight: 2.5,
                opacity: 1,
                color: activeColor,
                fillOpacity: 0.7,
            };
        }

        // ── Prioridad 3: Modo "todos los equipos" (sin filtro activo) ──

        if (isAssigned && isAdmin) {
            // 3a) Sección asignada — color de equipo (admin)
            return {
                fillColor: teamColor!,
                weight: zoomLevel >= 14 ? 2.5 : zoomLevel >= 13 ? 2 : 1.5,
                opacity: 1,
                color: teamColor!,
                fillOpacity: selectedPoligono ? 0.2 : 0.55,
            };
        }

        if (isAssigned && !isAdmin) {
            // 3b) Sección asignada — vista de campo (equipo del usuario)
            return {
                fillColor: '#ef4444',
                weight: 3,
                opacity: 1,
                color: '#b91c1c',
                fillOpacity: 0.35,
            };
        }

        // 3c) Sección libre / sin asignar — color uva original, claramente distinguible
        return {
            fillColor: '#8C3154',
            weight: baseWeight,
            opacity: 0.85,
            color: '#7a2a49',
            fillOpacity: selectedPoligono ? 0.1 : 0.32,
        };
    };

    if (isAdmin && !padronGeojson) return null;
    if (!padronGeojson || !filteredGeoJSON || filteredGeoJSON.features.length === 0) return null;

    return (
        <GeoJSON
            key={`padron-layer-${mapZonaTipo}-${(mapZonaTipo === 'municipio' ? selectedMunicipio : selectedDistrito) || 'none'}-${tasksUpdateKey}-${isRoutingActive}-${isAdmin}-${selectedPoligono?.id || 'none'}-${mapTeamFilter ?? 'all'}`}
            data={filteredGeoJSON}
            onEachFeature={onEachFeature}
            style={style}
        />
    );
});

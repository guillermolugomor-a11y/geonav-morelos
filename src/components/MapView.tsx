import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Poligono } from '../types';
import { poligonosService } from '../services/poligonosService';
import { taskService } from '../services/taskService';
import { supabase } from '../lib/supabaseClient';
import { Info } from 'lucide-react';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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

interface MapViewProps {
  onPoligonoSelect: (poligono: Poligono | null) => void;
  isAdmin?: boolean;
  userId?: string;
}

const MapController: React.FC<{ 
  poligonos: Poligono[], 
  onPoligonoSelect: (p: Poligono | null) => void,
  onSearchMatch: (ids: number[]) => void,
  onZoomChange: (isHigh: boolean) => void
}> = ({ poligonos, onPoligonoSelect, onSearchMatch, onZoomChange }) => {
  const map = useMap();

  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom() >= 16);
    };
    
    handleZoom();
    map.on('zoomend', handleZoom);
    
    const handleSearch = (e: any) => {
      const query = e.detail;
      if (!query) {
        onSearchMatch([]);
        return;
      }

      let encontrado;
      const cleanQuery = query.toString().trim();
      let matchedIds: number[] = [];
      
      if (cleanQuery.includes('-')) {
        const [sec, manz] = cleanQuery.split('-');
        encontrado = poligonos.find(p => 
          p.tipo === 'Manzana' &&
          p.metadata?.seccion?.toString() === sec.trim() && 
          p.metadata?.manzana?.toString() === manz.trim()
        );
        if (encontrado) matchedIds = [encontrado.id];
      } else {
        // Primero intentar buscar el polígono de tipo Sección
        encontrado = poligonos.find(p => 
          p.tipo === 'Sección' &&
          p.metadata?.seccion?.toString() === cleanQuery
        );

        if (encontrado) {
          matchedIds = [encontrado.id];
        } else {
          // Si no hay polígono de tipo Sección, buscar todas las Manzanas de esa sección
          const manzanasDeSeccion = poligonos.filter(p => 
            p.tipo === 'Manzana' &&
            p.metadata?.seccion?.toString() === cleanQuery
          );
          
          if (manzanasDeSeccion.length > 0) {
            encontrado = manzanasDeSeccion[0];
            matchedIds = manzanasDeSeccion.map(m => m.id);
          }
        }
      }

      onSearchMatch(matchedIds);

      if (encontrado) {
        onPoligonoSelect(encontrado);
        
        // Si es una búsqueda de sección pero solo encontramos manzanas, 
        // podríamos querer hacer zoom a todas las manzanas de esa sección
        if (!cleanQuery.includes('-') && matchedIds.length > 1) {
          const manzanasDeSeccion = poligonos.filter(p => matchedIds.includes(p.id));
          
          if (manzanasDeSeccion.length > 0) {
            const featureGroup = L.featureGroup(
              manzanasDeSeccion.map(m => L.geoJSON(m.geom))
            );
            map.flyToBounds(featureGroup.getBounds(), { padding: [50, 50], duration: 1.5 });
            return;
          }
        }

        const bounds = L.geoJSON(encontrado.geom).getBounds();
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
      }
    };

    const handleLocate = () => {
      map.locate({ setView: true, maxZoom: 16 });
      map.once('locationfound', (e) => {
        // Limpiar marcadores previos de ubicación si existen
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer.getPopup()?.getContent() === "Estás aquí") {
            map.removeLayer(layer);
          }
        });

        L.marker(e.latlng).addTo(map)
          .bindPopup("Estás aquí")
          .openPopup();
      });
    };

    const handleFocusPoligono = (e: any) => {
      const poligono = e.detail;
      if (poligono && poligono.geom) {
        const bounds = L.geoJSON(poligono.geom).getBounds();
        map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        
        // Find the layer and highlight it
        map.eachLayer((layer: any) => {
          if (layer.feature && layer.feature.properties && layer.feature.properties.id === poligono.id) {
            if (typeof layer.setStyle === 'function') {
              // Reset other layers
              map.eachLayer((l: any) => {
                if (l.feature && typeof l.setStyle === 'function') {
                  // We can't easily reset to original style without knowing it, 
                  // but the map will re-render or we can just highlight the selected one
                }
              });
              
              layer.setStyle({
                weight: 5,
                color: '#4f46e5', // Indigo 600
                dashArray: '',
                fillOpacity: 0.7
              });
              
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                layer.bringToFront();
              }
            }
          }
        });
      }
    };

    const handleResetZoom = () => {
      if (poligonos.length > 0) {
        const featureGroup = L.featureGroup(
          poligonos.map(p => L.geoJSON(p.geom))
        );
        map.flyToBounds(featureGroup.getBounds(), { padding: [50, 50], duration: 1.5 });
      } else {
        map.setView([18.9261, -99.2307], 13);
      }
    };

    window.addEventListener('search-section', handleSearch);
    window.addEventListener('locate-user', handleLocate);
    window.addEventListener('focus-poligono', handleFocusPoligono);
    window.addEventListener('reset-zoom', handleResetZoom);
    return () => {
      map.off('zoomend', handleZoom);
      window.removeEventListener('search-section', handleSearch);
      window.removeEventListener('locate-user', handleLocate);
      window.removeEventListener('focus-poligono', handleFocusPoligono);
      window.removeEventListener('reset-zoom', handleResetZoom);
    };
  }, [poligonos, map, onPoligonoSelect, onSearchMatch, onZoomChange]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ onPoligonoSelect, isAdmin, userId }) => {
  const [poligonos, setPoligonos] = useState<Poligono[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchedPoligonoIds, setSearchedPoligonoIds] = useState<number[]>([]);
  const [isHighZoom, setIsHighZoom] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({
    secciones: true,
    manzanas: true,
    manzanasCompletas: false
  });

  const [tasksUpdateKey, setTasksUpdateKey] = useState(0);

  const loadTasks = useCallback(async () => {
    let tasksData: any[] = [];
    if (isAdmin) {
      const response = await taskService.getAllTareas();
      tasksData = response.data;
    } else if (userId) {
      tasksData = await taskService.getTareas(userId);
    }
    setTareas(tasksData);
    setTasksUpdateKey(prev => prev + 1);
  }, [isAdmin, userId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await poligonosService.getPoligonos();
        console.log(`Datos recibidos: ${data.length} polígonos`);
        
        await loadTasks();
        
        if (data.length === 0) {
          // Intentamos verificar si hay un error de permisos o conexión
          const { error: testError } = await supabase.from('poligonos_geojson').select('id').limit(1);
          if (testError) {
            setError(testError.message);
          } else {
            console.warn('No se recibieron polígonos de la base de datos.');
          }
        }

        const parsedData = data.map(p => ({
          ...p,
          geom: typeof p.geom === 'string' ? JSON.parse(p.geom) : p.geom
        }));
        setPoligonos(parsedData);
      } catch (err: any) {
        console.error('Error procesando polígonos:', err);
        setError(err.message || 'Error desconocido al cargar polígonos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [loadTasks]);

  useEffect(() => {
    window.addEventListener('refresh-map-tasks', loadTasks);
    return () => window.removeEventListener('refresh-map-tasks', loadTasks);
  }, [loadTasks]);

  const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
    layer.on({
      click: (e) => {
        L.DomEvent.stopPropagation(e);
        const props = feature.properties;
        onPoligonoSelect(props);
        
        const l = e.target as L.Path;
        l.setStyle({
          fillOpacity: props.tipo === 'Sección' ? 0.1 : 0.8,
          weight: 4,
          color: props.tipo === 'Sección' ? '#1e293b' : '#059669'
        });
      },
      mouseover: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: feature.properties.tipo === 'Sección' ? 0.05 : 0.5 });
      },
      mouseout: (e) => {
        const l = e.target as L.Path;
        l.setStyle({ fillOpacity: feature.properties.tipo === 'Sección' ? 0 : 0.2 });
      }
    });
  }, [onPoligonoSelect]);

  const getStyle = useCallback((p: any) => {
    const isAssigned = tareas.some(t => t.polygon_id === p.id && t.status !== 'completada');
    const isSearched = searchedPoligonoIds.includes(p.id);
    
    if (p.tipo === 'Sección') {
      return {
        fillColor: isSearched ? '#3b82f6' : (isAssigned ? '#ef4444' : 'transparent'), // Blue if searched, Red if assigned
        weight: isSearched ? 4 : 3,
        opacity: 0.8,
        color: isSearched ? '#1d4ed8' : (isAssigned ? '#b91c1c' : '#1e293b'),
        fillOpacity: isSearched ? 0.3 : (isAssigned ? 0.2 : 0),
        interactive: true
      };
    }

    // Determine base color based on zoom level
    let baseColor = '';
    let borderColor = '';
    
    if (isHighZoom) {
      // High zoom: different color per manzana
      baseColor = getManzanaColor(p.id);
      borderColor = '#1e293b'; // Dark border to keep them visible
    } else {
      // Low zoom: uniform color
      baseColor = p.tipo === 'Manzana Completa' ? '#fbbf24' : '#a855f7';
      borderColor = p.tipo === 'Manzana Completa' ? '#d97706' : '#7e22ce';
    }

    return {
      fillColor: isSearched ? '#3b82f6' : (isAssigned ? '#ef4444' : baseColor),
      weight: isSearched ? 2 : 1,
      opacity: 1,
      color: isSearched ? '#1d4ed8' : (isAssigned ? '#b91c1c' : borderColor),
      fillOpacity: isSearched ? 0.8 : (isAssigned ? 0.6 : (isHighZoom ? 0.6 : 0.4)),
      interactive: true
    };
  }, [tareas, searchedPoligonoIds, isHighZoom]);

  const secciones = useMemo(() => poligonos.filter(p => p.tipo === 'Sección'), [poligonos]);
  const manzanas = useMemo(() => poligonos.filter(p => p.tipo === 'Manzana'), [poligonos]);
  const manzanasCompletas = useMemo(() => poligonos.filter(p => p.tipo === 'Manzana Completa'), [poligonos]);

  const seccionesFC = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: secciones.map(p => ({
      type: 'Feature' as const,
      geometry: p.geom,
      properties: p
    }))
  }), [secciones]);

  const manzanasFC = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: manzanas.map(p => ({
      type: 'Feature' as const,
      geometry: p.geom,
      properties: p
    }))
  }), [manzanas]);

  const manzanasCompletasFC = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: manzanasCompletas.map(p => ({
      type: 'Feature' as const,
      geometry: p.geom,
      properties: p
    }))
  }), [manzanasCompletas]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">Cargando cartografía...</p>
        </div>
      </div>
    );
  }

  if (poligonos.length === 0 && !loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-stone-50 p-8">
        <div className="text-center max-w-md">
          <div className="bg-amber-100 text-amber-700 p-4 rounded-2xl mb-4 border border-amber-200">
            <Info size={24} className="mx-auto mb-2" />
            <p className="font-bold">No se encontraron datos</p>
            {error ? (
              <p className="text-sm mt-1 text-red-600 font-mono bg-white/50 p-2 rounded mt-2">
                Error: {error}
              </p>
            ) : (
              <p className="text-sm mt-1">La base de datos no devolvió polígonos. Verifica que las tablas tengan datos y que la vista SQL esté configurada correctamente.</p>
            )}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-stone-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors"
          >
            Reintentar Carga
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[18.92, -99.23]}
        zoom={12}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          poligonos={poligonos} 
          onPoligonoSelect={onPoligonoSelect} 
          onSearchMatch={setSearchedPoligonoIds}
          onZoomChange={setIsHighZoom}
        />

        {visibleLayers.secciones && seccionesFC.features.length > 0 && (
          <LayerGroup>
            <GeoJSON
              key={`layer-secciones-${tasksUpdateKey}-${searchedPoligonoIds.join(',')}-${isHighZoom}`} // Force re-render when tasks or search change to update styles
              data={seccionesFC}
              style={(feature) => getStyle(feature?.properties)}
              onEachFeature={onEachFeature}
            />
          </LayerGroup>
        )}

        {visibleLayers.manzanas && manzanasFC.features.length > 0 && (
          <LayerGroup>
            <GeoJSON
              key={`layer-manzanas-${tasksUpdateKey}-${searchedPoligonoIds.join(',')}-${isHighZoom}`}
              data={manzanasFC}
              style={(feature) => getStyle(feature?.properties)}
              onEachFeature={onEachFeature}
            />
          </LayerGroup>
        )}

        {visibleLayers.manzanasCompletas && manzanasCompletasFC.features.length > 0 && (
          <LayerGroup>
            <GeoJSON
              key={`layer-manzanas-completas-${tasksUpdateKey}-${searchedPoligonoIds.join(',')}-${isHighZoom}`}
              data={manzanasCompletasFC}
              style={(feature) => getStyle(feature?.properties)}
              onEachFeature={onEachFeature}
            />
          </LayerGroup>
        )}
      </MapContainer>

      <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-stone-200 max-w-xs">
        <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
          <Info size={16} className="text-emerald-600" />
          Capas del Mapa
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={visibleLayers.manzanasCompletas}
              onChange={() => setVisibleLayers(prev => ({ ...prev, manzanasCompletas: !prev.manzanasCompletas }))}
              className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 bg-amber-400/40 border-2 border-amber-600 rounded"></div>
              <span className="text-xs text-stone-600 group-hover:text-stone-900 transition-colors">Manzanas Completas</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={visibleLayers.manzanas}
              onChange={() => setVisibleLayers(prev => ({ ...prev, manzanas: !prev.manzanas }))}
              className="w-4 h-4 rounded border-stone-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 bg-purple-500/30 border-2 border-purple-700 rounded"></div>
              <span className="text-xs text-stone-600 group-hover:text-stone-900 transition-colors">Manzanas Capa 1</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={visibleLayers.secciones}
              onChange={() => setVisibleLayers(prev => ({ ...prev, secciones: !prev.secciones }))}
              className="w-4 h-4 rounded border-stone-300 text-slate-800 focus:ring-slate-800 cursor-pointer"
            />
            <div className="flex items-center gap-2 flex-1">
              <div className="w-4 h-4 border-2 border-slate-800 rounded"></div>
              <span className="text-xs text-stone-600 group-hover:text-stone-900 transition-colors">Secciones (Límites)</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

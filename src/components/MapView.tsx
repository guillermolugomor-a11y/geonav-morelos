import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Poligono } from '../types';
import { poligonosService } from '../services/poligonosService';
import { taskService } from '../services/taskService';
import { supabase } from '../lib/supabaseClient';
import { Info, Navigation, X, ExternalLink, Menu } from 'lucide-react';
import { RouteController, LatLng, RouteResult } from './RouteController';
import { RoutingSidebar } from './RoutingSidebar';
import { routeService } from '../services/routeService';
import { PolygonLayer } from './layers/PolygonLayer';
import { ManzanaLayer } from './layers/ManzanaLayer';

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

// MANZANA_COLORS y getManzanaColor fueron extraídos a ManzanaLayer.tsx

interface MapViewProps {
  onPoligonoSelect: (poligono: Poligono | null) => void;
  isAdmin?: boolean;
  userId?: string;
  focusPolygonId?: number | null;
  onFocusHandled?: () => void;
}

const MapController: React.FC<{
  poligonos: Poligono[],
  onPoligonoSelect: (p: Poligono | null) => void,
  onSearchMatch: (ids: number[]) => void,
  onZoomChange: (isHigh: boolean) => void,
  focusPolygon?: Poligono | null,
  onFocusHandled?: () => void,
  handleMapSelection?: (latlng: { lat: number, lng: number }) => void
}> = ({ poligonos, onPoligonoSelect, onSearchMatch, onZoomChange, focusPolygon, onFocusHandled, handleMapSelection }) => {
  const map = useMap();

  useEffect(() => {
    if (!handleMapSelection) return;
    const onMapClick = (e: L.LeafletMouseEvent) => {
      handleMapSelection({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [map, handleMapSelection]);

  // Direct zoom when a polygon is requested from another view (no event needed)
  useEffect(() => {
    if (focusPolygon && focusPolygon.geom) {
      try {
        const bounds = L.geoJSON(focusPolygon.geom).getBounds();
        map.flyToBounds(bounds, { padding: [80, 80], duration: 1.5 });
        onFocusHandled?.();
      } catch (e) {
        console.error('Error en zoom automático:', e);
      }
    }
  }, [focusPolygon, map, onFocusHandled]);

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

    const handleLocateUserOrigin = (e: any) => {
      const latlng = e.detail;
      if (latlng) {
        map.flyTo([latlng.lat, latlng.lng], 16, { duration: 1.5 });
      }
    };

    window.addEventListener('search-section', handleSearch);
    window.addEventListener('locate-user', handleLocate);
    window.addEventListener('locate-user-origin', handleLocateUserOrigin);
    window.addEventListener('focus-poligono', handleFocusPoligono);
    window.addEventListener('reset-zoom', handleResetZoom);
    return () => {
      map.off('zoomend', handleZoom);
      window.removeEventListener('search-section', handleSearch);
      window.removeEventListener('locate-user', handleLocate);
      window.removeEventListener('locate-user-origin', handleLocateUserOrigin);
      window.removeEventListener('focus-poligono', handleFocusPoligono);
      window.removeEventListener('reset-zoom', handleResetZoom);
    };
  }, [poligonos, map, onPoligonoSelect, onSearchMatch, onZoomChange]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ onPoligonoSelect, isAdmin, userId, focusPolygonId, onFocusHandled }) => {
  const [poligonos, setPoligonos] = useState<Poligono[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchedPoligonoIds, setSearchedPoligonoIds] = useState<number[]>([]);
  const [isHighZoom, setIsHighZoom] = useState(false);
  const [focusTarget, setFocusTarget] = useState<Poligono | null>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    secciones: true,
    manzanas: true,
    manzanasCompletas: false
  });

  const [tasksUpdateKey, setTasksUpdateKey] = useState(0);

  // Routing state
  const [routeMode, setRouteMode] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState<LatLng | null>(null);
  const [routeDest, setRouteDest] = useState<LatLng | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'foot'>('driving');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Stale-closure safe references for Leaflet events
  const routeStateRef = useRef({ routeMode, routeOrigin, routeDest });
  useEffect(() => {
    routeStateRef.current = { routeMode, routeOrigin, routeDest };
  }, [routeMode, routeOrigin, routeDest]);

  const handleResetRoute = useCallback(() => {
    setRouteMode(false);
    setRouteOrigin(null);
    setRouteDest(null);
    setRouteResult(null);
  }, []);

  const handleStartRouting = useCallback(() => {
    setRouteMode(true);
    setRouteResult(null);

    // Auto-geolocalizar al usuario como Origen si aún no ha seleccionado ninguno
    if (!routeOrigin && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
          setRouteOrigin(latlng);
          // Notificar al MapController interno para que vuele la cámara a la ubicación
          window.dispatchEvent(new CustomEvent('locate-user-origin', { detail: latlng }));
        },
        (error) => {
          console.warn("Ubicación automática denegada o inaccesible:", error);
        }
      );
    }
  }, [routeOrigin]);

  const handleMapSelection = useCallback((latlng: { lat: number; lng: number }) => {
    const { routeMode: currentRouteMode, routeOrigin: currentOrigin, routeDest: currentDest } = routeStateRef.current;

    if (currentRouteMode) {
      if (!currentOrigin) {
        setRouteOrigin(latlng);
      } else if (!currentDest) {
        setRouteDest(latlng);
      }
    }
  }, []);

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

  // Auto-zoom: dispatch focus event directly once polygon data is ready.
  // MapController is a child of MapContainer (mounted inside MapView) so its 
  // focus-poligono listener is guaranteed to be registered by now.
  // requestAnimationFrame ensures the Leaflet canvas has fully painted before zoom.
  useEffect(() => {
    if (focusPolygonId && poligonos.length > 0 && !loading) {
      const target = poligonos.find(p => p.id === focusPolygonId);
      if (target) {
        onPoligonoSelect(target);
        requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent('focus-poligono', { detail: target }));
          onFocusHandled?.();
        });
      }
    }
  }, [focusPolygonId, poligonos, loading, onPoligonoSelect, onFocusHandled]);

  const secciones = useMemo(() => {
    const rawSecciones = poligonos.filter(p => p.tipo === 'Sección');
    if (isAdmin) return rawSecciones;

    // Para Field Worker: filtrar solo las secciones que tengan tareas asignadas
    const seccionesAsignadas = new Set(
      tareas
        .filter(t => t.tipo_capa === 'secciones' || t.tipo_capa === 'Sección')
        .map(t => t.polygon_id)
    );

    // También incluimos secciones de polígonos tipo Manzana que tengan tareas
    tareas.forEach(t => {
      const p = poligonos.find(poly => poly.id === t.polygon_id);
      if (p && p.metadata?.seccion) {
        // Encontraremos el ID de la sección correspondiente
        const secPoly = rawSecciones.find(s => s.metadata?.seccion === p.metadata.seccion);
        if (secPoly) seccionesAsignadas.add(secPoly.id);
      }
    });

    return rawSecciones.filter(s => seccionesAsignadas.has(s.id));
  }, [poligonos, tareas, isAdmin]);

  const manzanas = useMemo(() => {
    const rawManzanas = poligonos.filter(p => p.tipo === 'Manzana');
    if (isAdmin) return rawManzanas;

    // Para Field Worker: Solo mostrar manzanas que pertenezcan a las secciones que el usuario tiene "prendidas" (asignadas)
    const seccionesAsignadasPermitidas = new Set(secciones.map(s => s.metadata?.seccion));
    return rawManzanas.filter(m => seccionesAsignadasPermitidas.has(m.metadata?.seccion));
  }, [poligonos, secciones, isAdmin]);

  const manzanasCompletas = useMemo(() => {
    const rawManzanasCompletas = poligonos.filter(p => p.tipo === 'Manzana Completa');
    if (isAdmin) return rawManzanasCompletas;

    // Lógica similar: solo manzanas completas de secciones asignadas
    const seccionesAsignadasPermitidas = new Set(secciones.map(s => s.metadata?.seccion));
    return rawManzanasCompletas.filter(m => seccionesAsignadasPermitidas.has(m.metadata?.seccion));
  }, [poligonos, secciones, isAdmin]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8C3154] mx-auto mb-4"></div>
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

  const handleUseMyLocationAsDestination = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
          setRouteDest(latlng);
          if (!routeOrigin) {
            setRouteMode(true);
          }
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
          alert("No se pudo obtener tu ubicación actual.");
        }
      );
    } else {
      alert("Geolocalización no soportada por el navegador.");
    }
  };

  const googleMapsUrlReal = routeService.getGoogleMapsUrl(routeOrigin, routeDest, travelMode);

  return (
    <div className="flex flex-col md:flex-row h-full w-full relative overflow-hidden bg-white">
      {/* Botón flotante para mostrar sidebar en móvil */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-3 rounded-xl shadow-lg border border-stone-200"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      {/* Overlay para móvil */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-[999] transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className={`fixed inset-y-0 left-0 z-[1000] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Botón de cerrar en móvil */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 z-50 bg-stone-100 p-2 rounded-lg text-slate-500 hover:bg-stone-200"
        >
          <X className="w-5 h-5" />
        </button>
        <RoutingSidebar
          isOpen={true}
          isAdmin={isAdmin}
          origin={routeOrigin}
          destination={routeDest}
          onUseMyLocationAsDestination={handleUseMyLocationAsDestination}
          travelMode={travelMode}
          setTravelMode={setTravelMode}
          onVerRuta={handleStartRouting}
          isRoutingActive={routeMode}
          onCancelRouting={handleResetRoute}
          visibleLayers={visibleLayers}
          setVisibleLayers={setVisibleLayers}
        />
      </div>

      <div className="flex-1 h-full w-full relative z-0">
        <MapContainer
          center={[18.92, -99.23]}
          zoom={12}
          className="h-full w-full z-0"
          style={{ cursor: routeMode ? 'crosshair' : 'grab' }}
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
            focusPolygon={focusTarget}
            onFocusHandled={() => { setFocusTarget(null); onFocusHandled?.(); }}
            handleMapSelection={handleMapSelection}
          />

          {/* Route layer controller - disponible para todos los roles */}
          <RouteController
            active={routeMode}
            origin={routeOrigin}
            destination={routeDest}
            travelMode={travelMode}
            onOriginSet={setRouteOrigin}
            onDestinationSet={setRouteDest}
            onRouteResult={setRouteResult}
            onReset={handleResetRoute}
          />

          {visibleLayers.secciones && seccionesFC.features.length > 0 && (
            <LayerGroup>
              <PolygonLayer
                data={seccionesFC}
                tareas={tareas}
                searchedPoligonoIds={searchedPoligonoIds}
                isHighZoom={isHighZoom}
                onPoligonoSelect={onPoligonoSelect}
                handleMapSelection={handleMapSelection}
                isRoutingActive={routeMode}
              />
            </LayerGroup>
          )}

          {visibleLayers.manzanas && manzanasFC.features.length > 0 && (
            <LayerGroup>
              <ManzanaLayer
                layerKeyPrefix="layer-manzanas"
                data={manzanasFC}
                tareas={tareas}
                searchedPoligonoIds={searchedPoligonoIds}
                isHighZoom={isHighZoom}
                onPoligonoSelect={onPoligonoSelect}
                handleMapSelection={handleMapSelection}
                isRoutingActive={routeMode}
              />
            </LayerGroup>
          )}

          {visibleLayers.manzanasCompletas && manzanasCompletasFC.features.length > 0 && (
            <LayerGroup>
              <ManzanaLayer
                layerKeyPrefix="layer-manzanas-completas"
                data={manzanasCompletasFC}
                tareas={tareas}
                searchedPoligonoIds={searchedPoligonoIds}
                isHighZoom={isHighZoom}
                onPoligonoSelect={onPoligonoSelect}
                handleMapSelection={handleMapSelection}
                isRoutingActive={routeMode}
              />
            </LayerGroup>
          )}
        </MapContainer>

        {/* Route Result Card */}
        {routeResult && googleMapsUrlReal && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm border border-[#7C4A36]/30 shadow-2xl rounded-2xl p-4 flex items-center gap-6 text-sm">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Distancia</span>
              <span className="text-lg font-black text-slate-900">
                {(routeResult.distance / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-500">km</span>
              </span>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tiempo est.</span>
              <span className="text-lg font-black text-slate-900">
                {Math.round(routeResult.duration / 60)} <span className="text-xs font-normal text-slate-500">min</span>
              </span>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <a
              href={googleMapsUrlReal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#8C3154] hover:bg-[#7a2a49] text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ir con Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

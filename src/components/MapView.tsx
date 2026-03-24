import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { LayerGroup, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Info, ExternalLink, Menu, MapPin, X } from 'lucide-react';
import { Poligono } from '../types';
import { RouteController } from './RouteController';
import { RoutingSidebar } from './RoutingSidebar';
import { PadronLayer } from './layers/PadronLayer';
import { StateBoundaryLayer } from './layers/StateBoundaryLayer';
import { NearManzanasLayer } from './layers/NearManzanasLayer';
import { SelectionHighlightLayer } from './layers/SelectionHighlightLayer';
import { routeService } from '../services/routeService';
import { useMapData } from '../hooks/useMapData';
import { useRoutePlanner } from '../hooks/useRoutePlanner';
import { useStore } from '../store/useStore';
import { isAdminUser } from '../constants/roles';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { debugError, debugLog } from '../utils/debug';
import { debounce } from '../utils/debounce';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  focusPolygonId?: number | null;
  onFocusHandled?: () => void;
}

interface MapControllerProps {
  poligonos: Poligono[];
  manzanasPadron: any[];
  focusPolygon?: Poligono | null;
  onFocusHandled?: () => void;
  handleMapSelection: (latlng: { lat: number; lng: number }) => void;
}

const MapController: React.FC<MapControllerProps> = ({
  poligonos,
  manzanasPadron,
  focusPolygon,
  onFocusHandled,
  handleMapSelection,
}) => {
  const map = useMap();
  const lastProcessedZoomRef = useRef<number | null>(null);
  const { setSelectedPoligono } = useStore();

  useEffect(() => {
    // Si ya no hay un polígono enfocado, reseteamos la referencia para permitir futuros enfoques
    if (!focusPolygon) {
      lastProcessedZoomRef.current = null;
    }
  }, [focusPolygon]);

  useEffect(() => {
    if (!focusPolygon?.geom) return;
    
    // Evitamos ejecutar el zoom si ya lo procesamos para este ID
    if (lastProcessedZoomRef.current === Number(focusPolygon.id)) {
      debugLog('DEPURACIÓN ZOOM: Zoom ya procesado para ID:', focusPolygon.id, '. Saltando.');
      return;
    }

    try {
      debugLog('DEPURACIÓN ZOOM: Iniciando enfoque contextual para', focusPolygon.nombre);
      lastProcessedZoomRef.current = Number(focusPolygon.id);
      
      let zoomGeom = focusPolygon.geom;
      let zoomPadding = [100, 100]; // Padding más amplio para contexto

      // Si es una manzana, intentamos buscar su sección para el zoom del mapa
      if (focusPolygon.tipo.includes('Manzana') && focusPolygon.metadata?.seccion) {
        const parentSection = poligonos.find(p => 
          p.tipo === 'Sección' && 
          Number(p.metadata?.seccion) === Number(focusPolygon.metadata?.seccion)
        );
        
        if (parentSection?.geom) {
          debugLog('DEPURACIÓN ZOOM: Usando geometría de Sección Padre para contexto:', parentSection.nombre);
          zoomGeom = parentSection.geom;
          zoomPadding = [80, 80]; // Un poco menos de padding para la sección
        }
      }

      const bounds = L.geoJSON(zoomGeom).getBounds();
      map.invalidateSize();

      map.flyToBounds(bounds, { 
        padding: zoomPadding as L.PointExpression, 
        duration: 1.5,
        maxZoom: 18,
        easeLinearity: 0.25 
      });
      
      debugLog('DEPURACIÓN ZOOM: Animación iniciada.');

      const timeout = setTimeout(() => {
        onFocusHandled?.();
      }, 500);
      return () => clearTimeout(timeout);
    } catch (error) {
      console.error('DEPURACIÓN ZOOM: Error al intentar hacer zoom:', error);
    }
  }, [focusPolygon, map, onFocusHandled, poligonos]);


  // Eliminamos lógica de BBox

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const query = (event as CustomEvent<string>).detail;
      if (!query) return;

      const cleanQuery = query.toString().trim();
      debugLog('🔍 MapView: Iniciando búsqueda para:', cleanQuery);

      let foundPolygon: Poligono | undefined;
      let matchedIds: number[] = [];

      if (cleanQuery.includes('-')) {
        // Búsqueda de Manzana (Sección-Manzana)
        const [sectionStr, manzanaStr] = cleanQuery.split('-');
        foundPolygon = poligonos.find(
          (polygon) =>
            polygon.tipo === 'Manzana' &&
            (polygon.metadata?.seccion?.toString() === sectionStr.trim() || polygon.metadata?.SECCION?.toString() === sectionStr.trim()) &&
            (polygon.metadata?.manzana?.toString() === manzanaStr.trim() || polygon.metadata?.MANZANA?.toString() === manzanaStr.trim())
        );

        if (!foundPolygon) {
          // Intentar en manzanasPadron (GeoJSON local)
          const mz = manzanasPadron.find(
            (m) => m.seccion.toString() === sectionStr.trim() && m.manzana.toString() === manzanaStr.trim()
          );
          if (mz && mz.geom) {
            foundPolygon = {
              id: mz.id,
              nombre: `Manzana ${mz.manzana}`,
              tipo: 'Manzana (Padrón)',
              municipio: 'Morelos',
              metadata: { seccion: mz.seccion, manzana: mz.manzana, isNearManzana: true },
              geom: mz.geom
            };
          }
        }
        if (foundPolygon) matchedIds = [foundPolygon.id];
      } else {
        // Búsqueda de Sección
        foundPolygon = poligonos.find((polygon) => {
          if (polygon.tipo !== 'Sección') return false;
          
          const metaSeccion = polygon.metadata?.seccion || polygon.metadata?.SECCION || polygon.id;
          return metaSeccion?.toString() === cleanQuery;
        });

        if (!foundPolygon) {
          // Intentar buscar si hay alguna manzana del padrón en esa sección para al menos mover el mapa ahí
          const mz = manzanasPadron.find((m) => m.seccion.toString() === cleanQuery);
          if (mz && mz.geom) {
             foundPolygon = {
              id: mz.id,
              nombre: `Sección ${mz.seccion} (vía Padrón)`,
              tipo: 'Sección (Referencia)',
              municipio: 'Morelos',
              metadata: { seccion: mz.seccion, isNearManzana: true },
              geom: mz.geom
            };
          }
        }

        if (foundPolygon) {
          matchedIds = [foundPolygon.id];
        } else {
          // Intentar encontrar manzanas del store que pertenezcan a esa sección
          const sectionManzanas = poligonos.filter((polygon) => {
            if (polygon.tipo !== 'Manzana') return false;
            const metaSeccion = polygon.metadata?.seccion || polygon.metadata?.SECCION;
            return metaSeccion?.toString() === cleanQuery;
          });
          
          if (sectionManzanas.length > 0) {
            debugLog(`🔍 MapView: No se halló polígono Sección ${cleanQuery}, pero sí ${sectionManzanas.length} manzanas.`);
            foundPolygon = sectionManzanas[0];
            matchedIds = sectionManzanas.map((polygon) => polygon.id);
          }
        }
      }

      if (!foundPolygon) {
        console.warn('🔍 MapView: No se encontró ningún polígono para:', cleanQuery);
        return;
      }

      debugLog('🔍 MapView: Polígono encontrado:', foundPolygon.nombre, foundPolygon.tipo);
      setSelectedPoligono(foundPolygon);

      try {
        if (!cleanQuery.includes('-') && matchedIds.length > 1) {
          // Si buscamos sección y tenemos múltiples manzanas, hacemos zoom al grupo
          const sectionPolygons = poligonos.filter((polygon) => matchedIds.includes(polygon.id));
          const featureGroup = L.featureGroup(sectionPolygons.map((polygon) => L.geoJSON(polygon.geom)));
          const groupBounds = featureGroup.getBounds();
          if (groupBounds.isValid()) {
            map.flyToBounds(groupBounds, { padding: [50, 50], duration: 1.5 });
            return;
          }
        }

        const bounds = L.geoJSON(foundPolygon.geom).getBounds();
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
      } catch (err) {
        console.error('🔍 MapView: Error al procesar zoom de búsqueda:', err);
      }
    };

    const handleLocate = () => {
      map.locate({ setView: true, maxZoom: 16 });
      map.once('locationfound', (e) => {
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer.getPopup()?.getContent() === 'Estás aquí') {
            map.removeLayer(layer);
          }
        });

        L.marker(e.latlng).addTo(map).bindPopup('Estás aquí').openPopup();
      });
    };

    const handleResetZoom = () => {
      if (poligonos.length > 0) {
        const featureGroup = L.featureGroup(poligonos.map((polygon) => L.geoJSON(polygon.geom)));
        map.flyToBounds(featureGroup.getBounds(), { padding: [40, 40], duration: 1.5 });
      } else {
        map.setView([18.9261, -99.2307], 13);
      }
    };

    const handleLocateUserOrigin = (event: Event) => {
      const latlng = (event as CustomEvent<{ lat: number; lng: number }>).detail;
      if (latlng) {
        map.flyTo([latlng.lat, latlng.lng], 16, { duration: 1.5 });
      }
    };

    // Eliminamos handleFocusPoligono de los eventos ya que ahora se gestiona vía props en MapController


    window.addEventListener('search-section', handleSearch as EventListener);
    window.addEventListener('locate-user', handleLocate);
    window.addEventListener('locate-user-origin', handleLocateUserOrigin as EventListener);
    window.addEventListener('reset-zoom', handleResetZoom);

    return () => {
      window.removeEventListener('search-section', handleSearch as EventListener);
      window.removeEventListener('locate-user', handleLocate);
      window.removeEventListener('locate-user-origin', handleLocateUserOrigin as EventListener);
      window.removeEventListener('reset-zoom', handleResetZoom);
    };
  }, [map, poligonos, manzanasPadron, setSelectedPoligono]);

  // Manejador de clics del mapa separado
  useEffect(() => {
    const onMapClick = (e: L.LeafletMouseEvent) => {
      handleMapSelection({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.on('click', onMapClick);
    return () => map.off('click', onMapClick);
  }, [handleMapSelection, map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({ focusPolygonId, onFocusHandled }) => {
  const user = useStore(s => s.user);
  const perfil = useStore(s => s.perfil);
  const setSelectedPoligono = useStore(s => s.setSelectedPoligono);
  const isAdmin = isAdminUser(perfil);
  const userId = user?.id;

  const [focusTarget, setFocusTarget] = useState<Poligono | null>(null);
  const [visibleLayers, setVisibleLayers] = useState({
    padron: true,
    nearManzanas: true
  });

  const { 
    poligonos, tareas, loading, 
    tasksUpdateKey, manzanasPadron, loadTasks 
  } = useMapData({ isAdmin, userId });

  const storeError = useStore(s => s.error);
  const {
    routeMode,
    routeOrigin,
    routeDest,
    routeResult,
    travelMode,
    isSidebarOpen,
    setRouteResult,
    setTravelMode,
    setIsSidebarOpen,
    setRouteOrigin,
    setRouteDest,
    handleStartRouting,
    handleResetRoute,
    handleMapSelection,
    handleUseMyLocationAsDestination
  } = useRoutePlanner();

  useEffect(() => {
    if (!focusPolygonId || (poligonos.length === 0 && manzanasPadron.length === 0) || loading) return;

    // Buscamos primero en polígonos (secciones usualmente) y luego en manzanas del padrón
    let target = poligonos.find((polygon) => polygon.id === focusPolygonId);
    
    if (!target) {
      // Si no está en polígonos, buscamos en las manzanas del padrón cargadas desde GeoJSON
      const manzana = manzanasPadron.find((m) => Number(m.id) === Number(focusPolygonId));
      if (manzana && manzana.geom) {
        // Creamos un polígono sintético compatible para el Sidebar y el Zoom
        target = {
          id: manzana.id,
          nombre: `Manzana ${manzana.manzana}`,
          tipo: 'Manzana (Padrón)',
          municipio: 'Cuernavaca', // O el municipio correspondiente si estuviera disponible
          metadata: {
            seccion: manzana.seccion,
            manzana: manzana.manzana,
            isNearManzana: true
          },
          geom: manzana.geom
        };
      }
    }

    if (!target) {
      console.warn('DEPURACIÓN ZOOM: No se encontró el polígono/manzana con ID:', focusPolygonId, 'en ninguna colección.');
      return;
    }

    debugLog('DEPURACIÓN ZOOM: Objetivo de zoom detectado:', target.nombre, '| Tipo:', target.tipo);
    setSelectedPoligono(target);
    setFocusTarget(target);
    
    debugLog('DEPURACIÓN ZOOM: focusTarget establecido para animación.');
  }, [focusPolygonId, poligonos, loading, onFocusHandled, setSelectedPoligono, manzanasPadron]);

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8C3154] mx-auto mb-4" />
          <p className="text-stone-500 font-medium">Cargando cartografía...</p>
        </div>
      </div>
    );
  }

  if (storeError && poligonos.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-stone-50 p-8">
        <div className="text-center max-w-md">
          <div className="bg-amber-100 text-amber-700 p-4 rounded-2xl mb-4 border border-amber-200">
            <Info size={24} className="mx-auto mb-2" />
            <p className="font-bold">Error de conexión</p>
            <p className="text-sm mt-1 text-red-600 font-mono bg-white/50 p-2 rounded mt-2">Error: {storeError}</p>
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

  const googleMapsUrlReal = routeService.getGoogleMapsUrl(routeOrigin, routeDest, travelMode);

  return (
    <div className="flex flex-col md:flex-row h-full w-full relative overflow-hidden bg-white">
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden absolute top-4 left-4 z-50 bg-white p-3 rounded-xl shadow-lg border border-stone-200"
      >
        <Menu className="w-6 h-6 text-slate-700" />
      </button>

      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-[999] transition-opacity ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-[1000] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 z-50 bg-stone-100 p-2 rounded-lg text-slate-500 hover:bg-stone-200"
        >
          <X className="w-5 h-5" />
        </button>
        <RoutingSidebar
          isOpen
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
          preferCanvas={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <StateBoundaryLayer isRoutingActive={routeMode} isAdmin={!!isAdmin} userId={userId} />

          <MapController
            poligonos={poligonos}
            manzanasPadron={manzanasPadron}
            focusPolygon={focusTarget}
            onFocusHandled={() => {
              setFocusTarget(null);
              onFocusHandled?.();
            }}
            handleMapSelection={handleMapSelection}
          />

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

          {visibleLayers.padron && (
            <LayerGroup>
              <PadronLayer
                tareas={tareas}
                tasksUpdateKey={tasksUpdateKey}
                handleMapSelection={handleMapSelection}
                isRoutingActive={routeMode}
                manzanasPadron={manzanasPadron}
              />
            </LayerGroup>
          )}

          {visibleLayers.nearManzanas && (
            <LayerGroup>
              <NearManzanasLayer
                tareas={tareas}
                tasksUpdateKey={tasksUpdateKey}
                handleMapSelection={handleMapSelection}
                isRoutingActive={routeMode}
              />
            </LayerGroup>
          )}

          <SelectionHighlightLayer />
        </MapContainer>

        {routeResult && googleMapsUrlReal && (
          <div className="absolute top-28 md:top-6 left-1/2 -translate-x-1/2 z-20 w-[92%] md:w-auto bg-white/95 backdrop-blur-sm border border-[#7C4A36]/30 shadow-2xl rounded-2xl p-3 md:p-4 flex flex-row items-center justify-between md:justify-start gap-3 md:gap-6 text-sm">
            <div className="flex items-center gap-3 md:gap-6 flex-1 md:flex-none">
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Distancia</span>
                <span className="text-sm md:text-lg font-black text-slate-900 leading-tight">
                  {(routeResult.distance / 1000).toFixed(1)} <span className="text-[10px] md:text-xs font-normal text-slate-500">km</span>
                </span>
              </div>
              <div className="w-px h-8 md:h-10 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[9px] md:text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tiempo</span>
                <span className="text-sm md:text-lg font-black text-slate-900 leading-tight">
                  {Math.round(routeResult.duration / 60)} <span className="text-[10px] md:text-xs font-normal text-slate-500">min</span>
                </span>
              </div>
            </div>
            
            <div className="w-px h-8 md:h-10 bg-slate-200 hidden md:block" />
            
            <a
              href={googleMapsUrlReal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#8C3154] hover:bg-[#7a2a49] text-white text-[10px] md:text-xs font-bold rounded-xl transition-all active:scale-95 shadow shrink-0"
            >
              <ExternalLink className="w-3 md:w-3.5 h-3 md:h-3.5" />
              <span className="hidden xs:inline">Ir a Maps</span>
              <span className="xs:hidden">Google</span>
            </a>
          </div>
        )}

        {!isAdmin && !loading && tareas.length === 0 && (
          <div className="absolute inset-0 z-[1100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-6 transition-all animate-in fade-in">
            <div className="bg-white border border-stone-200 shadow-2xl rounded-3xl p-8 max-w-sm text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sin asignación</h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">
                No tienes una sección o manzana asignada actualmente. Contacta al administrador para recibir tareas.
              </p>
              <button
                onClick={() => loadTasks()}
                className="w-full py-3 bg-[#8C3154] text-white rounded-xl font-bold text-sm hover:bg-[#7a2a49] transition-all active:scale-95 shadow-lg shadow-pink-900/10"
              >
                Actualizar Tareas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

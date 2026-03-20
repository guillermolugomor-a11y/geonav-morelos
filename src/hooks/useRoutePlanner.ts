import { useCallback, useEffect, useRef, useState } from 'react';
import { LatLng, RouteResult } from '../components/RouteController';
import { debugError, debugWarn } from '../utils/debug';

export const useRoutePlanner = () => {
  const [routeMode, setRouteMode] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState<LatLng | null>(null);
  const [routeDest, setRouteDest] = useState<LatLng | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [travelMode, setTravelMode] = useState<'driving' | 'foot'>('driving');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

    if (!routeOrigin && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
          setRouteOrigin(latlng);
          window.dispatchEvent(new CustomEvent('locate-user-origin', { detail: latlng }));
        },
        (error) => {
          debugWarn('Ubicación automática denegada o inaccesible:', error);
        }
      );
    }
  }, [routeOrigin]);

  const handleMapSelection = useCallback((latlng: { lat: number; lng: number }) => {
    const { routeMode: currentRouteMode, routeOrigin: currentOrigin, routeDest: currentDest } = routeStateRef.current;

    if (!currentRouteMode) return;

    if (!currentOrigin) {
      setRouteOrigin(latlng);
    } else if (!currentDest) {
      setRouteDest(latlng);
    }
  }, []);

  const handleUseMyLocationAsDestination = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada por el navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
        setRouteDest(latlng);
        if (!routeOrigin) {
          setRouteMode(true);
        }
      },
      (error) => {
        debugError('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación actual.');
      }
    );
  }, [routeOrigin]);

  return {
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
  };
};

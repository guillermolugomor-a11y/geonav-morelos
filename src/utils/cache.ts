/**
 * Utilidad para manejar el caching persistente de archivos grandes (GeoJSON)
 * utilizando la Cache API del navegador.
 */

import { debugLog } from './debug';

const CACHE_NAME = 'geonav-static-data-v1';
const pendingRequests = new Map<string, Promise<any>>();

export async function fetchWithCache<T>(url: string): Promise<T> {
  // Evitar descargas duplicadas si múltiples componentes piden el mismo archivo a la vez
  if (pendingRequests.has(url)) {
    debugLog(`[Cache] Esperando descarga en progreso para: ${url}`);
    return pendingRequests.get(url);
  }

  const requestPromise = (async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        debugLog(`[Cache] Cargando desde disco: ${url}`);
        return await cachedResponse.json();
      }

      debugLog(`[Cache] No encontrado. Descargando de red: ${url}`);
      const response = await fetch(url);
      
      if (response.ok) {
        await cache.put(url, response.clone());
      }
      
      return await response.json();
    } catch (error) {
      console.warn('[Cache] API falló, usando fetch tradicional', error);
      const res = await fetch(url);
      return await res.json();
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, requestPromise);
  return requestPromise;
}

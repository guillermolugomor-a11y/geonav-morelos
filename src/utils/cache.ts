/**
 * Utilidad para manejar el caching persistente de archivos grandes (GeoJSON)
 * utilizando la Cache API del navegador.
 */

const CACHE_NAME = 'geonav-static-data-v1';

export async function fetchWithCache<T>(url: string): Promise<T> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(url);

  if (cachedResponse) {
    console.log(`[Cache] Cargando desde disco: ${url}`);
    return await cachedResponse.json();
  }

  console.log(`[Cache] No encontrado. Descargando de red: ${url}`);
  const response = await fetch(url);
  
  // Guardar en caché para la próxima vez
  await cache.put(url, response.clone());
  
  return await response.json();
}

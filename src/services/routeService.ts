import { LatLng, RouteResult } from '../components/RouteController';

export const routeService = {
    /**
     * Calcula una ruta utilizando la API OSRM
     */
    async calculateRoute(origin: LatLng, destination: LatLng, travelMode: 'driving' | 'foot'): Promise<RouteResult | null> {
        try {
            const url =
                `https://router.project-osrm.org/route/v1/${travelMode}/` +
                `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
                `?overview=full&geometries=geojson`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OSRM Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    distance: route.distance,
                    duration: route.duration,
                    geometry: route.geometry,
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching route from OSRM:', error);
            return null;
        }
    },

    /**
     * Genera la URL dinámica para abrir la ruta en Google Maps
     */
    getGoogleMapsUrl(origin: LatLng | null, destination: LatLng | null, travelMode: 'driving' | 'foot'): string | null {
        if (!origin || !destination) return null;

        const mode = travelMode === 'driving' ? 'driving' : 'walking';
        return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=${mode}`;
    }
};

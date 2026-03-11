/**
 * Servicio de Geocodificación Inversa utilizando la API gratuita de Nominatim (OpenStreetMap)
 * Documentación API: https://nominatim.org/release-docs/latest/api/Reverse/
 */

export const geocodeService = {
    /**
     * Obtiene una dirección legible con calle, colonia, ciudad a partir de coordenadas.
     * Utiliza la API pública de Nominatim por lo que es necesario incluir un header de User-Agent real o apropiado,
     * así como respetar el límite de 1 petición por segundo.
     */
    async reverseGeocode(lat: number, lng: number): Promise<string> {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'es-MX,es;q=0.9',
                    // Nominatim requiere un User-Agent identificativo
                    'User-Agent': 'GeoNavMorelos/1.0 (info@geonav.com)'
                }
            });

            if (!response.ok) {
                throw new Error(`Error en el servicio de geocodificación: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.address) {
                // Extraemos inteligentemente las partes clave para no hacer el string infinito
                const addr = data.address;

                const road = addr.road || '';
                const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
                const currentStreet = road ? `${road}${houseNumber}` : '';

                const neighbourhood = addr.neighbourhood || addr.suburb || '';
                const city = addr.city || addr.town || addr.village || addr.municipality || '';

                // Cadenas condicionales
                const components = [];
                if (currentStreet) components.push(currentStreet);
                if (neighbourhood) components.push(`Col. ${neighbourhood}`);
                if (city) components.push(city);

                if (components.length > 0) {
                    return components.join(', ');
                }

                // Fallback genérico de OSM si nuestra extracción falló pero hay display_name
                return data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : 'Ubicación Conocida';
            }

            return 'Ubicación sin nombre registrado';
        } catch (error) {
            console.error('Error durante la geocodificación inversa:', error);
            return 'Dirección no disponible';
        }
    }
};

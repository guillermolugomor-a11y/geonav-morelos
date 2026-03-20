-- Función RPC para filtrar polígonos por Bounding Box (BBox)
-- Permite cargar solo los polígonos visibles en el mapa actual.

CREATE OR REPLACE FUNCTION public.get_poligonos_in_bbox(
    min_lat float, 
    min_lon float, 
    max_lat float, 
    max_lon float
)
RETURNS SETOF public.poligonos_geojson
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.poligonos_geojson
    -- Asumimos que la vista poligono_geojson o su tabla base tiene acceso a la geometría
    -- para realizar la intersección espacial eficiente.
    -- ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326) crea el rectángulo de búsqueda.
    WHERE geom_col && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326);
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION public.get_poligonos_in_bbox(float, float, float, float) TO anon, authenticated, service_role;

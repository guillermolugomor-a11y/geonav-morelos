-- GeoNav Morelos: Función RPC para Activación de Tareas Programadas
-- Esta función centraliza la lógica de activación, garantizando atomicidad y bypass de RLS.
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION activate_scheduled_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios elevados (bypass RLS)
AS $$
DECLARE
    v_rows_updated integer;
    v_admin_id uuid;
BEGIN
    -- 1. Obtener un ID de administrador para el historial (el primero disponible)
    SELECT id INTO v_admin_id 
    FROM public.usuarios_perfil 
    WHERE lower(rol) = 'admin' 
    LIMIT 1;

    -- 2. Actualizar tareas y registrar historial en un solo paso atómico
    WITH to_activate AS (
        UPDATE public.tareas 
        SET status = 'pendiente'
        WHERE status = 'programada' 
          AND auto_activate = true 
          AND scheduled_at <= NOW()
        RETURNING id, user_id, scheduled_at
    ),
    inserted_history AS (
        INSERT INTO public.tarea_historial (tarea_id, user_id, mensaje, estado_snapshot, tipo)
        SELECT 
            id, 
            v_admin_id, 
            ' [SISTEMA] Tarea activada automáticamente (programada para ' || TO_CHAR(scheduled_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY HH24:MI') || ')', 
            'pendiente', 
            'sistema'
        FROM to_activate
        RETURNING tarea_id
    )
    SELECT count(*) INTO v_rows_updated FROM to_activate;

    RETURN v_rows_updated;
END;
$$;

-- Otorgar permisos de ejecución al rol anon (pero la función corre con permisos de owner)
GRANT EXECUTE ON FUNCTION activate_scheduled_tasks() TO anon, authenticated, service_role;

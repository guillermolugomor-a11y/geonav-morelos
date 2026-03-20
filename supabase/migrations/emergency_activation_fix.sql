-- GeoNav Morelos: Script de Emergencia y Robustez (Scheduler)
-- 1. Forzar activación de CUALQUIER tarea programada que ya debería estar activa (México Time)
UPDATE public.tareas 
SET status = 'pendiente' 
WHERE status = 'programada' 
  AND (
    scheduled_at <= NOW() 
    OR scheduled_at <= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')
    OR scheduled_at IS NULL -- Si quedó NULL por el bug de segundos, activarla como seguridad
  );

-- 2. Robustecer el RPC para que use una comparación de tiempo más flexible
CREATE OR REPLACE FUNCTION public.activate_scheduled_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_updated integer;
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id FROM public.usuarios_perfil WHERE lower(rol) = 'admin' LIMIT 1;

    WITH to_activate AS (
        UPDATE public.tareas 
        SET status = 'pendiente'
        WHERE status = 'programada' 
          AND auto_activate = true 
          -- Comparación robusta: UTC u hora local de México
          AND (scheduled_at <= NOW() OR scheduled_at AT TIME ZONE 'America/Mexico_City' <= NOW() AT TIME ZONE 'America/Mexico_City')
        RETURNING id, user_id, scheduled_at
    ),
    inserted_history AS (
        INSERT INTO public.tarea_historial (tarea_id, user_id, mensaje, estado_snapshot, tipo)
        SELECT 
            id, 
            v_admin_id, 
            'Tarea activada (programada para ' || TO_CHAR(scheduled_at AT TIME ZONE 'America/Mexico_City', 'DD/MM HH24:MI') || ')', 
            'pendiente', 
            'sistema'
        FROM to_activate
    )
    SELECT count(*) INTO v_rows_updated FROM to_activate;

    RETURN v_rows_updated;
END;
$$;

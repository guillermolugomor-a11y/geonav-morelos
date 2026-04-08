-- ==========================================
-- GeoNav Morelos: SOLUCIÓN DEFINITIVA (V3)
-- Corrigiendo Activación y Notificaciones
-- ==========================================

-- 1. LIMPIEZA DE TRIGGERS ANTERIORES
DROP TRIGGER IF EXISTS tr_notify_on_task_insert ON public.tareas;
DROP TRIGGER IF EXISTS tr_notify_on_task_status_change ON public.tareas;
DROP FUNCTION IF EXISTS public.notify_on_task_insert();

-- 2. FUNCIÓN DE NOTIFICACIÓN CORREGIDA (Incluye columna 'tipo')
CREATE OR REPLACE FUNCTION public.notify_on_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo notificar cuando el estado es 'pendiente'
    IF (NEW.status = 'pendiente' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status = 'programada'))) THEN
        INSERT INTO public.notificaciones (user_id, titulo, mensaje, leida, metadata, tipo)
        VALUES (
            NEW.user_id,
            'Nueva Tarea Asignada',
            CASE 
                WHEN NEW.tipo_capa = 'manzana' THEN 'Se te ha asignado una tarea en: manzana'
                ELSE 'Se te ha asignado una tarea en: ' || COALESCE(NEW.tipo_capa, 'padron')
            END,
            false,
            jsonb_build_object('tarea_id', NEW.id, 'tipo', 'asignacion'),
            'asignacion' -- Corrigiendo el error de NOT NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREAR EL TRIGGER
CREATE TRIGGER tr_notify_on_task_status_change
AFTER INSERT OR UPDATE ON public.tareas
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_task_status_change();

-- 4. ROBUSTECER EL RPC DE ACTIVACIÓN
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
          -- Comparación robusta entre UTC y hora local de México
          AND (scheduled_at <= NOW() OR scheduled_at AT TIME ZONE 'America/Mexico_City' <= NOW() AT TIME ZONE 'America/Mexico_City')
        RETURNING id, user_id, scheduled_at
    ),
    inserted_history AS (
        INSERT INTO public.tarea_historial (tarea_id, user_id, mensaje, estado_snapshot, tipo)
        SELECT 
            id, 
            v_admin_id, 
            '[SISTEMA] Tarea activada vía scheduler (prog. para ' || TO_CHAR(scheduled_at AT TIME ZONE 'America/Mexico_City', 'DD/MM HH24:MI') || ')', 
            'pendiente', 
            'sistema'
        FROM to_activate
    )
    SELECT count(*) INTO v_rows_updated FROM to_activate;

    RETURN v_rows_updated;
END;
$$;

-- 5. FORZAR ACTIVACIÓN DE LO ACTUAL (EMERGENCIA)
UPDATE public.tareas 
SET status = 'pendiente' 
WHERE status = 'programada' 
  AND (
    scheduled_at <= NOW() 
    OR scheduled_at <= (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')
    OR scheduled_at IS NULL
  );

GRANT EXECUTE ON FUNCTION activate_scheduled_tasks() TO anon, authenticated, service_role;

-- GeoNav Morelos: Corrección de Notificaciones para Tareas Programadas
-- Este script asegura que la notificación solo se envíe cuando la tarea esté ACTIVA ('pendiente').
-- Si entra como 'programada', no se envía nada hasta que el scheduler la active.

-- 1. Eliminar triggers y funciones antiguas (limpieza)
DROP TRIGGER IF EXISTS tr_notify_on_task_insert ON public.tareas;
DROP TRIGGER IF EXISTS tr_notify_on_task_status_change ON public.tareas;
DROP FUNCTION IF EXISTS public.notify_on_task_insert();

-- 2. Crear nueva función con lógica de estados
CREATE OR REPLACE FUNCTION public.notify_on_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Lógica: SOLO notificar si el estado es 'pendiente'
    -- (Funciona para inserción directa o para actualización desde 'programada')
    IF (NEW.status = 'pendiente' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status = 'programada'))) THEN
        INSERT INTO public.notificaciones (user_id, titulo, mensaje, leida, metadata)
        VALUES (
            NEW.user_id,
            'Nueva Tarea Asignada',
            CASE 
                WHEN NEW.tipo_capa = 'manzana' THEN 'Se te ha asignado una tarea en: manzana'
                ELSE 'Se te ha asignado una tarea en: ' || COALESCE(NEW.tipo_capa, 'padron')
            END,
            false,
            jsonb_build_object('tarea_id', NEW.id, 'tipo', 'asignacion')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear el trigger unificado
CREATE TRIGGER tr_notify_on_task_status_change
AFTER INSERT OR UPDATE ON public.tareas
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_task_status_change();

-- 4. Audit: Verificar estado del trigger
COMMENT ON FUNCTION public.notify_on_task_status_change() IS 'Envía notificaciones solo cuando una tarea pasa a pendiente.';

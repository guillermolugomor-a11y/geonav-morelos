-- GeoNav Morelos: Sistema de Notificaciones Real-time
-- Este script configura la tabla de notificaciones, políticas RLS y triggers automáticos.

-- 1. Estructura de la Tabla
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN DEFAULT FALSE,
    tipo TEXT NOT NULL, 
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Seguridad (Row Level Security)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver sus propias notificaciones" ON notificaciones;
DROP POLICY IF EXISTS "Usuarios pueden marcar sus propias notificaciones como leídas" ON notificaciones;

CREATE POLICY "Usuarios pueden ver sus propias notificaciones" 
ON notificaciones FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden marcar sus propias notificaciones como leídas" 
ON notificaciones FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (leida = TRUE);

-- 3. Trigger: Notificar a Administradores sobre cambios de estado
CREATE OR REPLACE FUNCTION notify_admins_on_task_update()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
    worker_name TEXT := 'Un usuario';
BEGIN
    -- Obtener nombre del trabajador que realiza el cambio
    SELECT COALESCE(nombre, email, 'Un usuario') INTO worker_name 
    FROM usuarios_perfil 
    WHERE id = NEW.user_id;
    
    IF worker_name IS NULL THEN worker_name := 'Un usuario'; END IF;

    -- Notificar a todos los admins
    FOR admin_record IN (SELECT id FROM usuarios_perfil WHERE rol = 'admin') LOOP
        INSERT INTO notificaciones (user_id, titulo, mensaje, tipo, metadata)
        VALUES (
            admin_record.id,
            'Actualización de Tarea',
            concat(worker_name, ' cambió el estado a ', COALESCE(NEW.status, 'desconocido')),
            'status_changed',
            jsonb_build_object('tarea_id', NEW.id, 'nuevo_status', NEW.status, 'field_worker_id', NEW.user_id)
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_on_status_update ON tareas;
CREATE TRIGGER trigger_notify_admin_on_status_update
AFTER UPDATE OF status ON tareas
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION notify_admins_on_task_update();

-- 4. Trigger: Notificar a Field Workers sobre nuevas asignaciones
CREATE OR REPLACE FUNCTION notify_worker_on_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notificaciones (user_id, titulo, mensaje, tipo, metadata)
    VALUES (
        NEW.user_id,
        'Nueva Tarea Asignada',
        concat('Se te ha asignado una nueva tarea: ', COALESCE(NEW.instruccion, 'Sin instrucciones')),
        'task_assigned',
        jsonb_build_object('tarea_id', NEW.id, 'tipo_capa', COALESCE(NEW.tipo_capa, 'desconocida'))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_worker_on_new_task ON tareas;
CREATE TRIGGER trigger_notify_worker_on_new_task
AFTER INSERT ON tareas
FOR EACH ROW
EXECUTE FUNCTION notify_worker_on_task_assignment();

-- 5. Configuración de Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

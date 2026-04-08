-- ===================================================
-- GeoNav Morelos: MIGRACIÓN PARA TAREAS COLABORATIVAS
-- ===================================================

-- 1. Añadir columna is_collaborative a tareas
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT FALSE;

-- 2. Crear tabla de colaboradores
CREATE TABLE IF NOT EXISTS public.tarea_colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarea_id UUID NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tarea_id, user_id)
);

-- 3. Habilitar RLS en tarea_colaboradores
ALTER TABLE public.tarea_colaboradores ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para tarea_colaboradores
CREATE POLICY "Admins can manage all collaborators"
ON public.tarea_colaboradores
FOR ALL
USING (EXISTS (SELECT 1 FROM public.usuarios_perfil WHERE id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Users can see their own collaborations"
ON public.tarea_colaboradores
FOR SELECT
USING (user_id = auth.uid());

-- 5. Actualizar Políticas de tareas para permitir acceso colaborativo
-- Primero eliminamos las antiguas si es necesario (o añadimos una nueva)
-- Asumimos que existen políticas basadas en user_id.

DROP POLICY IF EXISTS "Users can see their own tasks" ON public.tareas;
CREATE POLICY "Users can see tasks they own or collaborate in"
ON public.tareas
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.tarea_colaboradores 
    WHERE tarea_id = public.tareas.id AND user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.usuarios_perfil WHERE id = auth.uid() AND rol = 'admin')
);

-- Permitir actualizaciones (comentarios, estado) si eres colaborador
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tareas;
CREATE POLICY "Users can update tasks they own or collaborate in"
ON public.tareas
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.tarea_colaboradores 
    WHERE tarea_id = public.tareas.id AND user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM public.usuarios_perfil WHERE id = auth.uid() AND rol = 'admin')
);

-- 6. Trigger de Notificación para Colaboradores
CREATE OR REPLACE FUNCTION public.notify_collaborators()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar a todos los colaboradores (excepto al creador que ya se maneja o si se prefiere unificar)
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, metadata, tipo)
    SELECT 
        user_id, 
        'Nueva Tarea Colaborativa',
        'Has sido invitado a colaborar en una tarea en ' || COALESCE(NEW.tipo_capa, 'el mapa'),
        jsonb_build_object('tarea_id', NEW.id, 'tipo', 'asignacion_colaborativa'),
        'asignacion'
    FROM public.tarea_colaboradores
    WHERE tarea_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: Este trigger debería activarse tras insertar en tarea_colaboradores o al marcar is_collaborative.
-- Sin embargo, es más simple activarlo desde el servicio de aplicación para mayor control en este MVP.

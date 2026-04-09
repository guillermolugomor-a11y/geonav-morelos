-- Migración para soportar múltiples evidencias fotográficas
-- Añade una columna de tipo array de texto a la tabla de tareas

ALTER TABLE public.tareas 
ADD COLUMN IF NOT EXISTS evidencia_urls text[] DEFAULT '{}';

-- Comentario para documentación
COMMENT ON COLUMN public.tareas.evidencia_urls IS 'Array de URLs de imágenes cargadas en Cloudinary como evidencia.';

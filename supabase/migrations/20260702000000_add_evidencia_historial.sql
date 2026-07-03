-- El historial de avances nunca guardaba la evidencia fotográfica adjunta,
-- solo un texto mencionando que existía. Esto impedía ver el documento de
-- soporte en el Registro de Movimientos/Historial de Avances de cada tarea.
ALTER TABLE public.tarea_historial
ADD COLUMN IF NOT EXISTS evidencia_url text,
ADD COLUMN IF NOT EXISTS evidencia_urls text[] DEFAULT '{}';

COMMENT ON COLUMN public.tarea_historial.evidencia_url IS 'URL de evidencia fotográfica (legado, single) asociada a este registro de historial.';
COMMENT ON COLUMN public.tarea_historial.evidencia_urls IS 'Array de URLs de evidencia fotográfica asociadas a este registro de historial.';

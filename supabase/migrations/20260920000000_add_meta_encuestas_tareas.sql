-- Meta de encuestas por tarea (sección/manzana). Se carga desde la importación CSV
-- de asignaciones ("Total de encuestas"). NULL = tarea sin meta definida.
ALTER TABLE public.tareas
ADD COLUMN IF NOT EXISTS meta_encuestas integer
CHECK (meta_encuestas IS NULL OR meta_encuestas >= 0);

COMMENT ON COLUMN public.tareas.meta_encuestas IS 'Total de encuestas a levantar en la sección/manzana asignada.';

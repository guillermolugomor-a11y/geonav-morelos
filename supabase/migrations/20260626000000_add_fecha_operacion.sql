-- Agrega fecha_operacion para agrupar tareas por ola/ciclo de asignación.
-- Esto permite reasignar secciones en fechas distintas sin borrar el historial.
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS fecha_operacion DATE DEFAULT CURRENT_DATE;

-- Índice para acelerar filtros por fecha en el Monitor y en seccionesOcupadas.
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_operacion ON public.tareas (fecha_operacion);

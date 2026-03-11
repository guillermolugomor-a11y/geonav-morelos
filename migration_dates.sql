-- MIGRACIÓN PARA MANEJO DE FECHAS EN TAREAS
-- 1. Agregar columnas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'created_at') THEN
        ALTER TABLE tareas ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tareas' AND column_name = 'updated_at') THEN
        ALTER TABLE tareas ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- 2. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para la tabla tareas
DROP TRIGGER IF EXISTS trigger_update_tareas_updated_at ON tareas;
CREATE TRIGGER trigger_update_tareas_updated_at
BEFORE UPDATE ON tareas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Asegurar que las filas existentes tengan fecha si estaban vacías
UPDATE tareas SET created_at = now() WHERE created_at IS NULL;
UPDATE tareas SET updated_at = now() WHERE updated_at IS NULL;

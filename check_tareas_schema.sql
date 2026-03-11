-- Revisión de esquema actual para tareas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tareas';

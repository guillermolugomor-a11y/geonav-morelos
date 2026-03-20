-- Migración: Eliminar hardcoding de administradores
-- Este script asegura que los usuarios que estaban hardcodeados en el frontend tengan el rol de 'admin' en la base de datos.

UPDATE usuarios_perfil
SET rol = 'admin'
WHERE email IN (
  'guillermo.lugo.mor@gmail.com',
  'guillermo.lugo@morelos.gob.mx',
  'daniel.sotelo@morelos.gob.mx'
);

-- Verificar cambios
SELECT email, rol FROM usuarios_perfil WHERE rol = 'admin';

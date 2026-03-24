-- ==========================================
-- GeoNav Morelos: SINCRONIZACIÓN DE ÚLTIMA CONEXIÓN
-- ==========================================

-- 1. Añadir la columna a la tabla de perfiles
ALTER TABLE public.usuarios_perfil 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 2. Función para sincronizar desde auth.users a public.usuarios_perfil
CREATE OR REPLACE FUNCTION public.sync_user_last_login()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.usuarios_perfil
    SET last_login = NEW.last_sign_in_at
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para detectar cambios en auth.users
-- Nota: Esto se ejecuta cada vez que Supabase Auth actualiza el last_sign_in_at
DROP TRIGGER IF EXISTS tr_sync_last_login ON auth.users;
CREATE TRIGGER tr_sync_last_login
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_last_login();

-- 4. Sincronización inicial para usuarios que ya han iniciado sesión
UPDATE public.usuarios_perfil p
SET last_login = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id;

-- ==========================================
-- MIGRACIÓN: AGREGAR METADATOS A USER_ROLES
-- Copia y pega esto en el SQL Editor de Supabase
-- ==========================================

ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Opcional: Actualizar el comentario de la tabla
COMMENT ON TABLE public.user_roles IS 'Almacena roles y metadatos extendidos de los usuarios.';

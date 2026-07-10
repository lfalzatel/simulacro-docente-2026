-- ==========================================
-- SCRIPT PARA PERMITIR ACTUALIZAR NOMBRES DE GOOGLE
-- Copia y pega esto en el SQL Editor de Supabase
-- ==========================================

-- 1. Crear una función segura que solo permite actualizar nombre y foto
CREATE OR REPLACE FUNCTION public.update_user_profile(new_name TEXT, new_avatar TEXT)
RETURNS VOID AS $$
BEGIN
  -- Solo actualiza la fila que pertenece al usuario que inició sesión
  UPDATE public.user_roles 
  SET full_name = new_name, 
      avatar_url = new_avatar, 
      updated_at = now()
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Dar permisos a los usuarios autenticados para ejecutar la función
GRANT EXECUTE ON FUNCTION public.update_user_profile(TEXT, TEXT) TO authenticated;

-- Fase 1: Migración Arquitectónica de Supabase (Roles, Grupos y Exámenes)

-- 1. Modificar user_roles
-- Eliminar la restricción anterior y crear la nueva
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'profesor', 'estudiante', 'free', 'premium'));

-- Agregar columnas nuevas
ALTER TABLE public.user_roles 
    ADD COLUMN IF NOT EXISTS grupo TEXT,
    ADD COLUMN IF NOT EXISTS promovido_por UUID REFERENCES auth.users(id);

-- Función para verificar si es profesor
CREATE OR REPLACE FUNCTION public.check_is_profesor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('profesor', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear tabla grupos
CREATE TABLE IF NOT EXISTS public.grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    profesor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;

-- 3. Crear tabla examenes
CREATE TABLE IF NOT EXISTS public.examenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    grupo_id UUID REFERENCES public.grupos(id),
    profesor_id UUID REFERENCES auth.users(id),
    simulacro_id UUID REFERENCES public.simulacros(id),
    estado TEXT DEFAULT 'inactivo' CHECK (estado IN ('inactivo','activo','cerrado')),
    activado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.examenes ENABLE ROW LEVEL SECURITY;

-- 4. Crear tabla examen_intentos (Anti-fraude)
CREATE TABLE IF NOT EXISTS public.examen_intentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examen_id UUID REFERENCES public.examenes(id),
    estudiante_id UUID REFERENCES auth.users(id),
    estado TEXT DEFAULT 'no_iniciado'
        CHECK (estado IN ('no_iniciado','en_progreso','bloqueado','finalizado')),
    respuestas JSONB DEFAULT '{}'::jsonb,
    puntaje INTEGER DEFAULT 0,
    infracciones INTEGER DEFAULT 0,
    bloqueado_at TIMESTAMPTZ,
    desbloqueado_por UUID REFERENCES auth.users(id),
    desbloqueado_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(examen_id, estudiante_id)
);
ALTER TABLE public.examen_intentos ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (Básicas)
-- Grupos: Profesores ven todos, estudiantes ven el suyo
CREATE POLICY "Lectura de grupos" ON public.grupos FOR SELECT USING (true);
CREATE POLICY "Profesores gestionan grupos" ON public.grupos FOR ALL USING (public.check_is_profesor());

-- Examenes: Profesores gestionan, estudiantes leen los de su grupo
CREATE POLICY "Lectura de exámenes" ON public.examenes FOR SELECT USING (true);
CREATE POLICY "Profesores gestionan exámenes" ON public.examenes FOR ALL USING (public.check_is_profesor());

-- Intentos: Estudiante lee/actualiza el suyo, profesor lee todos
CREATE POLICY "Estudiantes gestionan sus intentos" ON public.examen_intentos 
    FOR ALL USING (auth.uid() = estudiante_id);
CREATE POLICY "Profesores leen intentos" ON public.examen_intentos 
    FOR SELECT USING (public.check_is_profesor());
CREATE POLICY "Profesores actualizan intentos" ON public.examen_intentos 
    FOR UPDATE USING (public.check_is_profesor());

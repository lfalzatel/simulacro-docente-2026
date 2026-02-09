-- ⚠️ ATENCIÓN: ESTE SCRIPT BORRARÁ TODOS LOS DATOS DE PROGRESO EXISTENTES
-- Ejecútalo solo si tienes problemas con la tabla 'simulacro_progress' (Error 406)

-- 1. Borrar la tabla y sus políticas por completo
drop table if exists simulacro_progress cascade;

-- 2. Crear la tabla desde cero
create table simulacro_progress (
  user_id uuid references auth.users not null primary key,
  progress_data jsonb default '{}'::jsonb,
  score integer default 0,
  last_index integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Habilitar seguridad (RLS)
alter table simulacro_progress enable row level security;

-- 4. Crear políticas (Permisos)
create policy "Users can select own progress" 
  on simulacro_progress for select 
  using ( auth.uid() = user_id );

create policy "Users can insert own progress" 
  on simulacro_progress for insert 
  with check ( auth.uid() = user_id );

create policy "Users can update own progress" 
  on simulacro_progress for update 
  using ( auth.uid() = user_id );

-- 5. Dar permisos a los roles de Supabase
grant all on simulacro_progress to authenticated;
grant all on simulacro_progress to service_role;

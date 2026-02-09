-- Drop previous policies if they exist (to avoid "already exists" error)
drop policy if exists "Users can view their own progress" on simulacro_progress;
drop policy if exists "Users can insert/update their own progress" on simulacro_progress;
drop policy if exists "Users can update their own progress" on simulacro_progress;

-- Create the table for storing progress (if it doesn't exist)
create table if not exists simulacro_progress (
  user_id uuid references auth.users not null primary key,
  progress_data jsonb default '{}'::jsonb,
  score integer default 0,
  last_index integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table simulacro_progress enable row level security;

-- Re-create Policies
create policy "Users can view their own progress"
  on simulacro_progress for select
  using ( auth.uid() = user_id );

create policy "Users can insert/update their own progress"
  on simulacro_progress for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own progress"
  on simulacro_progress for update
  using ( auth.uid() = user_id );

-- Grant all permissions
grant all on simulacro_progress to authenticated;
grant all on simulacro_progress to service_role;

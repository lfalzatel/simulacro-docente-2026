-- Create the table for storing progress
create table if not exists simulacro_progress (
  user_id uuid references auth.users not null primary key,
  progress_data jsonb default '{}'::jsonb,
  score integer default 0,
  last_index integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table simulacro_progress enable row level security;

-- Create Policy: Users can only select their own data
create policy "Users can view their own progress"
on simulacro_progress for select
using ( auth.uid() = user_id );

-- Create Policy: Users can insert/update their own data
create policy "Users can insert/update their own progress"
on simulacro_progress for all
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- Grant access to authenticated users
grant all on simulacro_progress to authenticated;
grant all on simulacro_progress to service_role;

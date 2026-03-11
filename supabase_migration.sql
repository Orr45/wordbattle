-- Run this in your Supabase SQL Editor

create table if not exists rooms (
  id text primary key,
  word_list jsonb default '[]',
  started_at timestamp with time zone,
  status text default 'lobby',
  created_at timestamp with time zone default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  nickname text not null,
  score integer default 0,
  answers jsonb default '[]',
  finished_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table rooms enable row level security;
alter table players enable row level security;

-- Allow all anon access (no login required)
create policy "allow all rooms" on rooms for all to anon using (true) with check (true);
create policy "allow all players" on players for all to anon using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- versioning
create table if not exists app_meta (
  id bigint primary key generated always as identity,
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into app_meta(key, value)
  values ('schema_version', jsonb_build_object('version', 1))
on conflict (key) do nothing;

-- users (auth.uid() exists; mirror for joins)
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- tasks
create table if not exists tasks (
  id bigint primary key generated always as identity,
  user_id uuid not null references users(id) on delete cascade,
  task_id bigint not null,              -- local numeric id you already use
  name text not null,
  impact int2 not null check (impact between 1 and 5),
  duration int2 not null check (duration > 0),
  project text,
  updated_at timestamptz not null default now(),
  unique(user_id, task_id)
);

-- sessions (focus blocks)
create table if not exists sessions (
  id bigint primary key generated always as identity,
  user_id uuid not null references users(id) on delete cascade,
  task_id bigint not null,
  name text not null,
  project text,
  duration int2 not null,               -- minutes
  feedback text check (feedback in ('yes','no')),
  started_at timestamptz,               -- optional
  created_at timestamptz not null default now()
);

-- feedback map (explicit store; optional because sessions has feedback too)
create table if not exists feedback (
  user_id uuid not null references users(id) on delete cascade,
  task_id bigint not null,
  answer text not null check (answer in ('yes','no')),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

-- backups (raw JSON blobs)
create table if not exists backups (
  id bigint primary key generated always as identity,
  user_id uuid not null references users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- RLS
alter table users enable row level security;
alter table tasks enable row level security;
alter table sessions enable row level security;
alter table feedback enable row level security;
alter table backups enable row level security;

create policy "users self"
on users for select using (id = auth.uid());

create policy "tasks by owner"
on tasks for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sessions by owner"
on sessions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "feedback by owner"
on feedback for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "backups by owner"
on backups for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  icon text default 'l_1',
  child boolean not null default false,
  age int,
  main boolean not null default false,
  created_at timestamptz not null default now()
);

create table devices (
  user_id uuid not null references auth.users on delete cascade,
  device_id text not null,
  name text,
  last_seen timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  type text not null,
  card_id text not null,
  card jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  unique (profile_id, type, card_id)
);

create table watch_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  card_id text not null,
  season int,
  episode int,
  time int not null default 0,
  duration int not null default 0,
  percent int not null default 0,
  updated_at timestamptz not null default now(),
  unique (profile_id, card_id, season, episode)
);

create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger bookmarks_touch before update on bookmarks
  for each row execute function touch_updated_at();

create trigger watch_history_touch before update on watch_history
  for each row execute function touch_updated_at();

alter table profiles enable row level security;
alter table devices enable row level security;
alter table bookmarks enable row level security;
alter table watch_history enable row level security;

create policy profiles_own on profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy devices_own on devices for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy bookmarks_own on bookmarks for all to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = bookmarks.profile_id and p.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = bookmarks.profile_id and p.user_id = auth.uid())
  );

create policy watch_history_own on watch_history for all to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = watch_history.profile_id and p.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = watch_history.profile_id and p.user_id = auth.uid())
  );

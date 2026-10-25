-- HOOK TV accounts: run once in Supabase SQL Editor, top to bottom

-- ===== supabase/migrations/0001_accounts.sql
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

-- ===== supabase/migrations/0002_device_limit.sql
-- Re-registering an existing device never counts against the limit.
-- This trigger runs BEFORE INSERT, so it must return early for a device
-- that already exists, before the ON CONFLICT update can apply.
create function enforce_device_limit() returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from devices where user_id = new.user_id and device_id = new.device_id
  ) then
    return new;
  end if;

  if (select count(*) from devices where user_id = new.user_id) >= 2 then
    raise exception 'device_limit' using errcode = 'P0001';
  end if;

  return new;
end $$;

create trigger devices_limit before insert on devices
  for each row execute function enforce_device_limit();

-- ===== supabase/migrations/0003_signin_tickets.sql
-- TV sign-in. The TV creates a ticket and keeps `secret` locally. The QR code
-- carries only `id`. The phone approves by writing its session. The TV claims
-- the session with id + secret. Nothing is readable by anon directly.
create table signin_tickets (
  id uuid primary key default gen_random_uuid(),
  secret text not null,
  session jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes'
);

alter table signin_tickets enable row level security;

create policy signin_tickets_create on signin_tickets for insert to anon, authenticated
  with check (session is null);

create function approve_signin_ticket(p_id uuid, p_session jsonb) returns boolean
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update signin_tickets
     set session = p_session
   where id = p_id and session is null and expires_at > now();

  return found;
end $$;

create function claim_signin_ticket(p_id uuid, p_secret text) returns setof jsonb
  language sql security definer set search_path = public as $$
  delete from signin_tickets
   where id = p_id and secret = p_secret and expires_at > now() and session is not null
  returning session;
$$;

grant execute on function approve_signin_ticket(uuid, jsonb) to authenticated;
grant execute on function claim_signin_ticket(uuid, text) to anon, authenticated;

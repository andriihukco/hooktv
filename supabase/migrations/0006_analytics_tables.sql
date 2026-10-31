-- Analytics tables for admin dashboard

create table analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  game_id text,
  media_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);

create table admin_metrics_cache (
  id text primary key,
  metric_type text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS policies
alter table analytics_sessions enable row level security;
alter table admin_metrics_cache enable row level security;

create policy analytics_sessions_own on analytics_sessions for all to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = analytics_sessions.profile_id and p.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from profiles p where p.id = analytics_sessions.profile_id and p.user_id = auth.uid())
  );

-- No policies on admin_metrics_cache: with RLS on, anon and authenticated users
-- get no rows. Only the service key (which bypasses RLS) reads it.

-- SQL functions for analytics

create function get_games_played(p_start_date text, p_end_date text)
returns table(game_id text, play_count bigint, unique_users bigint)
language sql stable security definer set search_path = public as $$
  select
    analytics_sessions.game_id,
    count(*) as play_count,
    count(distinct analytics_sessions.user_id) as unique_users
  from analytics_sessions
  where media_type = 'game'
    and analytics_sessions.game_id is not null
    and started_at >= p_start_date::timestamptz
    and started_at < p_end_date::timestamptz
  group by analytics_sessions.game_id
  order by play_count desc;
$$;

create function get_watch_time_by_type(p_start_date text, p_end_date text)
returns table(media_type text, total_seconds bigint, session_count bigint)
language sql stable security definer set search_path = public as $$
  select
    analytics_sessions.media_type,
    coalesce(sum(duration_seconds), 0) as total_seconds,
    count(*) as session_count
  from analytics_sessions
  where started_at >= p_start_date::timestamptz
    and started_at < p_end_date::timestamptz
  group by analytics_sessions.media_type;
$$;

create function get_daily_active_users(p_start_date text, p_end_date text)
returns table(date text, active_users bigint, sessions bigint)
language sql stable security definer set search_path = public as $$
  select
    (started_at::date)::text as date,
    count(distinct user_id) as active_users,
    count(*) as sessions
  from analytics_sessions
  where started_at >= p_start_date::timestamptz
    and started_at < p_end_date::timestamptz
  group by started_at::date
  order by started_at::date desc;
$$;

create function get_top_games(p_limit int default 10, p_days int default 7)
returns table(game_id text, play_count bigint, unique_users bigint)
language sql stable security definer set search_path = public as $$
  select
    analytics_sessions.game_id,
    count(*) as play_count,
    count(distinct analytics_sessions.user_id) as unique_users
  from analytics_sessions
  where media_type = 'game'
    and analytics_sessions.game_id is not null
    and started_at >= now() - (p_days || ' days')::interval
  group by analytics_sessions.game_id
  order by play_count desc
  limit p_limit;
$$;

create function get_session_stats(p_start_date text, p_end_date text)
returns table(
  total_sessions bigint,
  unique_users bigint,
  avg_session_duration numeric,
  total_watch_time_hours numeric
)
language sql stable security definer set search_path = public as $$
  select
    count(*) as total_sessions,
    count(distinct user_id) as unique_users,
    round(avg(duration_seconds)::numeric, 2) as avg_session_duration,
    round((sum(duration_seconds) / 3600.0)::numeric, 2) as total_watch_time_hours
  from analytics_sessions
  where started_at >= p_start_date::timestamptz
    and started_at < p_end_date::timestamptz;
$$;

-- The stats functions are for the admin API only (service key). Supabase grants
-- execute to anon and authenticated by default, so take it back.
revoke execute on function get_games_played(text, text) from public, anon, authenticated;
revoke execute on function get_watch_time_by_type(text, text) from public, anon, authenticated;
revoke execute on function get_daily_active_users(text, text) from public, anon, authenticated;
revoke execute on function get_top_games(int, int) from public, anon, authenticated;
revoke execute on function get_session_stats(text, text) from public, anon, authenticated;

-- Index for faster queries
create index idx_analytics_sessions_started_at on analytics_sessions(started_at);
create index idx_analytics_sessions_user_id on analytics_sessions(user_id);
create index idx_analytics_sessions_game_id on analytics_sessions(game_id);
create index idx_analytics_sessions_media_type on analytics_sessions(media_type);

-- Global media flags and the system-managed local plugin/source selections.
create table system_config (
  id text primary key check (id = 'current'),
  revision integer not null check (revision > 0),
  config jsonb not null,
  updated_at timestamptz not null default now()
);

alter table system_config enable row level security;
-- The app reads through the server-side API; only the service role can access this table.

create function save_hooktv_system_config(p_expected_revision integer, p_config jsonb)
returns table(revision integer, config jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row system_config%rowtype;
begin
  if p_expected_revision = 0 then
    insert into system_config (id, revision, config, updated_at)
    values ('current', 1, p_config, now())
    on conflict (id) do nothing
    returning * into saved_row;
  else
    update system_config
      set revision = revision + 1,
          config = p_config,
          updated_at = now()
      where id = 'current' and revision = p_expected_revision
      returning * into saved_row;
  end if;

  if saved_row.id is null then
    return;
  end if;

  return query select saved_row.revision, saved_row.config, saved_row.updated_at;
end;
$$;

revoke all on table system_config from public, anon, authenticated;
revoke execute on function save_hooktv_system_config(integer, jsonb) from public, anon, authenticated;
grant execute on function save_hooktv_system_config(integer, jsonb) to service_role;

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

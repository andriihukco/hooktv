-- Run after migrations: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- Every check raises on failure, so a clean run exits 0.
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local')
on conflict do nothing;

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into profiles (id, user_id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A main');

-- Device limit: two devices allowed, the third is refused.
insert into devices (user_id, device_id) values ('11111111-1111-1111-1111-111111111111', 'd1');
insert into devices (user_id, device_id) values ('11111111-1111-1111-1111-111111111111', 'd2');

do $$
begin
  begin
    insert into devices (user_id, device_id) values ('11111111-1111-1111-1111-111111111111', 'd3');
    raise exception 'FAIL: third device was accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'device_limit' then raise exception 'FAIL: wrong message %', sqlerrm; end if;
  end;
end $$;

-- Re-registering an existing device at the limit must succeed.
insert into devices (user_id, device_id) values ('11111111-1111-1111-1111-111111111111', 'd1')
  on conflict (user_id, device_id) do update set last_seen = now();

-- Act as user B: must not see A's profile or devices.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from profiles) <> 0 then raise exception 'FAIL: B sees A profiles'; end if;
  if (select count(*) from devices) <> 0 then raise exception 'FAIL: B sees A devices'; end if;
end $$;

-- B cannot attach a bookmark to A's profile.
do $$
begin
  begin
    insert into bookmarks (user_id, profile_id, type, card_id, card)
      values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', 'history', '1', '{}');
    raise exception 'FAIL: B wrote to A profile';
  exception when insufficient_privilege then
    null;
  end;
end $$;

rollback;

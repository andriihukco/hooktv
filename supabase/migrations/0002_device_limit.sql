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

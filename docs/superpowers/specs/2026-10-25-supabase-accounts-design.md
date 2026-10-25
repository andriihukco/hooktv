# Supabase Accounts — Design

Date: 2026-10-25
Status: Draft, awaiting review

## Goal

Replace the external CUB account server with our own Supabase project. A user can sign up, sign in on web, mobile and TV, and keep their profiles, favorites ("bookmarks" and views), and watch history in sync across up to two devices. A user can sign out of the current device without affecting their other device.

## Decisions (agreed in brainstorming)

- **Transition:** Supabase replaces CUB completely. No migration of existing CUB users.
- **Sign out:** "Sign out this device" ends the session on the current device only. The other device and the account's profiles stay intact. Its device slot is freed.
- **Client transport:** plain `fetch` against Supabase REST and Auth endpoints. No Supabase JS SDK, because the app runs on old webOS and Tizen browsers.
- **Credentials:** the Supabase URL and anon key come from config. The anon key is public; access control is enforced by row-level security (RLS).

## Current state

The account layer lives in `src/core/account/`:

- `account.js` — init, logoff, public `Account` object (deprecated shims included).
- `api.js` — `load(path, params, post)` calls the CUB server with `token` and `profile` headers. Endpoints used: `users/get`, `profiles/all`, `profiles/create`, `plugins/*`, `notice/all`, `notifications/*`, `person/list`.
- `device.js` — device-code login (`device/add`), used by the TV QR and 6-digit code modal.
- `profile.js` — profile icon, profile selector, profile creation (limit 3, or 8 with premium).
- `bookmarks.js` — `bookmarks/*` endpoints (add, remove, dump, changelog, clear).
- `timeline.js` — `timeline/dump`, `timeline/changelog`.
- `backup.js` — `users/backup/import`.
- `modal.js` — account and premium modals, QR code.
- `permit.js` — `Permit` getters: `account`, `profile`, `token`, `access`, `use`, `sync`.
- `panel.js`, `listener.js`, `timeline.js`, `bookmarks.js` — sync wiring.

The settings UI is `src/templates/settings/account.js`, which shows the sync toggle, login button, account info, logout, and sync and backup actions.

`src/core/manifest.js` resolves the server host through `app_domain`, with `cub_domain` as an alias. Both are removed for account traffic. `Manifest.app_domain` is still used for non-account assets.

## Architecture

```
src/core/supa/
  config.js       URL and anon key, read from Manifest/brand config
  client.js       fetch wrapper: base URL, apikey header, Authorization bearer, JSON, errors
  auth.js         signUp, signIn, signOut, refresh, session storage
  devices.js      device_id, register, list, remove
  profiles.js     list, create, rename, delete, select (uses profiles table)
  sync.js         bookmarks and watch_history push/pull with updated_at cursors
  qr.js           TV sign-in: create sign-in ticket, poll until approved
```

Existing `src/core/account/` is rewritten to call `src/core/supa/` instead of CUB. The public `Account` object and the `Permit` getters keep their names so callers (`Lampa.Account.*`, `Permit.access`) do not change.

## Data model

Migrations live in `supabase/migrations/` and are applied by the user to their Supabase project.

```sql
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
  type text not null,            -- 'history' | 'view' | 'book' | 'like' | 'wath' | ...
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
```

Notes:

- `bookmarks.deleted` is a soft-delete tombstone so a removal on one device reaches the other on its next pull.
- `updated_at` is set by a trigger (`before update` → `now()`), not by the client.

### Row-level security

Enable RLS on all four tables. For each table:

- `select`, `insert`, `update`, `delete` allowed only when `user_id = auth.uid()`.
- `profiles` and `bookmarks` additionally check that `profile_id` belongs to `auth.uid()` on insert and update.

### Device limit

```sql
create function enforce_device_limit() returns trigger as $$
begin
  if (select count(*) from devices where user_id = new.user_id) >= 2 then
    raise exception 'device_limit' using errcode = 'P0001';
  end if;
  return new;
end $$ language plpgsql;

create trigger devices_limit before insert on devices
  for each row execute function enforce_device_limit();
```

The `device_limit` error is returned to the client as a 4xx with the code, so the UI can show the device list. Re-registering an existing `device_id` is an upsert on the same row and does not hit the limit (the trigger runs only on `insert`, and the client uses `on conflict do update`).

Profile limit (3, or 8 with premium) is enforced on the client as today and mirrored by a trigger on `profiles` insert, using the `premium_until` column on a `users` view or table. This is a second migration.

## Auth flows

### Mobile (web on phone)

1. Sidebar shows email and password fields, with "Sign in" and "Create account" actions.
2. Sign up: `POST /auth/v1/signup`. Supabase sends a confirmation email. The UI tells the user to check their inbox.
3. Confirmation link returns to the app origin with a token fragment. `auth.js` reads it, stores the session, and clears the fragment.
4. Sign in: `POST /auth/v1/token?grant_type=password`. On success store `access_token`, `refresh_token`, `expires_at`, `user.id`, `user.email`.
5. Token refresh: `POST /auth/v1/token?grant_type=refresh_token` when `expires_at` is within 60 seconds.
6. Forgot password: `POST /auth/v1/recover`, with the reset link landing on the app origin.

### TV (no keyboard)

1. Sidebar shows a QR code and a short code. The QR opens `https://<app_domain>/signin?ticket=<id>` on a phone.
2. The phone page is a small web form (email + password) that calls the same Supabase Auth endpoint, then writes an approval row for `ticket` to a `signin_tickets` table with the session.
3. The TV polls `GET signin_tickets?id=eq.<id>` every 2 seconds for up to 5 minutes. On approval it stores the session and registers the TV as a device.

`signin_tickets` has RLS that allows anonymous `select` only on a row whose `id` the caller knows, and `update` only by an authenticated user who is approving it. The ticket expires after 5 minutes.

Note: the phone sign-in page is a web page outside the app bundle. Its source is a separate deliverable, listed under Out of scope unless you ask for it here.

## Device identity

- `device_id`: a random UUID generated once and stored in `Storage` under `supa_device_id`. It survives reloads. It is not derived from hardware.
- `name`: `Platform.tv()` → "TV", else browser or OS string. Used only in the device list.
- Register on every successful sign-in and on app start while signed in (upsert `last_seen`).

## Sync

### Pull on start

`sync.pull(profile_id)`:

1. Read `last_pull` for the profile from `Storage` (`supa_cursor_<profile_id>`).
2. `GET bookmarks?profile_id=eq.<id>&updated_at=gt.<cursor>&order=updated_at.asc` and the same for `watch_history`.
3. Apply each row to the local bookmark or timeline store. A row with `deleted=true` removes the local entry.
4. Store the largest `updated_at` seen as the new cursor.

### Push on change

Local writes go to a queue in `Storage` (`supa_queue`). A timer flushes the queue every 5 seconds while online, using `POST /rest/v1/bookmarks?on_conflict=profile_id,type,card_id` with `Prefer: resolution=merge-duplicates`. Failed items stay in the queue with a retry count and stop after 10 attempts with a Noty message.

### Conflicts

Last write wins by `updated_at`. For watch history the larger `time` wins when both sides have the same `updated_at` second. This keeps the furthest-watched position.

### Mapping to existing code

- `bookmarks.js` keeps its local API (`Bookmarks.add/remove/get/all/clear`). Only its network calls change, to `sync.*`.
- `timeline.js` keeps its `Timeline.update` and `Timeline.view` entry points.
- `backup.js` (`users/backup/import`) is removed. Sync covers its purpose.

## Sign out

"Sign out this device":

1. `DELETE devices?device_id=eq.<id>` (uses the current session).
2. `POST /auth/v1/logout` to end this session only (not `scope=global`).
3. Clear `account`, `account_user`, `account_email`, `account_notice`, `account_bookmarks`, `supa_queue` and the cursors.
4. Reload the app to a signed-out state.

If the device row is already gone (removed from another device), step 1 is a no-op and sign-out continues.

## Device limit UI

When sign-in returns `device_limit`, show a list of signed-in devices (`devices?user_id=eq.<uid>`) with name and `last_seen`. The user picks one to sign out. Choosing a device runs `DELETE devices?device_id=eq.<other>`, then the sign-in retries.

## UI (design system)

All account UI lives in the existing settings sidebar (`src/templates/settings/account.js`) and reuses classes already defined in the design system:

- Section titles: `settings-param-title`.
- Fields and actions: `settings-param selector`, `simple-button`.
- Confirmation and sign-in screens: `account-modal-split` (the QR layout already used by `modal.js`), with `account-modal-split--mobile` on phones.
- Status and errors: `Noty.show` with translated text.

Strings are added to `src/lang/en.js` and `src/lang/uk.js`. Other languages fall back to English.

Mobile and TV branches follow the existing `Platform.tv()` check. The sidebar layout and focus handling use the same `Controller` and `selector` pattern as the rest of the settings UI, so TV remote navigation works without new code.

## Error handling

- Network failure during sync: keep the queue, retry with backoff, do not block the UI.
- Expired refresh token: sign out locally and show "Session expired, sign in again".
- `device_limit`: show the device list (see above).
- Email not confirmed: show a resend button (`POST /auth/v1/resend`).
- Wrong password or unknown email: a generic message, to avoid revealing which accounts exist.

## Testing

- **Unit (vitest, `spec/`):** `supa/client` error mapping; `sync` merge rules (last-write-wins, the watch-history tie-break, tombstones); the sign-out cleanup list; the device-limit error mapping.
- **SQL:** RLS checks against a local Supabase instance: a user cannot read or write another user's rows; a third device insert fails; re-registering an existing device succeeds.
- **Browser:** the sidebar in the preview at desktop and mobile widths; sign-up, sign-in, sign-out, and the device-limit screen against a test Supabase project.
- **Manual, outside this environment:** TV sign-in on real webOS and Tizen hardware. I cannot run those here.

## Out of scope

- Migration of CUB users or data.
- Premium billing. The premium flag is read from the database; purchasing is not part of this work.
- The phone sign-in web page, if you want it built here (it is a separate deliverable).
- Social login.

## Open items for review

- The phone sign-in page for TV login: build here, or hosted elsewhere?
- Confirm the `premium_until` source once the premium flag exists in your Supabase project.

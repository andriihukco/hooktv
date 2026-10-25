# Supabase Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CUB account layer with a Supabase-backed account system: email/password sign-up and sign-in on mobile, QR sign-in on TV, profiles, favorites, watch history and sync, a 2-device limit per account, and per-device sign-out.

**Architecture:** A new `src/core/supa/` module talks to Supabase REST and Auth with plain `fetch`. Existing `src/core/account/` modules keep their public names (`Account`, `Permit`, `Bookmarks`, `Timeline`, `Profile`) and switch their network calls to `supa/`. Security is enforced in Postgres by row-level security and a device-limit trigger. Migrations live in `supabase/migrations/`.

**Tech Stack:** Vanilla JS modules bundled by the existing gulp/rollup build, `vitest` for unit tests (`spec/**/*.spec.js`), Supabase Postgres, Supabase Auth, plain `fetch`.

**Spec:** [docs/superpowers/specs/2026-10-25-supabase-accounts-design.md](../specs/2026-10-25-supabase-accounts-design.md)

## Global Constraints

- No Supabase JS SDK. Use `fetch` only (old webOS and Tizen browsers).
- Supabase URL and anon key come from `window.lampa_settings.supabase_url` and `window.lampa_settings.supabase_anon_key`. Never hard-code them.
- Every table has RLS enabled; every policy checks `auth.uid()`.
- Device limit: 2 devices per account. Re-registering an existing `device_id` never counts against the limit.
- Profile limit: 3 profiles, or 8 with premium (same as the current `profile.js`).
- Session refresh starts when `expires_at` is within 60 seconds.
- TV sign-in ticket: expires after 5 minutes; the TV polls every 2 seconds.
- Sync queue: retry each failed item; drop it after 10 attempts and show a Noty message.
- Last write wins by `updated_at`. Watch history breaks an `updated_at` tie by the larger `time`.
- Bookmark removals are soft deletes (`deleted = true`) so other devices receive them.
- Strings are added to `src/lang/en.js` and `src/lang/uk.js`. Other languages fall back to English.
- Reuse the design-system classes already in the settings UI (`settings-param`, `settings-param-title`, `simple-button`, `account-modal-split`).
- Commit steps are written as the normal workflow, but run them only when the user has asked for commits.

## Review Focus

- **Offline token refresh.** The refresh call fails because the device is offline. The user stays signed in and sync resumes when the network returns; the session is not dropped. Pinned in Task 3.
- **Re-registering the same device at the limit.** Two devices are signed in and the first one signs in again (for example after an app restart). It must succeed, not show `device_limit`. Pinned in Task 4.
- **Deleted on one device, edited on the other.** A bookmark is removed on device A while device B edits it offline. A later pull must not resurrect or duplicate it incorrectly. Pinned in Task 6.
- **TV ticket expires before approval.** The phone approves after 5 minutes. The TV must stop polling and offer a new QR code instead of hanging. Pinned in Task 8.
- **Unconfirmed email tries to sign in.** Supabase rejects the password grant until the email is confirmed. The user sees a "confirm your email" message with a resend action, not a generic error. Pinned in Task 3.

---

### Task 1: Database schema, RLS and device limit

**Files:**
- Create: `supabase/migrations/0001_accounts.sql`
- Create: `supabase/migrations/0002_device_limit.sql`
- Create: `supabase/migrations/0003_signin_tickets.sql`
- Create: `supabase/tests/rls.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: tables `profiles`, `devices`, `bookmarks`, `watch_history`, `signin_tickets`; trigger `devices_limit` raising `device_limit` (SQLSTATE `P0001`).

- [ ] **Step 1: Write the failing SQL test**

`supabase/tests/rls.sql` runs as two authenticated users (A and B) and asserts:

```sql
-- user A cannot select user B's profile
select set_config('request.jwt.claims', '{"sub":"<user_a>"}', true);
select count(*) = 0 as ok from profiles where user_id = '<user_b>';

-- third device insert for user A raises device_limit
insert into devices (user_id, device_id) values ('<user_a>', 'd1');
insert into devices (user_id, device_id) values ('<user_a>', 'd2');
insert into devices (user_id, device_id) values ('<user_a>', 'd3'); -- expect error device_limit

-- re-registering d1 succeeds
insert into devices (user_id, device_id) values ('<user_a>', 'd1')
  on conflict (user_id, device_id) do update set last_seen = now();
```

- [ ] **Step 2: Run it to see it fail**

Run: `supabase db reset && psql "$SUPABASE_DB_URL" -f supabase/tests/rls.sql`
Expected: FAIL, because the tables do not exist yet.

- [ ] **Step 3: Write the migrations**

- `0001_accounts.sql`: create `profiles`, `devices`, `bookmarks`, `watch_history` exactly as in the spec's "Data model" section. Add a `before update` trigger on `bookmarks` and `watch_history` that sets `updated_at = now()`. Enable RLS and add select/insert/update/delete policies on each table: allowed only when `user_id = auth.uid()`, and for `profiles`, `bookmarks` and `watch_history` also require `profile_id` to belong to `auth.uid()` on insert and update.
- `0002_device_limit.sql`: the `enforce_device_limit()` function and `devices_limit` trigger exactly as in the spec. Raise `device_limit` when `count(*) >= 2` for the user.
- `0003_signin_tickets.sql`: `signin_tickets (id uuid primary key default gen_random_uuid(), session jsonb, created_at timestamptz default now(), expires_at timestamptz default now() + interval '5 minutes')`. RLS: anonymous `select` only on a row whose `id` the caller knows; `update` only by an authenticated user, and only to set `session` on a row that has not expired.

- [ ] **Step 4: Run the test to verify it passes**

Run: `supabase db reset && psql "$SUPABASE_DB_URL" -f supabase/tests/rls.sql`
Expected: `ok` for both assertions; the third device insert returns `device_limit`; the re-register succeeds.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add supabase
git commit -m "feat: add Supabase schema, RLS and device limit"
```

---

### Task 2: HTTP client and config

**Files:**
- Create: `src/core/supa/config.js`
- Create: `src/core/supa/client.js`
- Test: `spec/supa_client.spec.js`

**Interfaces:**
- Consumes: `window.lampa_settings.supabase_url`, `window.lampa_settings.supabase_anon_key`.
- Produces:
  - `config.js` default export `{ url(): string, anonKey(): string }`.
  - `client.js` default export `request(path, opts): Promise<any>`, where `opts = { method?: 'GET'|'POST'|'PATCH'|'DELETE', query?: object, body?: any, token?: string, headers?: object }`. On a non-2xx response it rejects with `{ status: number, code: string, message: string }`. `code` is the server's `error_code`, `error` or `msg` field when present, otherwise `'http_' + status`. The server's `device_limit` message maps to `code = 'device_limit'`.

- [ ] **Step 1: Write the failing tests**

```js
import {expect, test, vi, beforeEach} from 'vitest'
import client from '../src/core/supa/client.js'

beforeEach(() => {
    globalThis.window = {lampa_settings: {supabase_url: 'https://x.supabase.co', supabase_anon_key: 'anon'}}
})

test('builds URL with query and sends apikey and bearer token', async () => {
    const fetch = vi.fn(async () => ({ok: true, status: 200, json: async () => ([])}))
    globalThis.fetch = fetch
    await client('bookmarks', {query: {profile_id: 'eq.p1'}, token: 't1'})
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://x.supabase.co/rest/v1/bookmarks?profile_id=eq.p1')
    expect(init.headers.apikey).toBe('anon')
    expect(init.headers.Authorization).toBe('Bearer t1')
})

test('maps a device_limit error to code device_limit', async () => {
    globalThis.fetch = vi.fn(async () => ({ok: false, status: 400, json: async () => ({message: 'device_limit'})}))
    await expect(client('devices', {method: 'POST', body: {}})).rejects.toMatchObject({code: 'device_limit', status: 400})
})

test('falls back to http_<status> when the body has no code', async () => {
    globalThis.fetch = vi.fn(async () => ({ok: false, status: 503, json: async () => ({})}))
    await expect(client('x')).rejects.toMatchObject({code: 'http_503'})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run spec/supa_client.spec.js`
Expected: FAIL with "Cannot find module '../src/core/supa/client.js'".

- [ ] **Step 3: Implement `config.js` and `client.js`**

`client.js` builds the URL from `config.url()` plus `/rest/v1/` for paths that are table names, or `/auth/v1/` when the path starts with `auth/`. Serialise `query` with `URLSearchParams`. Set `apikey` and `Content-Type: application/json`. Add `Authorization: Bearer <token>` when `token` is given, otherwise use the anon key. Send `JSON.stringify(body)` when present. Parse JSON; on a non-2xx response reject with the mapped error object from the Interfaces block.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run spec/supa_client.spec.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa spec/supa_client.spec.js
git commit -m "feat: add Supabase HTTP client"
```

---

### Task 3: Auth (sign up, sign in, refresh, sign out, session)

**Files:**
- Create: `src/core/supa/auth.js`
- Test: `spec/supa_auth.spec.js`

**Interfaces:**
- Consumes: `client.js` default export `request(path, opts)`; `Storage` from `src/core/storage/storage.js` (`Storage.get(name, empty)`, `Storage.set(name, value, nolisten)`).
- Produces (default export):
  - `signUp(email, password): Promise<{confirmed: boolean}>`
  - `signIn(email, password): Promise<Session>`
  - `resend(email): Promise<void>`
  - `refresh(): Promise<Session|null>`
  - `session(): Session|null`
  - `save(session): void` (writes the `account` object the rest of the app reads, with `token = access_token`, `email`, and `profile` preserved)
  - `clear(): void`
  - `isExpiring(session): boolean` (true when `expires_at * 1000 - Date.now() < 60000`)
  - `Session = { token, refresh_token, expires_at, user_id, email }`

- [ ] **Step 1: Write the failing tests**

```js
import {expect, test, vi, beforeEach} from 'vitest'
let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))
let calls = []
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (path, opts) => { calls.push([path, opts]); return mock.next(path) })}))
let mock = {next: () => ({})}
import Auth from '../src/core/supa/auth.js'

beforeEach(() => { saved = {}; calls = [] })

test('isExpiring is true within 60 seconds of expiry', () => {
    expect(Auth.isExpiring({expires_at: Math.floor(Date.now()/1000) + 30})).toBe(true)
    expect(Auth.isExpiring({expires_at: Math.floor(Date.now()/1000) + 3600})).toBe(false)
})

test('signIn with an unconfirmed email rejects with code email_not_confirmed', async () => {
    mock.next = () => { throw {status: 400, code: 'email_not_confirmed'} }
    await expect(Auth.signIn('a@b.c', 'pw')).rejects.toMatchObject({code: 'email_not_confirmed'})
})

test('refresh keeps the session when the network is down', async () => {
    saved.account = JSON.stringify({token: 't', refresh_token: 'r', expires_at: 1, user_id: 'u', email: 'a@b.c'})
    mock.next = () => { throw {status: 0, code: 'network'} }
    const s = await Auth.refresh()
    expect(s).not.toBeNull()
    expect(JSON.parse(saved.account).token).toBe('t')
})

test('clear removes the account object', () => {
    saved.account = '{"token":"t"}'
    Auth.clear()
    expect(Auth.session()).toBeNull()
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run spec/supa_auth.spec.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `auth.js`**

- `signIn` calls `request('auth/v1/token?grant_type=password', {method:'POST', body:{email, password}})`, then builds a Session from the response (`access_token`, `refresh_token`, `expires_at`, `user.id`, `user.email`) and calls `save`.
- `refresh` only proceeds when a stored session has a `refresh_token`. On `network` errors (`status 0`) it returns the stored session unchanged. On an auth error (400 or 401 with an invalid refresh token) it calls `clear()` and returns `null`.
- `signUp` posts to `auth/v1/signup`. Map a missing confirmation to `{confirmed: false}`.
- `save` and `clear` read and write the `account` key via `Storage` (`Storage.set('account', obj, true)`), keeping the existing `profile` field so `Permit.profile` still works.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run spec/supa_auth.spec.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa/auth.js spec/supa_auth.spec.js
git commit -m "feat: add Supabase auth module"
```

---

### Task 4: Devices (identity, register, list, remove)

**Files:**
- Create: `src/core/supa/devices.js`
- Test: `spec/supa_devices.spec.js`

**Interfaces:**
- Consumes: `client.js` `request`; `auth.js` `session()`; `Storage`.
- Produces (default export):
  - `deviceId(): string` (creates a UUID once, stored under `supa_device_id`)
  - `deviceName(): string` (`'TV'` on TV platforms, otherwise `navigator.userAgent` trimmed to 60 characters)
  - `register(): Promise<void>` (upsert on `(user_id, device_id)`; rejects with `{code:'device_limit'}` when the trigger fires)
  - `list(): Promise<Array<{device_id, name, last_seen}>>`
  - `remove(device_id): Promise<void>`

- [ ] **Step 1: Write the failing tests**

```js
import {expect, test, vi, beforeEach} from 'vitest'
let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))
let next
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (path, opts) => next(path, opts))}))
vi.mock('../src/core/supa/auth.js', () => ({default: {session: () => ({user_id: 'u1', token: 't'})}}))
import Devices from '../src/core/supa/devices.js'

beforeEach(() => { saved = {} })

test('deviceId is created once and reused', () => {
    const a = Devices.deviceId()
    expect(Devices.deviceId()).toBe(a)
})

test('register on an existing device does not raise device_limit', async () => {
    next = async () => ([{device_id: 'd1'}])
    await expect(Devices.register()).resolves.toBeUndefined()
})

test('register surfaces device_limit from the trigger', async () => {
    next = async () => { throw {status: 400, code: 'device_limit'} }
    await expect(Devices.register()).rejects.toMatchObject({code: 'device_limit'})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run spec/supa_devices.spec.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `devices.js`**

`register` posts to `devices` with `Prefer: resolution=merge-duplicates` and `on_conflict=user_id,device_id`, body `{user_id, device_id, name, last_seen}`. `remove` sends `DELETE devices?device_id=eq.<id>` and resolves even when no row matched.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run spec/supa_devices.spec.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa/devices.js spec/supa_devices.spec.js
git commit -m "feat: add device identity and limit handling"
```

---

### Task 5: Profiles

**Files:**
- Create: `src/core/supa/profiles.js`
- Test: `spec/supa_profiles.spec.js`

**Interfaces:**
- Consumes: `client.js` `request`; `auth.js` `session()`; `Permit` (`src/core/account/permit.js`) for the premium state only through the argument below, to keep the module free of UI.
- Produces (default export):
  - `list(): Promise<Profile[]>`
  - `create(name, premium): Promise<Profile>` (rejects with `{code:'profile_limit'}` when `count >= limit(premium)`)
  - `rename(id, name): Promise<void>`
  - `remove(id): Promise<void>`
  - `limit(premium: boolean): number` (3 or 8)
  - `Profile = { id, user_id, name, icon, child, age, main }`

- [ ] **Step 1: Write the failing tests**

```js
import {expect, test, vi} from 'vitest'
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async () => [])}))
vi.mock('../src/core/supa/auth.js', () => ({default: {session: () => ({user_id: 'u1', token: 't'})}}))
import Profiles from '../src/core/supa/profiles.js'

test('limit is 3 without premium and 8 with premium', () => {
    expect(Profiles.limit(false)).toBe(3)
    expect(Profiles.limit(true)).toBe(8)
})

test('create rejects with profile_limit when the list is full', async () => {
    const client = (await import('../src/core/supa/client.js')).default
    client.mockResolvedValueOnce([{id:1},{id:2},{id:3}])
    await expect(Profiles.create('Kid', false)).rejects.toMatchObject({code: 'profile_limit'})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run spec/supa_profiles.spec.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `profiles.js`**

`create` first calls `list()` and compares the length with `limit(premium)`, then posts to `profiles` with `{user_id, name}`. The main profile is created on sign-up by a database default or by this module when `list()` is empty (`main: true`).

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run spec/supa_profiles.spec.js`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa/profiles.js spec/supa_profiles.spec.js
git commit -m "feat: add Supabase profiles"
```

---

### Task 6: Sync (merge rules, queue, pull and push)

**Files:**
- Create: `src/core/supa/sync.js`
- Test: `spec/supa_sync.spec.js`

**Interfaces:**
- Consumes: `client.js` `request`; `auth.js` `session()`; `Storage`.
- Produces (default export):
  - `mergeRow(local, remote): row` (pure; the rule below)
  - `enqueue(table, op): void` (`op` is `{type:'upsert'|'delete', row, tries: 0}`, persisted under `supa_queue`)
  - `flush(): Promise<void>` (sends queued items in order; increments `tries` on failure; drops an item at `tries >= 10` and calls `Noty.show` with `Lang.translate('account_sync_failed')`)
  - `pull(profile_id): Promise<void>` (reads and writes the cursor under `supa_cursor_<profile_id>`, applies rows through `mergeRow`)

**`mergeRow` rule (pure, tested exactly):**
1. If `local` is missing, return `remote`.
2. If `remote` is missing, return `local`.
3. If `remote.updated_at > local.updated_at`, return `remote`. If `local.updated_at > remote.updated_at`, return `local`.
4. On an exact tie: for `watch_history` rows return the one with the larger `time`; for others return `local`.
5. A row with `deleted === true` on the winning side stays a tombstone (`deleted: true`) and is removed from the local store by the caller.

- [ ] **Step 1: Write the failing tests**

```js
import {expect, test, vi, beforeEach} from 'vitest'
let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async () => [])}))
vi.mock('../src/core/supa/auth.js', () => ({default: {session: () => ({user_id: 'u1', token: 't'})}}))
import Sync from '../src/core/supa/sync.js'

beforeEach(() => { saved = {} })

test('newer remote wins', () => {
    const r = Sync.mergeRow({updated_at: 1, x: 'old'}, {updated_at: 2, x: 'new'})
    expect(r.x).toBe('new')
})

test('removal on one device beats an offline edit with an older timestamp', () => {
    const r = Sync.mergeRow({updated_at: 5, x: 'edit'}, {updated_at: 7, deleted: true})
    expect(r.deleted).toBe(true)
})

test('watch_history tie keeps the larger time', () => {
    const r = Sync.mergeRow({updated_at: 3, time: 100}, {updated_at: 3, time: 250})
    expect(r.time).toBe(250)
})

test('queue drops an item after 10 failed attempts', async () => {
    const client = (await import('../src/core/supa/client.js')).default
    client.mockRejectedValue({status: 500, code: 'http_500'})
    Sync.enqueue('bookmarks', {type: 'upsert', row: {card_id: '1'}, tries: 9})
    await Sync.flush()
    expect(JSON.parse(saved.supa_queue || '[]')).toHaveLength(0)
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run spec/supa_sync.spec.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `sync.js`**

`pull` queries `bookmarks` and `watch_history` with `updated_at=gt.<cursor>&order=updated_at.asc`, applies each row with `mergeRow`, and stores the largest `updated_at` as the new cursor. `flush` sends `bookmarks` upserts with `on_conflict=profile_id,type,card_id` and `Prefer: resolution=merge-duplicates`, and `watch_history` upserts with `on_conflict=profile_id,card_id,season,episode`. Hand the applied rows to the callers in `bookmarks.js` and `timeline.js` through the existing `Bookmarks.push` and `Timeline` update paths (no new public functions there).

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run spec/supa_sync.spec.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa/sync.js spec/supa_sync.spec.js
git commit -m "feat: add Supabase sync with merge rules and queue"
```

---

### Task 7: Rewire `src/core/account/` to Supabase

**Files:**
- Modify: `src/core/account/api.js` (the `load()` function and the `user`, `persons`, `plugins` helpers that call CUB)
- Modify: `src/core/account/account.js` (`init`, `logoff`)
- Modify: `src/core/account/bookmarks.js` (network calls at `bookmarks/*` lines only; local API unchanged)
- Modify: `src/core/account/timeline.js` (network calls at `timeline/*` lines only)
- Modify: `src/core/account/profile.js` (`check`, `select`, profile creation)
- Modify: `src/core/account/permit.js` (no logic change; add nothing)
- Delete: `src/core/account/backup.js`, `src/core/account/device.js`, `src/core/account/modal.js` (replaced in Task 8)
- Test: `spec/account_rewire.spec.js`

**Interfaces:**
- Consumes: `supa/auth`, `supa/devices`, `supa/profiles`, `supa/sync` (Interfaces from Tasks 3 to 6).
- Produces: unchanged public `Account` surface. `Account.Api.load(path, params, post)` now resolves Supabase responses. `Account.logoff(data)` is kept but calls `supa/auth.clear()` and `supa/devices.remove()`.

- [ ] **Step 1: Write the failing test**

```js
import {expect, test} from 'vitest'
import fs from 'node:fs'
test('no CUB account endpoints remain in src/core/account', () => {
    const files = ['api.js','account.js','bookmarks.js','timeline.js','profile.js'].map(f => fs.readFileSync('src/core/account/' + f, 'utf8'))
    for (const src of files) {
        expect(src).not.toMatch(/Api\.load\('(bookmarks|timeline|profiles|users|device)\//)
    }
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run spec/account_rewire.spec.js`
Expected: FAIL, the old endpoints still match.

- [ ] **Step 3: Rewire the modules**

- `api.js` `load()`: replace the CUB request with `supa/client` calls, keeping its `Promise` shape. Keep the `Permit.access` check.
- `bookmarks.js`: replace the `bookmarks/add|remove|dump|changelog|clear` calls with `supa/sync` calls. Keep `Bookmarks.add/remove/get/all/clear` unchanged.
- `timeline.js`: replace `timeline/dump` and `timeline/changelog` with `supa/sync.pull` for the active profile.
- `profile.js`: replace `profiles/all` and `profiles/create` with `supa/profiles.list` and `supa/profiles.create`. Keep the icon, selector and limit UI.
- `account.js`: `init` calls `supa/auth.refresh()` and `supa/devices.register()`. `logoff` calls `supa/devices.remove(deviceId())`, `supa/auth.clear()`, then reloads.
- Delete `backup.js`, `device.js`, `modal.js`. Remove their imports from `account.js` and `panel.js`. Task 8 creates the replacement UI.

- [ ] **Step 4: Run the test and the full suite**

Run: `npx vitest run`
Expected: PASS for `account_rewire.spec.js` and every existing `spec/*.spec.js`. The existing `tastes*` and `storage_usage` specs must still pass.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add -A src/core/account spec/account_rewire.spec.js
git commit -m "refactor: route account layer through Supabase"
```

---

### Task 8: Sidebar sign-in and sign-up UI (mobile email, TV QR)

**Files:**
- Create: `src/core/supa/qr.js`
- Modify: `src/templates/settings/account.js` (sign-in and sign-up fields, QR block, device-limit block)
- Modify: `src/core/account/modal.js` is deleted in Task 7; its settings hook (`Settings.listener.follow('open')` for `name == 'account'`, currently in `src/core/account/device.js`) moves into the new Task 8 code in `src/core/supa/qr.js` and the settings template
- Modify: `src/lang/en.js`, `src/lang/uk.js` (new `account_*` keys)
- Test: `spec/supa_qr.spec.js`

**Interfaces:**
- Consumes: `auth.js` `signIn`, `signUp`, `resend`; `devices.js` `list`, `remove`, `register`; `Platform.tv()`; `Utils.qrcode`.
- Produces (`qr.js` default export):
  - `createTicket(): Promise<{id: string, expires_at: number}>`
  - `poll(id, onApproved: (session)=>void, onExpired: ()=>void): {stop(): void}` (polls `signin_tickets` every 2000 ms; calls `onExpired` after 5 minutes)
  - `approve(id, session): Promise<void>` (used by the phone sign-in page; PATCHes the ticket with the session)

- [ ] **Step 1: Write the failing test**

```js
import {expect, test, vi} from 'vitest'
let next
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (p, o) => next(p, o))}))
import QR from '../src/core/supa/qr.js'

test('poll stops and reports expiry after 5 minutes', () => {
    vi.useFakeTimers()
    next = async () => []
    let expired = false
    const p = QR.poll('t1', ()=>{}, ()=>{ expired = true })
    vi.advanceTimersByTime(5 * 60 * 1000 + 2000)
    expect(expired).toBe(true)
    p.stop()
    vi.useRealTimers()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run spec/supa_qr.spec.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement and wire the UI**

- `qr.js`: `createTicket` inserts into `signin_tickets` and returns the row. `poll` runs `GET signin_tickets?id=eq.<id>` every 2000 ms and stops on a row with `session` set (calls `onApproved`) or after 5 minutes (calls `onExpired`).
- Settings template (`src/templates/settings/account.js`): replace the device-code block with two blocks. On mobile: email and password fields, a "Sign in" button and a "Create account" button, with a "Resend confirmation" link after an `email_not_confirmed` error. On TV: a QR code (`Utils.qrcode` with the `signin` URL that includes the ticket id) and a "Get a new code" action after expiry.
- Device-limit block: when `register` or `signIn` rejects with `device_limit`, list devices from `devices.list()` and let the user remove one, then retry.
- Strings: add the new `account_*` keys to `src/lang/en.js` and `src/lang/uk.js`, reusing existing classes.

- [ ] **Step 4: Run the test**

Run: `npx vitest run spec/supa_qr.spec.js`
Expected: PASS.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa/qr.js src/templates/settings/account.js src/lang spec/supa_qr.spec.js
git commit -m "feat: add sidebar sign-in and sign-up with TV QR"
```

---

### Task 9: Sign out this device

**Files:**
- Modify: `src/core/account/account.js` (`logoff`)
- Modify: `src/templates/settings/account.js` (the sign-out row)
- Test: `spec/supa_signout.spec.js`

**Interfaces:**
- Consumes: `devices.remove(device_id)`, `devices.deviceId()`, `auth.clear()`.
- Produces: `signOutThisDevice(): Promise<void>`. It removes this device's row (a no-op if it is already gone), calls `POST auth/v1/logout` for this session only, clears local storage keys `account`, `account_user`, `account_email`, `account_notice`, `account_bookmarks`, `supa_queue` and every `supa_cursor_*` key, then reloads.

- [ ] **Step 1: Write the failing test**

```js
import {expect, test, vi, beforeEach} from 'vitest'
let saved = {}, calls = []
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (p, o) => { calls.push([p, o && o.method]); return {} })}))
vi.mock('../src/core/supa/devices.js', () => ({default: {deviceId: ()=>'d1', remove: async ()=>{ calls.push(['devices.remove']) }}}))
import {signOutThisDevice} from '../src/core/supa/signout.js'

beforeEach(() => { saved = {account: '{"token":"t"}', supa_cursor_p1: '5', supa_queue: '[]'}; calls = [] })

test('sign out removes this device, ends the session and clears local state', async () => {
    await signOutThisDevice()
    expect(calls.map(c=>c[0])).toEqual(['devices.remove', 'auth/v1/logout'])
    expect(saved.account).toBe('')
    expect(saved.supa_cursor_p1).toBeUndefined()
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run spec/supa_signout.spec.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/core/supa/signout.js` and wire it**

Implement `signOutThisDevice` with the order above. Make the `devices.remove` step tolerant of errors so sign-out always completes. Point the profile menu's sign-out action and `account.js` `logoff` at this function. Remove the old `Storage.set(..., '')` calls for CUB-only keys (`account_bookmarks` stays only if still read by `bookmarks.js`).

- [ ] **Step 4: Run the test**

Run: `npx vitest run spec/supa_signout.spec.js`
Expected: PASS.

- [ ] **Step 5: Commit** (only when the user asks for commits)

```bash
git add src/core/supa/signout.js src/core/account/account.js src/templates/settings/account.js spec/supa_signout.spec.js
git commit -m "feat: sign out this device only"
```

---

### Task 10: Config keys, cleanup and browser verification

**Files:**
- Modify: `src/core/brand.js` (add `supabase_url` and `supabase_anon_key` to the brand config, set from the environment at build time)
- Modify: `src/core/manifest.js` (leave `app_domain` for non-account assets; nothing account-related points there)
- Modify: `src/app.js` (`account_use` default follows the presence of `supabase_url`)
- Test: `npx vitest run` (full suite) and a browser check

**Interfaces:**
- Consumes: `window.lampa_settings.supabase_url`, `window.lampa_settings.supabase_anon_key`.
- Produces: account features enabled only when both keys are set.

- [ ] **Step 1: Write the failing test**

```js
import {expect, test} from 'vitest'
import fs from 'node:fs'
test('account flag is off when Supabase is not configured', () => {
    const src = fs.readFileSync('src/app.js', 'utf8')
    expect(src).toMatch(/account_use\s*[:=][^\n]*supabase_url/)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run spec/account_config.spec.js`
Expected: FAIL.

- [ ] **Step 3: Implement the config and clean up**

Set the two keys in `brand.js` from build-time environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Make `account_use` true only when `supabase_url` is set. Remove dead references to CUB account endpoints.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: every spec passes.

- [ ] **Step 5: Verify in the browser**

Run: `preview_start` with the `web` launch configuration, then:
1. Desktop width: open Settings → Account. Sign-up and sign-in fields render with the design-system classes. Check the layout with a screenshot.
2. Mobile width (375 × 812): the same panel fits with a 16 px gutter and no horizontal scroll.
3. With a test Supabase project: sign up, confirm by email, sign in, add a bookmark, see it sync on a second browser profile, sign out on one device, and confirm the other device stays signed in.
4. Attempt a third device sign-in and confirm the device list appears.

Expected: each step shows the outcome described. Report any step that could not be run.

- [ ] **Step 6: Commit** (only when the user asks for commits)

```bash
git add src/core/brand.js src/core/manifest.js src/app.js spec/account_config.spec.js
git commit -m "chore: configure Supabase and remove CUB account config"
```

---

## Self-Review Notes

- **Spec coverage:** data model, RLS and device limit (Task 1); auth flows (Task 3 and 8); device identity and limit (Task 4); profiles and limits (Task 5); sync, merge rules and queue (Task 6); mapping onto existing `bookmarks`/`timeline`/`profile` code (Task 7); sign-out per device (Task 9); design-system UI and strings (Task 8); config and browser verification (Task 10). Out-of-scope items (CUB migration, premium billing, the phone sign-in web page, social login) have no tasks, as the spec requires.
- **Open items from the spec:** the TV sign-in page is not built in any task (listed as out of scope unless you ask). `premium_until` is read only through the `premium` argument of `profiles.limit`, so no task depends on the premium source.
- **Type consistency:** `Session`, `Profile` and error objects `{status, code, message}` are used the same way in Tasks 2 to 9. `signOutThisDevice` is named once (Task 9).
- **Note:** the old `src/core/account/device.js` and `modal.js` are removed in Task 7 and replaced in Task 8. Task 7's tests will fail until Task 8 lands if the settings template still imports them; run Task 7 and Task 8 together.

---

Execution handoff follows in chat.

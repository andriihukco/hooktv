# HOOK TV plugin system

HOOK TV now has a local plugin catalog, launch-time system configuration, online provider controls and an authenticated admin page. Third-party URLs are audit records only; the app does not install or execute them automatically.

## Admin panel

Open `/admin/plugins.html` on the deployed HOOK TV host. The panel requires the existing admin login and the new `system_config` Supabase migration.

It manages:

- **Installed plugins:** the 19 local bundles registered in `config/plugin-catalog.json`. Bundles with media dependencies cannot be enabled while their required feature is off.
- **Online sources:** the 59 providers in `config/online-sources.json`. These global switches combine with each device's source preferences.
- **System flags:** movies, series, live TV, music, games, videos, online sources and plugin loading.
- **Third-party audit:** all 24 registered public URLs, their latest fetch/syntax status, observed functionality and redistribution decision.

Changes are saved with a revision check. Devices fetch the public config at startup, cache the last valid response and apply saved changes on their next launch or reload. If no config row exists, the checked-in defaults are used. A failed read uses the device's last valid cached config; a first-launch failure uses safe checked-in defaults.

### Deploy requirements

1. Apply [`0007_system_config.sql`](../../supabase/migrations/0007_system_config.sql) to Supabase.
2. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `ADMIN_PASSWORD` in the Vercel environment. The admin session uses an HttpOnly, Secure, SameSite cookie and requires HTTPS.
3. Build and deploy the web app. The normal web build now bundles plugins before copying the plugin output.

The admin login already uses `agent_snapshots` to store failed-login lockout state. The system config API uses the service role only; there are no anon/authenticated table policies. The save RPC uses revision compare-and-swap so concurrent admin edits cannot silently overwrite one another.

## Build and test

```bash
npm install
npx gulp pack_plugins
npm test
node scripts/plugins-audit.mjs
npm run plugins:catalog
```

`plugins:catalog` regenerates `config/online-sources.json` from the source catalog. `plugins-audit.mjs` fetches sources as data, checks HTTP status/content type, compiles with `vm.Script` without executing them, and writes `docs/plugins/audit-results.json`.

## Plugin layout

The current Gulp build discovers one-level plugin folders and bundles `<folder>/<folder>.js` to `dest/<folder>/<folder>.js`, then copies those bundles to `build/web/plugins/<folder>.js`. To fit that build, plugins use flat folders such as `plugins/hooktv_core/`; `category` in the registry is the ecosystem grouping (`core`, `online`, `catalog`, `parsers`, `utilities`, `community`, `integrations`).

Configuration and manifests are separate:

- [`config/plugin-catalog.json`](../../config/plugin-catalog.json): all local bundles, descriptions, defaults and feature dependencies.
- [`config/hooktv-system.json`](../../config/hooktv-system.json): default feature switches, plugin switches and provider overrides.
- [`plugins/registry.json`](../../plugins/registry.json): shipped HOOK TV manifests and excluded third-party records.
- [`src/core/system.js`](../../src/core/system.js): app menu-to-feature mapping.
- [`api/_system-config.js`](../../api/_system-config.js): server validation and public/admin data projections.

## Adding a HOOK TV plugin

1. Add `plugins/hooktv_<name>/hooktv_<name>.js` and use `window.HookTV.registry.register()` with a `hooktv_` id, semver, known category and licence.
2. Start at `window.appready` or the Lampa `app/ready` event, and guard duplicate initialization.
3. Add the bundle to `config/plugin-catalog.json`, `config/hooktv-system.json`, the runtime allowlist in `src/core/plugins.js`, the bootstrap defaults in `public/js/hooktv-system.js`, and `plugins/registry.json`.
4. Use the shared `HookTV.safe`, config and report helpers. Add strings through `Lampa.Lang.add` for `ru`, `uk`, `be` and `en`.
5. Add tests for its manifest, event lifecycle and primary interaction. Preserve third-party attribution when the relevant licence permits redistribution.

All plugin code stays at or below 400 lines per repository conventions. User-supplied plugin URLs remain separately controlled by the existing `plugins_use` setting and are also disabled by the global `plugins` flag.

## Included HOOK TV plugins

| Plugin | Version | Category | Purpose | Default |
|---|---:|---|---|---|
| `hooktv_core` | 1.0.0 | core | Shared manifest registry, config wrapper and error guard | on |
| `hooktv_registry` | 1.0.0 | utilities | Shows registered HOOK TV plugins in Lampa settings | on |

See [`AUDIT.md`](AUDIT.md) for source coverage, licensing, compatibility and verification limits.

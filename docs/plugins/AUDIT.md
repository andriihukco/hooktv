# HOOK TV source audit and compatibility report

Audit run: **2026-11-13**. The input registry [`sources.json`](sources.json) contains 24 URLs: the 23 supplied plugin URLs plus the Lampame BO loader that the app previously fetched transitively. Full per-source scan output is in [`audit-results.json`](audit-results.json); feature, preference, lifecycle, dependency and feasibility notes are in [`functionality.json`](functionality.json).

## Audit method and status

`node scripts/plugins-audit.mjs` fetches each URL with redirects and one retry, records HTTP status, content type, byte size and a short SHA-256 fingerprint, rejects HTML/error pages, and compiles the response with `vm.Script`. It scans text for Lampa APIs, UI calls, lifecycle events, storage keys, try/catch and error-callback signals, external script execution signals, hosts, licence markers and obfuscation. **It never executes any downloaded code.**

| Result | Count |
|---|---:|
| URLs in registry | 24 |
| HTTP 200 and syntactically valid JavaScript | 24 |
| Plain HTTP URLs | 4 |
| HTTPS URLs | 20 |
| Bundled third-party plugins | 0 |

Every source returned HTTP 200 and compiled during this run. This confirms availability and syntax only. It does not prove Lampa initialization, UI, search, playback, service authorization, compatibility or safety. In particular, the four HTTP sources can be blocked as mixed content and modified in transit. Online Mod changed size during the audit session, so its fingerprint and byte count are time-specific.

## Source-by-source summary

| # | Source | HTTP / bytes | Observed functionality and dependencies | Licence / implementation decision |
|---:|---|---|---|---|
| 1 | SkazTV Store | 200 / 2,783 | Store/extension catalogue; fetches or installs additional remote code. | No plugin-code licence found; excluded. Use a reviewed, pinned first-party catalogue if needed. |
| 2 | Wtch Online | 200 / 283,308 | Showy-family video search and playback; `showypro.com`, raw IP and QR host; two script-loading indicators. | No licence; plain HTTP; excluded and the known risky hosts remain on the app block list. |
| 3 | Showy Online | 200 / 307,380 | Showy PRO search/playback; shares the raw IP and service family with Wtch; two script-loading indicators. | No licence; plain HTTP and overlapping behavior; excluded. |
| 4 | Lumio | 200 / 599,419 | Online and VIP providers; Mitsu, GidOnline and other media hosts; two script-loading indicators. | No plugin licence. MIT notice applies to an embedded QR library only; excluded. |
| 5 | FX Store | 200 / 75,670 | Store plus Filmix-oriented online integration; Filmix and CORS endpoints. | No licence; excluded. |
| 6 | Z01 Online | 200 / 231,196 | Online search, playback, account and payment-related endpoints; two script-loading indicators. | No licence; plain HTTP. Existing app blacklist documents server-supplied eval/account-ID concerns; excluded. |
| 7 | Kilkams Redirect | 200 / 8,078 | Settings/keypad flow changes the Lampa server address and related storage. | No licence. Original redirect settings not implemented because supported hosts and account migration behavior are unknown. |
| 8 | Syvyj Studios | 200 / 27,181 | Studio filmographies using TMDB catalogue navigation. | No plugin licence; the app already has a TMDB studios carousel and company-filmography route, so no duplicate plugin was added. |
| 9 | BWA Online | 200 / 792,482 | Large online-provider bundle; 39,539 `_0x...` identifiers prevent reliable static review. | No licence; excluded and no longer loaded unconditionally. |
| 10 | Aartzz Films | 200 / 67,431 | Ukrainian online search/playback using TMDB identifiers; personal-domain provider. | No licence; excluded until an authorized provider API is documented. |
| 11 | L-Vid Online | 200 / 28,762 | Beta online source and playback; L-Vid host; two script-loading indicators. | No licence; beta and mutable endpoint; excluded. |
| 12 | Modss | 200 / 17,091 | Minified general modification bundle with broad shared-app patch potential. | No licence; one script-loading indicator; excluded because its individual feature set and patch effects are not bounded. |
| 13 | GPBX | 200 / 295,243 | Filmix account and playback integration; GTM, Yandex Metrica, QR and Telegram hosts; five script-loading indicators. | No licence; account and tracking behavior require privacy review; excluded. |
| 14 | Multiplugin | 200 / 43,977 | Catalogue/loader for further remote plugins. | No licence; transitive code is not pinned or bounded; excluded. |
| 15 | NetFix | 200 / 124,984 | Obfuscated online source; 4,653 hex identifiers, NetFix and Telegram hosts. | No licence; excluded and not suitable for adaptation from this unreadable bundle. |
| 16 | Rootu TV | 200 / 185,104 | IPTV playlists and channel playback from GitHub/raw hosts. | No licence found; excluded. Existing local IPTV integration covers playlist-based TV. |
| 17 | Bandera Online | 200 / 150,488 | Ukrainian online video; Filmix, Uakino worker and Aartzz endpoints. | No licence; excluded. Also fetched by the legacy BO loader. |
| 18 | Community Watches | 200 / 36,808 | Community rows/top lists from `wh.lme.isroot.in`. | No plugin licence. MIT notice is for an embedded runtime only; excluded pending API ownership, data schema and privacy terms. |
| 19 | PubTorr | 200 / 26,374 | Torrent index search and selection flow. | No licence; torrent source rights and parser terms are unknown; excluded. |
| 20 | Tryzub TV | 200 / 147,224 | Ukrainian channel playback and metadata; Maincast and third-party stream hosts. | No plugin licence. Embedded MIT runtime notice does not license the plugin; excluded. |
| 21 | Online Mod | 200 / 604,446 | Multiple scraped online providers and source balancing; encoded tables, proxies and analytics/IP lookup endpoints; one script-loading indicator. | No licence; response size changed during the session; excluded. |
| 22 | EasyTorrent | 200 / 135,025 | Torrent search through a third-party Supabase project. | No licence; client-visible anon key is not a secret, but backend policy/data behavior is unverified; excluded. |
| 23 | Parsers LMP | 200 / 48,429 | Torrent parser/search requests to Jackett-compatible hosts. | No licence; third-party server terms and torrent rights are unknown; excluded. |
| 24 | Lampame BO loader | 200 / 155 | Two-line transitive loader that fetches Bandera Online via `Lampa.Utils.putScriptAsync`. | No licence; excluded and removed from unconditional runtime loading. |

Observed features and risks are inferred from source text and endpoint literals. The machine-readable audit retains the detected API names, URL hosts, storage keys, hooks, static error-handler counts, execution indicators, checksum and compile error when present. The companion functionality record contains workflow, navigation, data/preferences, lifecycle, error/fallback verification limits, conflicts, licence observation and feasibility for every URL.

## Licensing and redistribution

No URL in this registry states a licence for its own plugin code or grants HOOK TV redistribution/adaptation rights. The MIT markers found in Lumio, Community Watches and Tryzub identify embedded libraries; they do not license the surrounding plugin. No source was copied, renamed or bundled, and no third-party branding was removed. All 24 records remain in the master registry as excluded audit records with reasons.

Original or existing alternatives:

- **Studio catalogue:** the app already provides a TMDB studios carousel, company logos and the `company` filmography route. That existing implementation covers the observed workflow; no third-party or duplicate plugin code is used. Keep the app's TMDB attribution/API configuration in place.
- **IPTV:** the repository's existing `plugins/iptv` bundle is the managed local implementation; no Rootu TV or Tryzub code is used.
- **Online sources:** the admin manages the existing 59-provider HOOK TV source catalogue. Provider/site adapters are not copied from the audited plugins.
- **Store/loader:** no third-party store or recursive loader is enabled. The local admin catalog is allowlisted to checked-in plugin bundles.
- **Torrent search:** no third-party torrent plugin was bundled. Existing app torrent behavior remains governed by the project's settings and blacklist.
- **Server redirect:** not implemented; changing a base server can redirect account and media traffic, and no supported host/migration contract was supplied by the source.
- **Community Watches:** not implemented because the upstream API owner, schema, data rights and retention behavior could not be confirmed.

## Architecture and runtime behavior

The existing build discovers one-level directories under `plugins/` and emits one bundle per directory. The ecosystem uses flat `plugins/hooktv_<name>/` folders with category metadata rather than new nested category directories; nesting would bypass the current build. The admin-visible structure is `core`, `online`, `catalog`, `parsers`, `utilities`, `community` and `integrations`.

The runtime plugin loader allowlists local bundles from system config. BWA and Lampame BO are no longer unconditional remote loads. Existing user-entered plugin URLs are still supported only when the app's `plugins_use` setting and the system `plugins` flag allow them; they are not part of the HOOK TV allowlist. The internal local `plugins/modification.js` startup patch remains loaded by the app as before. Existing source blacklist entries for Z01, Wtch/Showy and known malicious URL patterns remain in place.

`public/js/hooktv-system.js` fetches `/api/system-config` before app scripts load, applies only known flags/plugin IDs and provider overrides, and caches the last valid response. `src/core/system.js` applies media flags to the app menu/navigation. The server validates plugin dependencies and source keys. Admin writes use an authenticated endpoint and revision compare-and-swap; public runtime responses do not include the audit catalog or third-party URLs.

## Compatibility and conflict assessment

| Area | Assessment |
|---|---|
| HOOK TV core and registry | Share a guarded SDK and Lampa startup lifecycle. The registry page lists registered HOOK TV manifests. |
| Local managed bundles | All 19 repository plugin directories are present in the 19-entry system catalog (the count includes the two HOOK TV plugins). Most have no explicit feature dependency; IPTV requires `live_tv`, Radio requires `music`, and online adapters require `online_sources`. Existing bundles are off by default except HOOK TV core and registry. |
| Online source store | Global flag and per-provider overrides are applied before per-device filters. A device's own hides/order still apply. |
| External API compatibility | Static API usage is recorded per source. It does not prove that every name exists on each Lampa build or is stable; no third-party script was executed in Lampa. |
| Cross-plugin conflicts | The source profiles call out duplicate Showy, Filmix/Ukrainian, torrent, IPTV and global patch overlaps. Since remote code was not loaded, runtime conflicts remain unverified. |
| Client compatibility | Menu, navigation and plugin changes compile as part of the web bundle. TV-remote focus and rendering still need a real HOOK TV/Lampa client. |

## Verification status

The test and bundle results below are recorded after the implementation run. A green unit test or bundle build proves code-level behavior only, not a live Lampa UI or provider playback.

| Check | Scope | Result |
|---|---|---|
| Remote source audit | 24 fetches, syntax compile-only, static scan | See [`audit-results.json`](audit-results.json); no downloaded code was run. |
| Config validation | defaults, flags, plugin IDs, dependencies, source overrides, public projection and persisted-row behavior | Covered by `spec/system_config.spec.js`. |
| Source controls | global off flag, individual overrides and existing local filters | Covered by `spec/online_sources.spec.js`. |
| Runtime bootstrap | server config, cached offline config and first-launch fallback | Covered by `spec/hooktv_system_bootstrap.spec.js`. |
| Admin API | session auth, origin rejection, catalog load and revisioned save | Covered by `spec/system_config_api.spec.js` with mocked Supabase responses. |
| Web packaging | app, admin assets and checked-in plugin bundles | `npx gulp pack_web` passed; emitted all 19 catalog bundles, the admin page and system bootstrap. |
| App bundle | generated `dest/app.js` from the Rollup/Babel/CommonJS/worker pipeline | Passed; generated a 2,456,793-byte IIFE bundle. |
| Full suite | all `spec/**/*.spec.js` tests | `npm test`: 60 files, 308 tests passed. |
| Admin persistence and login | live Supabase credentials and migration | Not exercised without deployment credentials; migration is supplied. |
| Admin browser smoke | login, all three tabs, provider search/override, plugin switch, feature switch and revisioned save against a local in-memory mock API | Passed in the in-app browser at its narrow viewport in light mode. This is not the full desktop/mobile, light/dark screenshot matrix or an independent reviewer pass. |
| Real Lampa playback | provider search and media playback | Not claimed; requires live authorized provider endpoints and a running Lampa client. |

## Security notes

- Third-party plugin files run with page privileges if an operator manually enables them. This system avoids executing those URLs through the admin catalog, but does not remove the app's existing user-plugin capability.
- HTTP source URLs and mutable GitHub/service URLs can change or be modified. The recorded hashes are audit-time fingerprints, not a pinning mechanism.
- SkazTV and Multiplugin recursively load remote code; BWA and NetFix are heavily obfuscated; Modss and GPBX patch or load broad app functionality; Z01 source text contains eval/account-related concerns. All are excluded from managed runtime loading.
- EasyTorrent's anon key is visible by design; the actual risks are the unknown backend's policies and data handling. Community Watches exposes a third-party API dependency whose owner/retention was not verified.
- TMDB company IDs are metadata; playback still depends on the user's configured sources. The existing studios route makes no direct provider or media requests.

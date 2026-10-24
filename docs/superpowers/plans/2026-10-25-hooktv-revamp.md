# HOOK TV Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand HOOK TV with a lime pill logo, an Apple TV-style UI and a one-tap "Original / Українська" Watch flow that plays the best source with no balancer UI.

**Architecture:** Foundation first, done serially: the branch, brand tokens and logo. Then come independent surfaces (intro, language, navigation, settings, details, player) and the source pipeline. The pipeline is an extraction of `online.js`'s API client, a pure, tested resolver, and then the dub sheet that wires Watch to it. UI tasks restyle existing Lampa templates, sass and controllers in place and keep Lampa's `selector`/`Controller` focus model.

**Tech Stack:** Vanilla ES modules bundled by rollup/babel through gulp, Sass, jQuery-style Lampa templates, vitest 0.32 for `spec/`, and browser-sync serving `build/web` on port 3000.

**Spec:** `docs/superpowers/specs/2026-10-24-hooktv-revamp-design.md`. Executors read the spec section each task cites.

## Global Constraints

**Tokens**
- Accent: `#C8F542`. Hover: `#D6FF5C`. Dark: `#A6D12A`. Text on accent: `#0B0F00`. Background: `#000`.
- Surfaces: `--surface-1 #121214` and `--surface-2 #1C1C1F`.
- Glass: `--glass rgba(30,30,32,.62)` with `backdrop-filter: blur(30px) saturate(1.4)`. The blur is static and is never animated.
- No `#E50914` and no `--netflix-red` may remain anywhere in `src/`, `public/` or the docs. All colours come from brand tokens.

**Focus and input**
- Every interactive element has the class `selector` and is reachable and escapable with a remote: arrows, OK and Back. Back always goes one level up and never traps focus.
- Focus ring: 3px `#C8F542` with a 2px black gap (outline-offset or a box-shadow pair).
- Wrap hover in `@media (hover: hover) and (pointer: fine)`.
- Controls get `touch-action: manipulation` and `-webkit-tap-highlight-color: transparent`.
- Inputs use at least 16px font. Phone layouts use `env(safe-area-inset-*)` and `100dvh`.

**Sizes and motion**
- Text is at least 22px at 1920 wide, and touch targets are at least 44px.
- Animate `transform` and `opacity` only.
- `prefers-reduced-motion: reduce` turns every intro and transition into a fade of 300 ms or less.

**Copy and storage**
- New UI strings get `hooktv_*` keys in `src/lang/uk.js` and `src/lang/en.js`. Ukrainian is the primary copy. Task 11 handles the other locales.
- Russian voices are never offered and never auto-selected.
- Existing storage keys stay unchanged. The new keys are `hooktv_dub` (`'uk'|'original'`, default `'uk'`), `hooktv_dub_by_title` (an object keyed by `movie.id`) and `hooktv_dub_always_ask` (boolean, default `true`).

**Commits:** conventional commits, each ending with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage paths explicitly.

## Review Focus

1. **A title with only Russian voices.** The sheet shows both options as unavailable, never plays Russian, and offers Retry and "All sources…". Tested in Task 7 and Task 8.
2. **A source API that hangs or is slow.** The 8 s cap resolves with whatever has arrived. Pressing Watch while resolving shows progress rather than freezing, and Back cancels. Tested in Task 7 with fake timers and in Task 8.
3. **The user leaves the details screen while sources are still resolving.** The request is aborted and `Player.play` is never called late. Tested in Task 8.
4. **The first stream fails or the player errors within 10 s.** The next candidate plays silently, with at most 3 attempts. Tested in Task 7.
5. **Remote-only use** of every new surface: intro skip, language list, top pills to content, settings popovers, dub sheet, and player popovers. Each surface is reachable and escapable. Covered by the keyboard-only browser step in each UI task and in Task 12.

---

### Task 0: Branch and baseline

**Files:** `vitest.config.js` (create)

- [ ] **Step 1: Ask the user** whether to commit the 141 uncommitted paths on `main` first, as "chore: snapshot local HOOK TV work", or to stash them. Do nothing without a yes. Then run `git switch -c revamp/hooktv`. The spec commit `e80aaf64` is already on `main`.
- [ ] **Step 2: Create `vitest.config.js`** with `test: { include: ['spec/**/*.spec.js'], environment: 'node' }`. Add `"test": "vitest run"` to `package.json` and keep a separate watch script `"test:watch": "vitest"`.
- [ ] **Step 3: Check the baseline.** Run `npm test`; both existing specs must pass. Run `npx gulp pack_web`, or the task list the gulpfile exports for a one-shot build (check `gulpfile.js` exports); it must exit 0 and produce `build/web/app.js`. Record any pre-existing failures in the ledger and do not fix unrelated ones.
- [ ] **Step 4: Commit:** `chore(test): one-shot vitest config`.

### Task 1: Brand tokens and logo (spec §1)

**Files:**
- Modify: `src/core/brand.js`, `src/sass/brand.scss`, `src/sass/components/lang.scss` (strip the red fallbacks), `public/index.html`, `BRANDING_GUIDE.md`, `DESIGN_SYSTEM.md`
- Create or replace: `public/img/logo.svg`, `public/img/logo-icon.svg`, `public/favicon.ico`, and the icon PNGs referenced by the platform manifests (find them with `grep -rn "icon" public/*.json public/*.webmanifest src/core/manifest.js`)
- Test: `spec/brand.spec.js`

**Interfaces:**
- Produces these CSS variables:
  - `--brand-primary`, `--brand-primary-hover`, `--brand-primary-dark`, `--brand-on-primary`, `--brand-background`
  - `--surface-1`, `--surface-2`, `--glass`, `--glass-blur`
  - `--text-primary`, `--text-secondary`, `--focus-ring`
- Produces the Sass mixins `@mixin hk-focus`, `@mixin hk-glass` and `@mixin hk-hover` (the hover media-query wrapper). They live in `src/sass/brand.scss`, and every later UI task uses them.
- `Brand.get('visual.primary') === '#C8F542'`.

- [ ] **Step 1: Write `spec/brand.spec.js`.** It runs these checks:
  - Import `src/core/brand.js` and assert `visual.primary === '#C8F542'` and `visual.background === '#000000'`.
  - Read `src/sass/brand.scss` as text and assert it contains `--brand-primary: #C8F542` and `--brand-on-primary: #0B0F00`.
  - Grep `src/` and `public/index.html` for `/#E50914|netflix-red/i` and expect no matches.
  - Compute the WCAG contrast of `#0B0F00` on `#C8F542` and of `#C8F542` on `#000000`, and expect at least 4.5 for each.
- [ ] **Step 2: Run `npm test`.** Expected: FAIL.
- [ ] **Step 3: Implement the tokens and mixins.** Set `<title>HOOK TV</title>` and `<meta name="theme-color" content="#000000">`. Replace the StreamFlow URLs in `brand.js` with empty strings, or with HOOK TV ones if the user supplies them.
- [ ] **Step 4: Draw the SVGs** to spec §1. They use outlined paths only and no `<text>`.
  - **`logo.svg`, viewBox `0 0 220 56`:**
    - a rounded pill, x 0–168, radius 28, fill `#0B0B0C`, stroke `rgba(255,255,255,.12)` 1px;
    - "HOOK" in white as a heavy geometric sans, with the second O as a `#C8F542` circle holding a `#0B0F00` play triangle;
    - "TV" in `#C8F542` at x 176–220.
  - **`logo-icon.svg`, viewBox `0 0 64 64`:** a rounded square, radius 14, fill `#0B0B0C`, holding the lime play-O.
  - Export the favicon and the PNGs from `logo-icon.svg` (use `sips` or an available rasteriser). Preview both SVGs in the browser on black and on white, and take a screenshot.
- [ ] **Step 5: Verify.** Run `npm test` (PASS), then a one-shot build (OK). Then run `npm start`, open http://localhost:3000, and confirm the header logo and the lime focus ring. Take a screenshot.
- [ ] **Step 6: Commit:** `feat(brand): HOOK TV pill logo and electric-lime tokens`.

### Task 2: Intro (spec §2)

**Files:** `src/interaction/loading_progress.js`, `src/sass/components/welcome.scss`, `src/app.js` (only the `.welcome` show/hide/skip lines, ~391-545, 498 and 770)

**Interfaces:**
- Consumes the Task 1 tokens.
- Produces `LoadingProgress.init()` (unchanged name), `LoadingProgress.ready(): Promise<void>` (resolves at the end of the 1.8 s sequence, or at once under reduced motion) and `LoadingProgress.finish()` (crossfades out).

- [ ] **Step 1: Restructure the intro.**
  - `app.js` removes `.welcome` only after both `appReady` and `LoadingProgress.ready()` resolve.
  - A skip (OK, Back, Enter, tap) calls `finish()` early, but only once the app is ready.
  - Status text appears after 3000 ms. The indeterminate line appears if the app is not ready at 1800 ms.
- [ ] **Step 2: Write the keyframes** with the exact timings from spec §2: pill 0–400, O ignite 400–900, TV slide 700–1100, crossfade 1400–1800. Add the reduced-motion block.
- [ ] **Step 3: Browser check.** Do a cold load, a skip with Enter, and a reduced-motion run (via `mcp__Claude_Browser__javascript_tool`, add `matchMedia` emulation or check the CSS). Take screenshots at 0.5 s and 1.2 s.
- [ ] **Step 4: Commit:** `feat(intro): Netflix-style HOOK TV intro`.

### Task 3: Language picker (spec §3)

**Files:** `src/interaction/lang.js`, `src/templates/lang.js`, `src/sass/components/lang.scss`

**Interfaces:**
- Produces `LangChoice.open(callback)` with the name and callback contract unchanged.
- Adds `orderLanguages(list: {code,title}[], detected: string): {code,title}[]`, exported for tests. The detected language goes first and the rest are sorted alphabetically by native title with `localeCompare`.

- [ ] **Step 1: Write `spec/lang-order.spec.js`.**
  - `orderLanguages([{code:'en',title:'English'},{code:'uk',title:'Українська'},{code:'cs',title:'Čeština'}],'uk')` returns codes in the order `['uk','cs','en']`.
  - An unknown detected code returns the list alphabetically.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement.**
  - A single view: remove `switchView` and the suggested card.
  - Geo-detection with a 1500 ms timeout, then `navigator.language`.
  - The frosted list, a checkmark on the selected row, and a lime Continue pill.
  - Storage writes stay as today.
- [ ] **Step 4: Run the tests (PASS), then check in the browser** with `localStorage.clear()`: keyboard only, up/down/Enter, Continue. Take screenshots at 1920 and 390 widths.
- [ ] **Step 5: Commit:** `feat(lang): Apple-style single-screen language picker`.

### Task 4: Top navigation, Library, Favourites icon (spec §4)

**Files:**
- Modify: `src/templates/head.js`, `src/interaction/head/head.js`, the head sass (`src/sass/components/head.scss` or wherever `.head` lives), `src/interaction/menu/menu.js`, and `src/interaction/search/global.js` (add the Favourites icon after Search)
- Create: `src/components/library.js`, `src/templates/library.js`, `src/sass/components/library.scss`, and a `profile_menu` popover in `src/interaction/head/profile_menu.js`
- Test: `spec/nav-items.spec.js`

**Interfaces:**
- Produces `Menu.openSection(action: string): void`. It is extracted from the `hover:enter` handler in `menu.js` `ready()` (~lines 213-330) so every former side-menu action still works. The handler itself calls `openSection`.
- Produces `NAV_PILLS = ['main','movie','tv','library']` and `libraryTiles(settings): {action,title,sprite}[]`, both exported from `library.js`. `libraryTiles` includes every old `menu_items` action except those in `NAV_PILLS` and `favorite` (Favourites has its own header icon). It drops `mytorrents` when `torrents_use` is false.
- Registers `Router` component `'library'`.

- [ ] **Step 1: Write `spec/nav-items.spec.js`.**
  - `libraryTiles({torrents_use:false})` includes `cartoon`, `myperson`, `catalog`, `filter`, `relise`, `anime`, `history`, `subscribes` and `timetable`.
  - It excludes `mytorrents`, `main`, `movie` and `tv`.
  - With `torrents_use:true` it includes `mytorrents`.
  - The union of `NAV_PILLS`, `libraryTiles(...)` and `['favorite']` covers every action in the old menu list. Import that list from `menu.js` by exporting it as `MENU_ITEMS`.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement to spec §4:**
  - the pills;
  - the transparent bar that turns to glass on scroll;
  - the bottom tab bar below 720px;
  - the Favourites icon via `Head.addIcon`, calling `Router.call('favorite')` behind `ParentalControl.personal('bookmarks')`;
  - the bell shown only when notices exist;
  - the avatar popover (Settings, Account, Switch profile, About);
  - the side menu hidden, though `Menu.init` still runs because plugins listen to `menu` events.
- [ ] **Step 4: Run the tests (PASS). Browser check, keyboard only:** pills ↔ right icons, down into content, Back. Open every Library tile once, and screenshot 1920 and 390.
- [ ] **Step 5: Commit:** `feat(nav): Apple TV top pills, Library and Favourites icon`.

### Task 5: Flat settings panel (spec §5)

**Files:** `src/interaction/settings/{settings,main,component}.js`, `src/templates/settings.js`, `src/templates/settings/*.js`, settings sass. Do not change `api.js`/`params.js` keys.

**Interfaces:**
- Produces `Settings.open()`, called by the Task 4 profile menu.
- Produces `buildFlatSections(registry): {id,title,rows}[]`, exported for tests. Its order is interface, playback, audio_dub, account, advanced. Every other registered folder (parser, server, tmdb, plugins, input, more, and folders added by plugins) is appended under `advanced`.
- Adds the `audio_dub` section with `hooktv_dub` (select: Original / Українська) and `hooktv_dub_always_ask` (toggle).

- [ ] **Step 1: Write `spec/settings-flat.spec.js`.**
  - Given a fake registry with folders `interface, player, account, parser, server, plugins, myplugin`, the section ids are `['interface','playback','audio_dub','account','advanced']`.
  - `advanced` contains rows from `parser`, `server`, `plugins` and `myplugin`. `player` maps to `playback`.
  - No row is dropped: the total row count in equals the total row count out, plus the 2 dub rows.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement** to spec §5: the right-side glass panel (640px, full-screen under 720px), inline values, a popover for selects, a lime switch, a filter field at the top, and Back to close. No folder screens remain.
- [ ] **Step 4: Run the tests (PASS). Browser check:** keyboard-only, change one select, one toggle and one input. Reload and confirm the values persisted. Take screenshots.
- [ ] **Step 5: Commit:** `feat(settings): single flat frosted settings panel`.

### Task 6: Extract the online API (no behaviour change)

**Files:** Create `src/services/online/api.js`. Modify `src/services/online.js`.

**Interfaces:**
- Produces, from `src/services/online/api.js`:
  - `APIClient` (moved verbatim from online.js:126-205)
  - `SourcesStore` (moved verbatim from 210-288)
  - `createV2` (moved verbatim from 309)
  - the helpers they need (`normalize`, auth getters, `getFileId`, `getHashTimeline`, `getHashBehold`)
  - `parsePackedStreamUrl` and `prepareStreams`, lifted out of their closures with the same bodies, taking only explicit parameters
- `online.js` imports them, and its exported `{init, component}` is unchanged.

- [ ] **Step 1: Write `spec/online-api.spec.js`.**
  - `parsePackedStreamUrl('[1080p]https://a/1.m3u8,[720p]https://a/2.m3u8')` gives `{'1080p':'https://a/1.m3u8','720p':'https://a/2.m3u8'}`. Assert against the current behaviour first: copy the current function into the test temporarily to capture it, then point the test at the module.
  - `prepareStreams([{quality:'720p',url:'u7'},{quality:'1080p',url:'u10'}])` gives `.first === 'u10'`, and the keys of `.qualitys` include `1080p` and `720p`. Match the current ordering semantics exactly.
- [ ] **Step 2: Run it.** Expected: FAIL (the module is missing). **Step 3: Move the code.** Cut and paste with no body edits. Only change parameter plumbing where a closure variable has to become an argument.
- [ ] **Step 4: Run the tests (PASS), then do a one-shot build.** Browser regression: open a details screen, click the existing online button, and the source list loads and a stream plays.
- [ ] **Step 5: Commit:** `refactor(online): extract API client and stream helpers to online/api.js`.

### Task 7: Best-source resolver (spec §7, resolver)

**Files:** Create `src/services/resolver.js`. Test: `spec/resolver.spec.js` and `spec/fixtures/voices.json`.

**Interfaces:**
- Consumes the Task 6 exports.
- Produces:
  - `classifyVoice(name: string, sourceKey: string): 'uk'|'original'|'ru'|'unknown'`
  - `rank(candidates: Candidate[], sourceOrder: string[]): Candidate[]`
  - `resolveCandidates(movie, { api, sourcesStore, signal, timeoutMs = 8000, season, episode }): Promise<{ original: Candidate[], ukrainian: Candidate[] }>`
  - `playBest(candidates, { api, play, onFail, signal, maxAttempts = 3, failWindowMs = 10000 }): Promise<'playing'|'exhausted'|'aborted'>`
  - `Candidate = { sourceKey, voiceName, lang, quality, ref, season?, episode? }`
- The dependencies `api` and `play` are injected, which keeps the resolver unit-testable. The production wiring passes `new APIClient()` and `Player.play`.

- [ ] **Step 1: Write `spec/resolver.spec.js`**, using the regex rules from spec §7 verbatim.
  - **`classifyVoice` table** from the fixture:
    - `'Український дубляж'`, `'UKR'`, `'Dniprofilm (UA)'` → `uk`
    - `'Оригінал'`, `'Original'`, `'ENG'` → `original`
    - `'Дубляж (RU)'`, `'Russian'` → `ru`
    - `'LostFilm'` → `unknown`
    - any name with sourceKey `'uaflix'` → `uk`
  - **`rank`:** 2160 comes before 1080 regardless of source. With equal quality, source order wins. "дубляж" is preferred over "многоголосый".
  - **`resolveCandidates`** with a mocked api (2 sources, one with RU and UA voices, one with Original and RU):
    - `ukrainian` has only the UA voice, and `original` has only the Original voice;
    - `ru` never appears;
    - sources hidden in `sourcesStore` are not called.
  - **Timeout:** one source never resolves. With fake timers advanced by 8000, the call resolves with the other source's candidates.
  - **Abort:** aborting the signal rejects the call or yields `aborted`, with no further api calls.
  - **`playBest`:**
    - The first `getStream` rejects, so the second candidate plays: `play` is called once with the second candidate's url, and the result is `'playing'`.
    - When `onFail` is reported within 10000 ms by the player, the next candidate is tried.
    - After 3 failures the result is `'exhausted'`.
    - With the signal aborted before `getStream` resolves, `play` is never called.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement.** **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(resolver): best-source resolver with dub classification`.

### Task 8: Dub sheet and Watch wiring (spec §7, sheet and prefetch)

**Files:**
- Create: `src/interaction/dub_sheet.js`, `src/templates/dub_sheet.js`, `src/sass/components/dub_sheet.scss`, `src/services/watch.js`
- Modify: `src/components/full/start/buttons.js` (Watch handler only), and the `full` start component (prefetch on create, abort on destroy)
- Test: `spec/watch.spec.js`

**Interfaces:**
- Consumes `resolveCandidates`, `playBest` and the storage keys from the Global Constraints.
- Produces:
  - `Watch.prefetch(movie): void`. Its cache is keyed by `movie.id` with a 10-minute TTL, and an `AbortController` is stored per id.
  - `Watch.cancel(movie): void`.
  - `Watch.start(movie, { season, episode }): void`.
  - `chooseDefault(movie): 'uk'|'original'`, which returns `hooktv_dub_by_title[id] ?? hooktv_dub ?? 'uk'`.
  - `Watch.switchLanguage(movie, lang, currentTime): Promise<'playing'|'exhausted'|'aborted'>`, which Task 10's Audio menu uses. It resolves (or reads from cache) the other language's candidates, then calls `playBest` with `timeline` seeded at `currentTime`. Add one `watch.spec.js` case: a cached `original` list plays at `currentTime=120`.
- The DOM contract with Task 9: Task 9 keeps the `.button--play` class on the Watch button, and this task binds `hover:enter` on it.

- [ ] **Step 1: Write `spec/watch.spec.js`** with mocked resolver, storage and sheet.
  - `chooseDefault` returns the per-title value over the global one, and `'uk'` when neither is set.
  - `Watch.start` with `hooktv_dub_always_ask=false` calls `playBest` with the default language's candidates and opens no sheet.
  - `Watch.cancel` while prefetch is pending aborts it, and a later resolution does not call `play`.
  - Both lists empty: the sheet gets state `'none'`, which shows Retry and "All sources…".
  - Choosing an option writes `hooktv_dub` and `hooktv_dub_by_title[id]`.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement** to spec §7:
  - **Sheet:** a centred glass card on TV and desktop, and a bottom sheet under 720px.
  - **Options:** a status line on each, spinners while resolving, and disabled options showing their reason.
  - **Focus:** focus starts on `chooseDefault`.
  - **"All sources…":** pushes the existing `hook_online` activity.
  - **Watch button:** `buttons.js` routes `.button--play` to `Watch.start`, and drops the old grouping `Select`.
- [ ] **Step 4: Run the tests (PASS). Browser check** with the real API:
  - one movie with a UA dub;
  - one series, checking that the episode continues and the next episode reuses the language;
  - one title with nothing available.

  Use the keyboard only, and take screenshots of the sheet in each state.
- [ ] **Step 5: Commit:** `feat(watch): Original/Ukrainian sheet with one-tap best-source playback`.

### Task 9: Details screen (spec §6)

**Files:** `src/templates/full/start_new.js`, the `full` sass, and `src/components/full/start.js` (hero, logo fetch, More popover). Create `src/utils/title_logo.js` and test it in `spec/title-logo.spec.js`.

**Interfaces:**
- Produces `pickTitleLogo(images: {logos: {file_path, iso_639_1, width}[]}, lang: string): string|null`. It prefers `lang`, then `'en'`, then `null`-language logos, and the widest file within each group.
- Keeps the classes `.button--play` (Watch), `.button--book` and the `view--torrent` and `view--online` handlers. The latter two move into the ⋯ More popover as items.
- Adds `.button--trailer`, `.button--favorite` (toggle, filled state) and `.button--more`.

- [ ] **Step 1: Write `spec/title-logo.spec.js`.**
  - Given logos `[{iso:'en',w:500},{iso:'uk',w:300},{iso:null,w:800}]`, with lang `'uk'` it returns the uk path, and with lang `'de'` it returns the en path.
  - An empty array returns `null`.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement** to spec §6:
  - a hero about 75vh with gradients;
  - the logo, or a 56px title fallback;
  - the meta line;
  - action order Watch, Trailer, ♡, ⋯;
  - "Continue S1·E3" when history exists;
  - the rows below.
- [ ] **Step 4: Run the tests (PASS). Browser check, keyboard only,** at 1920 and 390. Check a movie with a logo, one without, and a series. Take screenshots.
- [ ] **Step 5: Commit:** `feat(full): Apple TV-style details hero and actions`.

### Task 10: Player restyle (spec §8)

**Files:**
- Modify: `src/templates/player/{panel,info,footer}.js` and `src/sass/components/player/*.scss`.
- Modify `src/interaction/player/panel.js` only for moved hooks and the new popovers.
- Create `src/interaction/player/next_card.js`.
- Do not change `video.js` playback logic.

**Interfaces:**
- Consumes `Watch.switchLanguage(movie, lang, currentTime)` (Task 8) for the live Audio switch when the stream has no in-stream track for the other language.
- Consumes `segments.js` for the credits start.

- [ ] **Step 1: Write `spec/player-audio.spec.js`** for the pure helper `audioOptions(tracks, current, available: {uk:boolean, original:boolean})`.
  - Stream audio tracks labelled uk/en give in-stream options.
  - With no tracks, it gives resolver-switch options only for the available languages.
  - Russian tracks are omitted.
- [ ] **Step 2: Run it.** Expected: FAIL. **Step 3: Implement** to spec §8:
  - the layout;
  - auto-hide after 3 s;
  - the remote map;
  - touch gestures;
  - the Next episode card in the last 30 s or at the credits, with a 10 s countdown.
- [ ] **Step 4: Run the tests (PASS). Browser check:** play the title from Task 8, keyboard only, through every popover. Switch audio, test seek and the Back ladder (popover, then controls, then exit). Take screenshots at 1920 and 390.
- [ ] **Step 5: Commit:** `feat(player): Apple-style HOOK TV player`.

### Task 11: Locales and docs

- [ ] **Step 1:** For every `hooktv_*` key in `uk.js`/`en.js`, add an entry to `be, bg, cs, fr, he, pt, ro, zh` (translated). Write a spec that asserts every `hooktv_` key in `en.js` exists in all locale files.
- [ ] **Step 2:** Update `BRANDING_GUIDE.md`, `DESIGN_SYSTEM.md` and `UI_COMPONENTS.md` to HOOK TV, lime and the new components. Delete the StreamFlow references.
- [ ] **Step 3: Commit:** `docs+i18n: HOOK TV copy in all locales and design docs`.

### Task 12: Whole-app verification

- [ ] **Step 1:** Run `npm test` and the one-shot build. Both must be green.
- [ ] **Step 2: Browser pass** at 1920×1080 and 390×844, keyboard only. Cover:
  - cold start: intro, then the language picker (cleared storage)
  - Home and the pills
  - Library tiles
  - Favourites
  - Search
  - Settings (change and persist)
  - details screen
  - Watch → sheet → playback → audio switch → next episode
  - a not-available title
  - "All sources…"

  Take a screenshot of each.
- [ ] **Step 3:** Grep `src/` and `public/` for `#E50914|StreamFlow|#0A84FF`. Expect no hits outside git history.
- [ ] **Step 4: Final review.** Run superpowers:requesting-code-review. List the manual TV-device checks (webOS, Tizen remote and GPU) for the user.

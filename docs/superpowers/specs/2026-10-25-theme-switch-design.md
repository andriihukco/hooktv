# Theme switch: light, dark, and scheduled

Date: 2026-10-25
Branch: revamp/hooktv

## Goal

Add a light theme next to the existing dark one, and let the user choose between `system`, `light`, `dark` and `schedule`. The light theme must meet WCAG 2.2 AA for every text and UI pair, and the logo must stay correct in both themes. The app is no longer dark-only. This supersedes the "dark only" note in `src/sass/theme/tokens.scss` and the `color-scheme: dark` lock in `public/index.html` and `src/sass/theme/base.scss`.

## Current state

- `tokens.scss` holds every colour as a single `:root` set, written for black backgrounds.
- `index.html` and `base.scss` pin `color-scheme: dark` and inline `html{background:#000}`.
- `public/img/logo.svg` uses `fill="white"` for the letters and `#D6FF5C` for the play button. Both fail on a white surface.
- The brand accent `#C8F542` is about 1.27:1 on white. `#D6FF5C` is about 1.15:1. Neither may be used for text, links or focus rings on light.
- `src/core/theme.js` already exists, but it loads a remote CSS file for custom themes (`cub_theme`). Do not confuse it with this feature. The new module is `src/core/appearance.js`.

## Decisions

- **Token names do not change.** Components keep using `--surface-*`, `--text-*`, `--accent-*` and so on. Only the values change per theme. No component gets a `[data-theme]` selector.
- **Attribute on `<html>`.** The resolved theme is written to `document.documentElement.dataset.theme` as `light` or `dark`. CSS uses `:root[data-theme="light"] { ... }` and a dark default on `:root`.
- **Preference modes.** `system` follows `prefers-color-scheme`. `light` and `dark` are fixed. `schedule` switches to light between a start and end time (default 07:00 to 19:00, local time) and to dark otherwise.
- **No flash.** A small inline script in `index.html` reads the stored preference and sets `data-theme` before first paint. It is wrapped in try/catch, and falls back to `dark` (today's look) when storage is unavailable.
- **Schedule is re-checked** once a minute and on `visibilitychange`. Changing the theme never reloads the page.
- **Storage key** `appearance`: `{mode: 'system'|'light'|'dark'|'schedule', from: 'HH:MM', to: 'HH:MM'}`. Local to the device, like the existing settings.
- **Default for existing users is `dark`**, so nothing changes for them until they opt in. New users get `system`.
- **Reduced motion and forced colours** keep their current rules in `base.scss`.

## Light palette

Every value must be checked with the contrast script (see Verification). Targets: 4.5:1 for text, 3:1 for UI components and focus indicators.

| Token | Light value | Notes |
|---|---|---|
| `--surface-canvas`, `--surface-base` | `#FFFFFF` | |
| `--surface-raised` | `#F2F2F7` | cards and rows |
| `--surface-raised-2` | `#E5E5EA` | nested |
| `--surface-overlay` | `#FFFFFF` | menus, modals; needs a shadow |
| `--surface-sunken` | `#E9E9EE` | inputs |
| `--surface-placeholder` | `#D1D1D6` | image placeholder |
| `--text-primary` | `#1C1C1E` | |
| `--text-muted` | `#636366` | 6.0:1 on white. Do not use `#86868B` for text (3.6:1) |
| `--text-disabled` | `#8E8E93` | disabled text is exempt, but keep it readable |
| `--accent-text`, `--text-link` | `#3D6100` | 7.2:1 on white |
| `--accent` (fills) | `#C8F542` | fill only; text on it is `--accent-contrast` |
| `--accent-contrast` | `#0B0F00` | 15.3:1 on the lime fill |
| `--accent-hover`, `--accent-active` | `#D6FF5C`, `#A6D12A` | fills only |
| `--border-default` | `#8E8E93` | UI borders need 3:1 |
| `--border-subtle` | `#C7C7CC` | decorative dividers only |
| `--danger-text` | `#B00020` | |
| `--success-text` | `#1E6B34` | |
| `--warning-text` | `#7A5200` | yellow fails on white, so use a brown |
| `--info-text` | `#00577A` | |
| `--focus-ring-color` | `#3D6100` | against white and light surfaces |
| `--focus-fill` / `--focus-fill-text` | `#1C1C1E` / `#FFFFFF` | filled highlight inverts |
| `--focus-invert` | `none` | the dark theme inverts; light does not |
| `--shadow-*` | lower opacity versions | |

Surfaces over artwork (`--surface-media`, `--surface-media-strong`, `--text-media`) stay dark and white in both themes. Posters have dark gradients, so the text on them is the same in both.

Things that must not change between themes: the poster gradients, the player overlay, and the brightness dimming layer.

## Logo

- Add `public/img/logo-light.svg`: dark letters `#1C1C1E`, play button `#3D6100` (or a darker lime that passes 3:1 on white for the play glyph).
- Add `public/img/splash-light.svg` on the same rule.
- Switch with a CSS-driven element: two `<img>` tags, one with `.logo--dark-theme` and one with `.logo--light-theme`, and CSS shows the right one. Avoid JS swapping `src`, which causes a flicker.
- `logo-icon.svg` (the app icon and favicon) stays as-is. It sits on its own dark tile in both themes.
- Check the splash animation (letters draw and fill) in both themes; the glint and glow must not turn white on white.

## Files

- New: `src/core/appearance.js` (mode, schedule, resolve, apply, listeners).
- New: `src/interaction/appearance_settings.js` and a settings row in the existing Settings view.
- Edit: `src/sass/theme/tokens.scss` (add the light block, update the header comment).
- Edit: `src/sass/theme/base.scss` (remove the forced `color-scheme: dark` and `html` background; set `color-scheme` from the resolved theme).
- Edit: `public/index.html` (inline pre-paint script; `meta name="color-scheme"` becomes `light dark`; the inline `html{background}` uses a CSS variable fallback that matches the stored theme).
- New: `public/img/logo-light.svg`, `public/img/splash-light.svg`.
- Edit: `src/app.js` (call `Appearance.init()` once after the settings store is ready).
- Edit: `public/manifest.json` `theme_color` / `background_color` are read once at install; leave them dark and note the limit.

## Out of scope

- Per-screen themes, custom colours, and high-contrast as a fourth mode (forced-colors mode already works).
- Syncing the choice across devices.
- Changing the brand accent. Only the light token values are new.

## Verification

1. **Contrast script.** A small script reads the token values from both blocks of `tokens.scss` and checks every text-on-surface and UI-on-surface pair against 4.5:1 and 3:1. It fails the build if a pair is below the target. The script lives in `scripts/check-contrast.mjs` and is run by `npm run check:contrast`.
2. **Visual pass.** Screenshots of home, a title page, the player overlay, settings, the splash and the search screen in both themes, at TV size and phone width.
3. **Logo check.** Logo and splash are visible in both themes, with no white-on-white letters.
4. **Schedule check.** Set `from` and `to` to times around the current time and confirm the switch happens without reload. Also confirm that a `system` change from the OS updates the page.
5. **No flash.** Load with the light preference stored and confirm the first paint is light (throttled reload, screenshot at first frame).
6. **Storage unavailable.** With storage blocked, the app still loads in dark and the settings row still renders.

## Open questions

- Should the schedule default to the device's sunrise and sunset instead of fixed times? Fixed times are simpler and are the proposal here.
- Is the play-button colour in `logo-light.svg` allowed to be the lime fill, or must it be the darker green?

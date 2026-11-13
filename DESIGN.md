# HOOK TV Design System

## 1. Atmosphere & Identity

HOOK TV uses a dark, cinematic surface with restrained glass layers and electric-lime emphasis. Settings stay close to Lampa's TV-first interaction model: clear hierarchy, large remote targets, and focused rows that invert to white with a lime ring.

## 2. Color

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Canvas | `--brand-background` | `#000000` | App backdrop |
| Raised surface | `--surface-1` | `#121214` | Settings panels |
| Elevated surface | `--surface-2` | `#1C1C1F` | Nested cards and selected sections |
| Glass | `--glass` | `rgba(30, 30, 32, 0.62)` | App chrome |
| Primary text | `--text-primary` | `#FFFFFF` | Titles and values |
| Secondary text | `--text-secondary` | `rgba(255, 255, 255, 0.62)` | Explanations |
| Primary accent | `--brand-primary` | `#C8F542` | Save actions and focus ring |
| Accent hover | `--brand-primary-hover` | `#D6FF5C` | Pressed or active primary action |
| Accent contrast | `--brand-on-primary` | `#0B0F00` | Text on lime controls |
| Subtle divider | `--brand-border` | `rgba(255, 255, 255, 0.12)` | Group separation |
| Success | `--success` | `#30D158` | Saved state |
| Warning | `--warning` | `#FFD60A` | Needs attention |
| Error | `--danger` | `#FF453A` | Failed action |

Admin controls use these existing HookTV variables. Do not add a separate accent or light theme to the in-app admin surface.

## 3. Typography

- Primary: inherit the app's Lampa font stack; do not load a separate font for admin.
- Use existing settings row sizes and weights for labels, values, and descriptions.
- Keep original third-party plugin names in the secondary text style, below the HookTV role label.
- Keep URLs and other unbroken strings wrapping within the available row width.

## 4. Spacing & Layout

- Use the existing `--space-xs` through `--space-3xl` scale (4px through 64px).
- Use existing `--radius-sm` through `--radius-xl` values for controls and surfaces.
- The in-app admin is a settings page, not a new app shell. Settings chrome stays fixed; the Lampa `Scroll` component owns the admin content's vertical scroll.
- The scroll layout follows the [StyleGallery scroll-body-shell pattern](https://github.com/changeroa/StyleGallery/blob/main/patterns/viewport-shell/scroll-body-shell.md): one bounded settings body scrolls while its heading and close control remain available.
- Reflow labels and metadata in source order; never introduce a second horizontal scroll region for primary admin content.

## 5. Components

### Admin setting row
- **Structure**: one focusable `.settings-param.selector` row with a role-based title, optional original plugin name, description, and state value.
- **Variants**: feature toggle, local plugin toggle, online source toggle, external plugin toggle, and action row.
- **Spacing**: inherited settings row padding; descriptions use the existing muted text token.
- **States**: default, focused, enabled, disabled by a parent feature, loading, save pending, save success, and error.
- **Accessibility**: reachable with the TV remote and keyboard; switches expose `role="switch"` and `aria-checked`; state changes remain visible in text.
- **Motion**: use existing Lampa focus transitions; no layout animation.
- **Layout**: stack within the settings body's single scroll owner.

### Admin language selector
- **Structure**: two adjacent settings rows for English and Ukrainian.
- **Variants**: English selected, Ukrainian selected.
- **Spacing**: existing settings row rhythm.
- **States**: selected and unselected, with the selected language announced as pressed.
- **Accessibility**: remote and keyboard reachable; selected state is not color-only.
- **Motion**: no new motion.
- **Layout**: placed before the admin controls so language changes do not require leaving the page.

### Admin credentials prompt
- **Structure**: sequential username and password fields using the existing Lampa TV keyboard.
- **Variants**: username entry, password entry, failed login, rate limited.
- **Spacing**: inherited from the settings input modal.
- **States**: empty, focused, masked password, error, locked.
- **Accessibility**: each prompt has a localized title; password characters remain masked; failures are announced through the existing notice layer.
- **Motion**: keep existing input/modal transitions and honor the platform's reduced-motion settings.
- **Layout**: one prompt at a time, outside the settings scroll.

## 6. Motion & Interaction

- Keep the established 150ms and 200ms HookTV transitions for focus and panel changes.
- Preserve the existing Lampa five-press gesture on the build row; five presses within three seconds reveal admin login.
- Use the existing TV keyboard for credentials. Follow the beui.dev input pattern's explicit label and field-adjacent error behavior, without importing its React or Motion implementation: [input source](https://beui.dev/r/input/raw).
- A save starts with an in-place status; success is reflected by the saved revision and enabled state. Errors stay next to the save status.
- Respect reduced motion; state and focus feedback must remain understandable without animation.

## 7. Depth & Surface

- **Strategy**: tonal shift with the existing glass treatment reserved for app chrome.
- Use `--surface-1` and `--surface-2` to distinguish nested admin groups; avoid a border on every row.
- Use the existing HookTV focus fill and lime ring. Keep accent on focused or primary controls, not decorative labels.
- Use `--radius-sm` for small controls and `--radius-lg` or `--radius-xl` only for enclosing surfaces.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA for web admin text and controls.
- Keep every action reachable by keyboard and TV remote with a visible focus state.
- Use at least 44px control targets where a row is not already larger.
- Keep switch state available in text and ARIA, and do not rely on color alone.
- Reduce nonessential motion when `prefers-reduced-motion` is enabled.
- Keep external plugin URLs disabled by default and require an explicit admin choice before runtime loading.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|------|----------|--------------|--------------|
| External plugin code is served by third parties and can change upstream. | Admin plugin catalog and runtime loader | The requested catalog is opt-in; entries stay off until an administrator enables them. | Reassess each source before enabling or when its URL changes. |

# HOOK TV: project rules

## Definition of done (after every task)

Do not call a task finished until every step below has run and passed. Fix what fails, then run the steps again.

1. **Tests.** `npx vitest run` passes. Add a test for any new rule.
2. **Localisation.** Every game and folder has a title and a hint in every language pack in `src/lang/`, and none is still the English text (the spec `spec/games_localisation.spec.js` checks this). Brand names that are used as-is in a language (Wordle, Sudoku, Snake, Blackjack) may stay in Latin script. Anything else is translated. Check each new string for mixed scripts (Latin letters inside a Cyrillic word, and so on).
3. **Consistency.** New UI strings go into every pack, with the English fallback where a pack is still partial. Keep button and control names the same across games.
4. **Design.** Components and tokens match `src/sass/brand.scss` and `public/design.html` (the design page). If a token or component changes, update the design page in the same change.
5. **Accessibility (WCAG 2.2 AA).** Text contrast at least 4.5:1 (3:1 for large text). Focus ring visible on every control. Touch targets at least 44 px. Motion respects `prefers-reduced-motion`. The page declares its language.
6. **SEO.** Public pages have a unique `<title>` (under 70 characters), a description (under 160), a canonical URL and Open Graph tags. Routes that should be public are listed in `vercel.json`.
7. **Commit and push** when the user asks for it. Commit only the files of the task, never other people's uncommitted work.

## Where things live

- Game catalogue and folders: `src/games/`. Titles and hints come from `game_<id>_title` and `game_<id>_hint`; folders from `games_cat_<id>_*`.
- Language packs: `src/lang/<code>.js`; the build copies them to `public/lang/`. Language list and flags: `src/lang/meta.js` and `src/interaction/lang.js`.
- Design tokens: `src/sass/brand.scss`. Design system notes: `DESIGN_SYSTEM.md`. Design page: `public/design.html` (served at `/design`).

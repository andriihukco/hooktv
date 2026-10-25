# Tastes: global preference profile and swipe wizard

Date: 2026-10-25
Branch: revamp/hooktv

## Goal

One global Tastes profile decides what the whole app shows. The user sets genres, countries, actors and a minimum rating, then trains the profile by swiping titles like, dislike, or haven't watched. The wizard can be rerun at any time. Lists that come from TMDB are filtered and ranked by the profile. The user's own library is never filtered.

## Decisions

- Hard filtering: titles that break the profile are hidden, not just ranked.
- Multiple genres or countries match on any.
- Likes rank a title higher but never hide anything. Dislikes hide a single title.
- Haven't watched (`skip`) is no signal and hides nothing.
- Actors are enforced only in TMDB `discover` queries and personal rows. Generic catalogs rank by genre, country and rating only, because checking actors there needs a credits call per title.
- Wizard cards are a mixed set of popular, well-rated titles across genres.

## Data model

Stored under the Storage key `tastes`:

```
{
  genres:    [number],          // TMDB genre ids, any-match
  countries: [string],          // ISO 3166-1 codes, matched on origin_country, any-match
  actors:    [{id, name}],      // TMDB person ids, any-match
  min_rating: number,           // 0..10, compared to vote_average; 0 = off
  verdicts:  {['movie'|'tv' + ':' + id]: {verdict: 'like'|'dislike'|'skip', title: string}},
  wizard_done: boolean,
  updated: number               // timestamp
}
```

- An empty profile filters nothing. The app behaves as it does today until a preference is set.
- Verdict keys are `media + ':' + id`, so a movie and a show with the same id stay separate.
- Storage is local to the device, as are the existing favorites. No sync is added in this change.

## Components

### `src/core/tastes.js` (new, pure logic)

- `get()` returns the profile with defaults filled in. It never returns `undefined`.
- `set(patch)` merges fields and writes through Storage.
- `verdict(card, value)` records like, dislike or skip for a card. `value = null` removes the verdict.
- `match(card)` returns false when any of these hold:
  - the verdict is `dislike`
  - `min_rating > 0` and `vote_average < min_rating`
  - `genres` is set and the card shares none of them
  - `countries` is set and the card's `origin_country` shares none of them
- `score(card)` adds points for a `like` verdict, for shared genres and countries, and for actors when the card carries cast data. It is used only to sort.
- `apply(results)` returns `results` filtered by `match`, then stable-sorted by `score` descending. Non-array input returns `[]`.
- `discoverParams(media)` returns `with_genres`, `with_origin_country`, `with_cast` and `vote_average.gte`. Fields are omitted when unset.
- `reset()` clears the profile and verdicts.

### Applying the filter

- `src/core/api/api.js`: `main`, `category`, `menuCategory`, `search`, `genres`, `company`, `list`, `collections`, and the `partNext` row builder pass results through `Tastes.apply`.
- `src/core/api/api.js` `favorite()` is not changed. The library is excluded.
- `full()` (title detail) is not changed.
- `src/core/personal_rows.js` builds its discover URLs with `discoverParams`. Its own `gems()` filter is replaced by `Tastes.apply`.
- `src/core/content_rows.js` is not changed. Rows that end up empty already hide.

### Wizard: `src/interaction/tastes/`

- `wizard.js` runs the steps and holds the state. It is the only module that writes verdicts through `tastes.js`.
- `deck.js` renders the swipe deck. It handles pointer drag on web and arrow keys with OK on TV. Right is like, left is dislike, up or down is skip.
- `pick.js` renders the chip and person pickers for genres, countries, actors and the rating slider.
- Step 1: pick genres, countries, actors and minimum rating.
- Step 2: swipe about 20 cards from the deck source. A deck source is a `discover` request per media type sorted by popularity, with `vote_count.gte` 300, `vote_average.gte` 7, and a random genre per card. Titles already in verdicts are skipped.
- Step 3: summary. Saving sets `wizard_done` to true.
- Rerun opens the wizard at step 1 with the saved profile. Reset clears it.

### Settings entry

- `src/interaction/tastes/settings.js` registers a `tastes` component with `Settings.addComponent`, after `interface`, with a button that opens the wizard and a reset button.

### Home hint

- If the filter empties every home row and the profile is set, the home screen shows a hint with a button that opens Tastes.

## Error handling

- The filter is local and makes no network call. A failed `discover` request falls back to the existing unfiltered request for that row.
- A wizard deck request that fails shows a message and a retry button. Verdicts already given are kept.
- Storage read or write errors leave the profile at its defaults and show a notice.

## Strings

Every new string is added to both `src/lang/en.js` and `src/lang/uk.js`. Keys start with `tastes_`.

## Testing

- Unit tests (vitest, `spec/`) for `match`, `score`, `apply`, `discoverParams`, `verdict`, and `reset`, covering empty profile, each rule alone, and combined rules.
- Unit tests for the wizard state transitions: step order, skip not hiding, dislike hiding, and rerun keeping verdicts.
- Manual check in the browser preview: set a profile, confirm home rows and search results change, and confirm the library is unchanged.

## Out of scope

- Syncing the profile across devices or accounts.
- Client-side actor filtering on generic catalogs.
- Changing the library, favorites, or title detail pages.
- Changing how rows are registered in `content_rows.js`.

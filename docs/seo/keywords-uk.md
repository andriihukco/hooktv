# HOOK TV: Ukrainian keyword plan

Site: https://www.hooktv.online · Language: uk · Built from the live site, its sitemap (668 URLs), and a check of the current search results. No Search Console or paid keyword-volume data was available, so the volume column is qualitative, not measured.

## Rules for this plan

- Target what people want to find, watch, or choose: catalogue, new releases, Ukrainian dubbing, ratings, and "where to watch".
- Avoid piracy-coded phrasing such as «безкоштовно», «без реклами», «повний фільм онлайн», «дивитися онлайн без реєстрації». Those queries lead to unlicensed sources, which this app does not provide, and they would misrepresent the product.
- One primary keyword per page. Put it in the title, the H1, the first paragraph, and the meta description. Do not repeat it unnaturally.

## Keyword clusters

| Cluster | Primary keyword | Variants | Target page | Intent |
|---|---|---|---|---|
| Brand | HOOK TV | hooktv, hook tv фільми | `/` | Navigational |
| Catalogue | фільми та серіали онлайн українською | дивитися фільми онлайн українською, серіали українською озвучкою | `/` | Informational / transactional |
| Ukrainian cinema | українські фільми онлайн | українське кіно, українські серіали, українські фільми 2026 | `/` plus a Ukrainian-cinema list | Discovery |
| New releases | новинки фільмів 2026 | нові фільми 2026, прем'єри 2026, новинки серіалів | `/` plus per-title pages | Discovery, time-bound |
| Choosing | що подивитися сьогодні | що подивитися ввечері, топ фільмів, фільми за рейтингом | `/` plus curated lists | Informational |
| Per title | «Назва» (рік) дивитися онлайн українською | «назва» українською озвучкою, «назва» відгуки, «назва» рейтинг | `/?card=…` pages (already generated) | Transactional, long-tail |
| Per title, Ukrainian dub | «назва» українською | фільм українською озвучкою | Per-title pages | Long-tail |

## Coverage check against the current site

- Already covered: the home title and description (`public/index.html`, `api/title.js`), the per-title SEO title and description, the Movie/TVSeries JSON-LD, breadcrumbs, and the sitemap of 668 title URLs.
- Gaps to close next:
  1. The home H1 and copy do not mention «новинки 2026» or «що подивитися сьогодні». Add one paragraph or a section for each.
  2. A Ukrainian-cinema list page (`/?…` or a dedicated route) would own the «українські фільми онлайн» cluster. The home page has a "Українські фільми" section, but it is not a dedicated page.
  3. Per-title pages use `/?card=ID&media=…&source=tmdb` query URLs. Clean paths such as `/movie/969681-slug` would read better to search engines and people. This is a routing change and needs a decision before implementation.

## Next checks (need Search Console access)

- Queries and impressions for the clusters above, once the site has Search Console data.
- Position 5–15 queries: these are the first pages to improve.
- CTR on titles and descriptions for pages that already rank.

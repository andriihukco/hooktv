/**
 * Share pages for social link previews and search engines. Crawlers do not run
 * the app, so this returns an HTML page per title: Open Graph tags, readable
 * content (title, rating, year, runtime, genres, cast, overview) and schema.org
 * structured data. People are sent on to the app with the same ?card= link
 * (see activity.js).
 *
 * Also serves the home page preview: middleware.js sends link-preview bots that
 * open "/" here, so links copied from the address bar get rich cards too.
 *
 * TMDB_API_KEY in the Vercel project settings overrides the app's public key.
 */

const APP_NAME = 'HOOK TV'
// the same public key the web app ships with
const PUBLIC_TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96'

const FALLBACK = {
    title: APP_NAME,
    description: 'Фільми, серіали та ТБ — усе в одному місці. Українською озвучкою.',
    image: '/img/og.png',
    width: 1200,
    height: 630,
    type: 'website'
}

function esc(value){
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

// JSON inside <script>: escape "<" so no value can close the tag early
function json(value){
    return JSON.stringify(value).replace(/</g, '\\u003c')
}

// a search snippet reads best up to about 155 characters, cut at a word
function snippet(text, max){
    text = String(text || '').replace(/\s+/g, ' ').trim()

    if(text.length <= max) return text

    return text.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s.,;:!?—-]+$/, '') + '…'
}

function plural(n, one, few, many){
    let mod10 = n % 10
    let mod100 = n % 100

    if(mod10 == 1 && mod100 != 11) return one
    if(mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few

    return many
}

function runtime(data, media){
    if(media == 'tv'){
        let n = data.number_of_seasons || 0

        return n ? n + ' ' + plural(n, 'сезон', 'сезони', 'сезонів') : ''
    }

    let m = data.runtime || 0

    if(!m) return ''

    return (m >= 60 ? Math.floor(m / 60) + ' год ' : '') + (m % 60 ? (m % 60) + ' хв' : '').trim()
}

async function fetchTitle(media, id){
    let key = process.env.TMDB_API_KEY || PUBLIC_TMDB_KEY

    let res = await fetch(`https://api.themoviedb.org/3/${media}/${id}?language=uk-UA&append_to_response=credits&api_key=${encodeURIComponent(key)}`)
    if(!res.ok) return null

    let data = await res.json()
    let name = data.title || data.name
    let year = (data.release_date || data.first_air_date || '').slice(0, 4)

    if(!name) return null

    // "★ 8.5 · Пригоди · Фентезі. Опис" leads the description for previews that show text only
    let vote   = data.vote_average ? data.vote_average.toFixed(1) : ''
    let genres = (data.genres || []).slice(0, 3).map(g=>g.name.charAt(0).toUpperCase() + g.name.slice(1))
    let facts  = [vote && vote != '0.0' ? '★ ' + vote : ''].concat(genres).filter(Boolean).join(' · ')
    let overview = data.overview || FALLBACK.description
    let credits  = data.credits || {}
    let cast     = (credits.cast || []).slice(0, 6).map(p=>p.name).filter(Boolean)
    let directors = (credits.crew || []).filter(p=>p.job == 'Director').slice(0, 2).map(p=>p.name).filter(Boolean)
    let title    = year ? name + ' (' + year + ')' : name

    return {
        title,
        description: snippet((facts ? facts + '. ' : '') + overview, 155),
        // branded card with the poster, rating, genres and overview (api/og.js)
        image: '/api/og?' + new URLSearchParams({card: id, media}).toString(),
        width: 1200,
        height: 630,
        type: media == 'tv' ? 'video.tv_show' : 'video.movie',
        info: {
            name,
            year,
            overview,
            genres,
            rating: vote && vote != '0.0' ? vote : '',
            votes: data.vote_count || 0,
            length: runtime(data, media),
            cast,
            directors,
            released: data.release_date || data.first_air_date || '',
            media,
            poster: data.poster_path ? 'https://image.tmdb.org/t/p/w500' + data.poster_path : ''
        }
    }
}

// readable content for crawlers and for people reading link previews
function body(meta, target){
    let i = meta.info

    if(!i) return `<main><h1>${esc(APP_NAME)}</h1><p>${esc(meta.description)}</p><p><a href="${esc(target)}">Відкрити ${esc(APP_NAME)}</a></p></main>`

    let facts = [i.year, i.length].filter(Boolean)
    let rating = i.rating ? `<p>Рейтинг TMDB: ${esc(i.rating)} з 10 (${esc(i.votes)} оцінок)</p>` : ''

    return `<main>
<article>
<h1>${esc(meta.title)}</h1>
<p>${facts.map(esc).join(' · ')}</p>
${i.poster ? `<img src="${esc(i.poster)}" width="500" height="750" alt="Постер: ${esc(i.name)}">` : ''}
${rating}
${i.genres.length ? `<p>Жанри: ${esc(i.genres.join(', '))}</p>` : ''}
${i.directors.length ? `<p>Режисер: ${esc(i.directors.join(', '))}</p>` : ''}
${i.cast.length ? `<p>У ролях: ${esc(i.cast.join(', '))}</p>` : ''}
<p>${esc(i.overview)}</p>
<p><a href="${esc(target)}">Дивитися «${esc(i.name)}» українською на ${esc(APP_NAME)}</a></p>
</article>
</main>`
}

// schema.org data: Movie or TVSeries, with a rating only when TMDB has votes behind it
function structured(meta, shareUrl){
    let i = meta.info

    if(!i) return null

    let data = {
        '@context': 'https://schema.org',
        '@type': i.media == 'tv' ? 'TVSeries' : 'Movie',
        name: i.name,
        description: meta.description,
        url: shareUrl,
        image: i.poster || undefined,
        genre: i.genres.length ? i.genres : undefined,
        datePublished: i.released || undefined,
        director: i.directors.length ? i.directors.map(name=>({'@type': 'Person', name})) : undefined,
        actor: i.cast.length ? i.cast.map(name=>({'@type': 'Person', name})) : undefined,
        inLanguage: 'uk',
        aggregateRating: i.rating && i.votes ? {
            '@type': 'AggregateRating',
            ratingValue: Number(i.rating),
            bestRating: 10,
            worstRating: 0,
            ratingCount: i.votes
        } : undefined
    }

    return data
}

function page(meta, target, shareUrl, redirect){
    let ld = structured(meta, shareUrl)

    return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${meta.title === APP_NAME ? APP_NAME : esc(meta.title) + ' · ' + APP_NAME}</title>
<link rel="canonical" href="${esc(shareUrl)}">
<meta name="description" content="${esc(meta.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:site_name" content="${APP_NAME}">
<meta property="og:type" content="${esc(meta.type)}">
<meta property="og:locale" content="uk_UA">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:image:width" content="${esc(meta.width)}">
<meta property="og:image:height" content="${esc(meta.height)}">
<meta property="og:image:alt" content="${esc(meta.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(meta.image)}">
<meta name="twitter:image:alt" content="${esc(meta.title)}">
${ld ? `<script type="application/ld+json">${json(ld)}</script>` : ''}
${redirect ? `<meta http-equiv="refresh" content="0; url=${esc(target)}">` : ''}
</head>
<body>${body(meta, target)}</body>
</html>`
}

module.exports = async (req, res) => {
    let base  = 'https://' + req.headers.host
    let url   = new URL(req.url, base)
    let id    = url.searchParams.get('card') || ''
    let media = url.searchParams.get('media') === 'tv' ? 'tv' : 'movie'
    let source = url.searchParams.get('source') || 'cub'

    // card ids are numeric; anything else is ignored, so nothing is reflected into the page
    let valid = /^\d{1,12}$/.test(id)
    let target = valid ? '/?' + new URLSearchParams({card: id, media, source}).toString() : '/'

    // middleware.js already serves the app URL itself to bots; redirecting there again would loop
    let viaApp = url.searchParams.get('preview') === '1'

    let meta = FALLBACK
    if(valid){
        try{
            meta = (await fetchTitle(media, id)) || FALLBACK
        }
        catch(e){
            meta = FALLBACK
        }
    }

    if(meta.image.startsWith('/')) meta = {...meta, image: base + meta.image}

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.status(200).send(page(meta, target, base + target, !viaApp))
}

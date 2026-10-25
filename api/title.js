/**
 * Share pages for social link previews. Crawlers do not run the app, so this
 * returns a small HTML page with Open Graph tags for one title, then sends
 * people on to the app with the same ?card= deep link (see activity.js).
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

async function fetchTitle(media, id){
    let key = process.env.TMDB_API_KEY || PUBLIC_TMDB_KEY

    let res = await fetch(`https://api.themoviedb.org/3/${media}/${id}?language=uk-UA&api_key=${encodeURIComponent(key)}`)
    if(!res.ok) return null

    let data = await res.json()
    let name = data.title || data.name
    let year = (data.release_date || data.first_air_date || '').slice(0, 4)

    if(!name) return null

    // "★ 8.5 · Пригоди · Фентезі" ahead of the overview, for previews that show text only
    let vote   = data.vote_average ? data.vote_average.toFixed(1) : ''
    let genres = (data.genres || []).slice(0, 3).map(g=>g.name.charAt(0).toUpperCase() + g.name.slice(1))
    let facts  = [vote && vote != '0.0' ? '★ ' + vote : ''].concat(genres).filter(Boolean).join(' · ')

    return {
        title: year ? name + ' (' + year + ')' : name,
        description: ((facts ? facts + '. ' : '') + (data.overview || FALLBACK.description)).slice(0, 220),
        // branded card with the poster, rating, genres and overview (api/og.js)
        image: '/api/og?' + new URLSearchParams({card: id, media}).toString(),
        width: 1200,
        height: 630,
        type: media == 'tv' ? 'video.tv_show' : 'video.movie'
    }
}

function page(meta, target, shareUrl, redirect){
    return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>${meta.title === APP_NAME ? APP_NAME : esc(meta.title) + ' · ' + APP_NAME}</title>
<link rel="canonical" href="${esc(shareUrl)}">
<meta name="description" content="${esc(meta.description)}">
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
${redirect ? `<meta http-equiv="refresh" content="0; url=${esc(target)}">` : ''}
</head>
<body><a href="${esc(target)}">${esc(meta.title)}</a></body>
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

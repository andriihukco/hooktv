/**
 * Share pages for social link previews. Crawlers do not run the app, so this
 * returns a small HTML page with Open Graph tags for one title, then sends
 * people on to the app with the same ?card= deep link (see activity.js).
 *
 * Needs TMDB_API_KEY in the Vercel project settings.
 */

const APP_NAME = 'HOOK TV'
const FALLBACK = {
    title: APP_NAME,
    description: 'Каталог фильмов и сериалов',
    image: '/img/logo-icon.svg'
}

function esc(value){
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

async function fetchTitle(media, id){
    let key = process.env.TMDB_API_KEY
    if(!key) return null

    let res = await fetch(`https://api.themoviedb.org/3/${media}/${id}?language=uk-UA&api_key=${encodeURIComponent(key)}`)
    if(!res.ok) return null

    let data = await res.json()
    let image = data.backdrop_path || data.poster_path

    return {
        title: data.title || data.name || FALLBACK.title,
        description: (data.overview || FALLBACK.description).slice(0, 200),
        image: image ? 'https://image.tmdb.org/t/p/w780' + image : FALLBACK.image
    }
}

function page(meta, target, shareUrl){
    return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>${esc(meta.title)} · ${APP_NAME}</title>
<link rel="canonical" href="${esc(shareUrl)}">
<meta name="description" content="${esc(meta.description)}">
<meta property="og:site_name" content="${APP_NAME}">
<meta property="og:type" content="video.other">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:image" content="${esc(meta.image)}">
<meta property="og:image:alt" content="${esc(meta.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(meta.image)}">
<meta name="twitter:image:alt" content="${esc(meta.title)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
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
    let target = '/?' + new URLSearchParams(valid ? {card: id, media, source} : {}).toString()

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
    res.status(200).send(page(meta, target, url.href))
}

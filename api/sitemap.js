/**
 * sitemap.xml: the popular and top-rated titles in Ukrainian, each pointing at
 * its share page (api/title.js), which is the URL search engines should index.
 * vercel.json rewrites /sitemap.xml here.
 *
 * TMDB_API_KEY in the Vercel project settings overrides the app's public key.
 */

const PUBLIC_TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96'
const PAGES = 5 // 20 titles per list and page

function esc(value){
    return String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

async function list(key, media, sort){
    let calls = []

    for(let page = 1; page <= PAGES; page++){
        calls.push(fetch(`https://api.themoviedb.org/3/${media}/${sort}?language=uk-UA&page=${page}&api_key=${encodeURIComponent(key)}`)
            .then(r => r.ok ? r.json() : {results: []})
            .catch(() => ({results: []})))
    }

    let pages = await Promise.all(calls)

    return pages.flatMap(p => p.results || []).map(item => ({id: item.id, media, date: item.release_date || item.first_air_date || ''}))
}

module.exports = async (req, res) => {
    let base = 'https://' + req.headers.host
    let key  = process.env.TMDB_API_KEY || PUBLIC_TMDB_KEY

    let lists = await Promise.all([
        list(key, 'movie', 'popular'),
        list(key, 'movie', 'top_rated'),
        list(key, 'tv', 'popular'),
        list(key, 'tv', 'top_rated')
    ])

    // a title can sit in several lists: keep each once
    let seen = new Map()

    lists.flat().forEach(item => {
        let k = item.media + item.id

        if(!seen.has(k)) seen.set(k, item)
    })

    let urls = [...seen.values()].map(item => {
        let loc = base + '/?' + new URLSearchParams({card: item.id, media: item.media, source: 'tmdb'}).toString()
        let lastmod = item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? `<lastmod>${item.date}</lastmod>` : ''

        return `  <url><loc>${esc(loc)}</loc>${lastmod}</url>`
    })

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>${esc(base + '/')}</loc></url>
${urls.join('\n')}
</urlset>
`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    res.status(200).send(xml)
}

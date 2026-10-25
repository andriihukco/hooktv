import {ImageResponse} from '@vercel/og'

/**
 * Link-preview image for one title (1200×630, the large card size Telegram,
 * Facebook and X show): the real poster, title, rating, year, runtime, age
 * rating, genres and a short overview over the dimmed backdrop, in the app's
 * Google Sans with the HOOK TV logo. api/title.js points og:image here.
 *
 * TMDB_API_KEY in the Vercel project settings overrides the app's public key.
 */

export const config = {runtime: 'edge'}

// the same public key the web app ships with
const PUBLIC_TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96'
const LIME = '#D6FF5C'
const W = 1200
const H = 630

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

// age rating: Ukraine's when TMDB has it, else the US one
function age(data, media){
    let pick = (list, field)=>{
        for(let country of ['UA', 'US']){
            let entry = (list || []).find(r=>r.iso_3166_1 == country)
            let value = entry && (field ? (entry.release_dates || []).map(d=>d.certification).find(Boolean) : entry.rating)

            if(value) return value
        }

        return ''
    }

    return media == 'tv' ? pick(data.content_ratings && data.content_ratings.results) : pick(data.release_dates && data.release_dates.results, true)
}

function clip(text, max){
    text = (text || '').replace(/\s+/g, ' ').trim()

    // cut at a word and drop trailing punctuation, so it never reads "Перстень.…"
    return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '').replace(/[\s.,;:!?—-]+$/, '') + '…' : text
}

// Satori takes plain element objects, so no JSX build step is needed
function h(type, style, ...children){
    let props = {style}

    children = children.flat().filter(c=>c !== null && c !== undefined && c !== false && c !== '')

    if(children.length) props.children = children.length == 1 ? children[0] : children

    return {type, props}
}

function img(src, style){
    return {type: 'img', props: {src, style}}
}

const STAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${LIME}" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>`)
const PLAY = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M7 4.5v15l12-7.5z"/></svg>')

// Google Sans cut down to exactly the characters on this card (the full font is far larger)
async function font(text, weight){
    let css = await fetch(`https://fonts.googleapis.com/css2?family=Google+Sans:wght@${weight}&text=${encodeURIComponent(text)}`).then(r=>r.text())
    let url = (css.match(/src: url\((.+?)\) format/) || [])[1]

    if(!url) throw new Error('no font for weight ' + weight)

    return fetch(url).then(r=>r.arrayBuffer())
}

function card(t, logo){
    let facts = [t.year, t.length].filter(Boolean)

    return h('div', {display: 'flex', width: W, height: H, position: 'relative', background: '#000', color: '#fff', fontFamily: 'Google Sans'},
        t.backdrop ? img(t.backdrop, {position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover', opacity: 0.55}) : null,
        h('div', {position: 'absolute', top: 0, left: 0, width: W, height: H, display: 'flex', backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.55) 100%)'}),

        h('div', {display: 'flex', alignItems: 'center', width: W, height: H, padding: 56, gap: 52},
            t.poster
                ? img(t.poster, {width: 334, height: 501, borderRadius: 26, objectFit: 'cover', boxShadow: '0 24px 60px rgba(0,0,0,0.6)'})
                : null,

            h('div', {display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, height: 501},
                h('div', {display: 'flex', flexDirection: 'column'},
                    img(logo, {width: 158, height: 30, marginBottom: 30}),

                    h('div', {fontSize: t.name.length > 34 ? 50 : 62, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5}, t.name),

                    h('div', {display: 'flex', alignItems: 'center', gap: 22, marginTop: 24, fontSize: 30, color: 'rgba(255,255,255,0.85)'},
                        t.rating ? h('div', {display: 'flex', alignItems: 'center', gap: 8, color: LIME, fontWeight: 700},
                            img(STAR, {width: 30, height: 30}),
                            t.rating
                        ) : null,
                        facts.map(f=>h('div', {display: 'flex'}, f)),
                        t.age ? h('div', {display: 'flex', padding: '2px 10px', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 8, fontSize: 24}, t.age) : null
                    ),

                    t.genres ? h('div', {display: 'flex', marginTop: 12, fontSize: 26, color: 'rgba(255,255,255,0.55)'}, t.genres) : null,

                    t.overview ? h('div', {display: 'flex', marginTop: 22, fontSize: 25, lineHeight: 1.4, color: 'rgba(255,255,255,0.8)'}, t.overview) : null
                ),

                h('div', {display: 'flex'},
                    h('div', {display: 'flex', alignItems: 'center', gap: 12, padding: '14px 30px', borderRadius: 999, background: LIME, color: '#000', fontSize: 28, fontWeight: 700},
                        img(PLAY, {width: 26, height: 26}),
                        t.cta
                    )
                )
            )
        )
    )
}

export async function title(media, id, key){
    let res = await fetch(`https://api.themoviedb.org/3/${media}/${id}?language=uk-UA&append_to_response=release_dates,content_ratings&api_key=${encodeURIComponent(key)}`)

    if(!res.ok) return null

    let data = await res.json()
    let name = data.title || data.name

    if(!name) return null

    let vote = data.vote_average ? data.vote_average.toFixed(1) : ''

    return {
        name: clip(name, 60),
        year: (data.release_date || data.first_air_date || '').slice(0, 4),
        rating: vote && vote != '0.0' ? vote : '',
        length: runtime(data, media),
        age: age(data, media),
        genres: (data.genres || []).slice(0, 3).map(g=>g.name.charAt(0).toUpperCase() + g.name.slice(1)).join(' · '),
        overview: clip(data.overview, 150),
        poster: data.poster_path ? 'https://image.tmdb.org/t/p/w500' + data.poster_path : '',
        backdrop: data.backdrop_path ? 'https://image.tmdb.org/t/p/w1280' + data.backdrop_path : '',
        cta: 'Дивитися українською'
    }
}

export default async function handler(req){
    let url   = new URL(req.url)
    let id    = url.searchParams.get('card') || ''
    let media = url.searchParams.get('media') === 'tv' ? 'tv' : 'movie'
    let key   = (typeof process !== 'undefined' && process.env && process.env.TMDB_API_KEY) || PUBLIC_TMDB_KEY
    let plain = Response.redirect(new URL('/img/og.png', url), 302)

    if(!/^\d{1,12}$/.test(id)) return plain

    try{
        let t = await title(media, id, key)

        if(!t) return plain

        let text = [t.name, t.year, t.rating, t.length, t.age, t.genres, t.overview, t.cta].join(' ')
        let [regular, bold] = await Promise.all([font(text, 400), font(text, 700)])

        return new ImageResponse(card(t, new URL('/img/logo.svg', url).toString()), {
            width: W,
            height: H,
            fonts: [
                {name: 'Google Sans', data: regular, weight: 400, style: 'normal'},
                {name: 'Google Sans', data: bold, weight: 700, style: 'normal'}
            ],
            headers: {
                'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800'
            }
        })
    }
    catch(e){
        return plain
    }
}

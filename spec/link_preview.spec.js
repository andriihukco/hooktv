import {expect, suite, test, vi, afterEach} from 'vitest'
import {createRequire} from 'module'
import middleware, {BOTS} from '../middleware.js'

const title = createRequire(import.meta.url)('../api/title.js')

function run(url){
    let res = {headers: {}, setHeader(k, v){ this.headers[k] = v }, status(c){ this.code = c; return this }, send(b){ this.body = b }}

    return title({url, headers: {host: 'hook.tv'}}, res).then(()=>res)
}

afterEach(()=>vi.unstubAllGlobals())

suite('link previews', ()=>{
    test('only preview bots are routed to api/title', ()=>{
        expect(BOTS.test('TelegramBot (like TwitterBot)')).toBe(true)
        expect(BOTS.test('facebookexternalhit/1.1')).toBe(true)
        expect(BOTS.test('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1')).toBe(false)

        let bot = middleware(new Request('https://hook.tv/?card=7', {headers: {'user-agent': 'Viber'}}))

        expect(bot.headers.get('x-middleware-rewrite')).toBe('https://hook.tv/api/title?card=7&preview=1')
        expect(middleware(new Request('https://hook.tv/', {headers: {'user-agent': 'Mozilla/5.0 Chrome/130'}}))).toBeUndefined()
    })

    test('home page gets the branded card with absolute image', async ()=>{
        let res = await run('/api/title?preview=1')

        expect(res.body).toContain('<meta property="og:image" content="https://hook.tv/img/og.png">')
        expect(res.body).toContain('<meta property="og:url" content="https://hook.tv/">')
        expect(res.body).not.toContain('http-equiv="refresh"')
    })

    test('movie page uses TMDB title, year, rating and genres, the card image, and escapes text', async ()=>{
        vi.stubGlobal('fetch', async ()=>({ok: true, json: async ()=>({title: 'Надія <b>', release_date: '2026-01-02', overview: 'Опис', backdrop_path: '/b.jpg', vote_average: 6.84, genres: [{name: 'фантастика'}, {name: 'Детектив'}]})}))

        let res = await run('/api/title?card=42&media=movie&source=tmdb')

        expect(res.body).toContain('content="Надія &lt;b&gt; (2026)"')
        expect(res.body).toContain('<meta property="og:description" content="★ 6.8 · Фантастика · Детектив. Опис">')
        expect(res.body).toContain('<meta property="og:image" content="https://hook.tv/api/og?card=42&amp;media=movie">')
        expect(res.body).toContain('<meta property="og:image:width" content="1200">')
        expect(res.body).toContain('<meta property="og:type" content="video.movie">')
        expect(res.body).toContain('http-equiv="refresh" content="0; url=/?card=42&amp;media=movie&amp;source=tmdb"')
    })

    test('movie page has readable content and schema.org data, and cannot break out of the script', async ()=>{
        vi.stubGlobal('fetch', async ()=>({ok: true, json: async ()=>({title: 'Фільм </script><b>', release_date: '2003-12-17', overview: 'Опис', poster_path: '/p.jpg', vote_average: 8.5, vote_count: 1200, runtime: 201, genres: [{name: 'пригоди'}], credits: {cast: [{name: 'Актор А'}], crew: [{name: 'Режисер Р', job: 'Director'}]}})}))

        let res = await run('/api/title?card=122&media=movie&source=tmdb')
        let ld = res.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)

        expect(ld).not.toBeNull()
        expect(ld[1]).not.toContain('</script>')
        let data = JSON.parse(ld[1])

        expect(data['@type']).toBe('Movie')
        expect(data.aggregateRating.ratingValue).toBe(8.5)
        expect(data.aggregateRating.ratingCount).toBe(1200)
        expect(data.director[0].name).toBe('Режисер Р')
        expect(res.body).toContain('<h1>Фільм &lt;/script&gt;&lt;b&gt; (2003)</h1>')
        expect(res.body).toContain('У ролях: Актор А')
    })

    test('non-numeric card ids are not reflected', async ()=>{
        let res = await run('/api/title?card=<script>')

        expect(res.body).not.toContain('<script>')
        expect(res.body).toContain('content="HOOK TV"')
    })
})

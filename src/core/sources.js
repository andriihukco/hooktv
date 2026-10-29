import Dub from '../utils/dub'

/**
 * HOOK TV: registry for licensed / self-hosted stream providers (plugins).
 *
 * A provider is a plain object:
 *   {
 *     name: 'my-cdn',
 *     search(query)  -> Promise<item[]>   item: {id, title, original_title, year, poster, rating}
 *     streams(id)    -> Promise<stream[]> stream: {url, quality?, audio?: [{label, language?}], subtitles?: [{label, url}]}
 *   }
 * Play the result with Lampa.Player.play(Lampa.Sources.playData(stream, item)).
 */

const TIMEOUT = 10000

let providers = []

function register(provider){
    if(!provider || !provider.name || typeof provider.search !== 'function' || typeof provider.streams !== 'function'){
        throw new Error('Sources: provider needs name, search() and streams()')
    }

    providers = providers.filter(p=>p.name !== provider.name).concat(provider)
}

function remove(name){
    providers = providers.filter(p=>p.name !== name)
}

function list(){
    return providers.slice()
}

// a slow or broken provider must not hold up the others
function timed(promise, ms = TIMEOUT){
    let timer

    return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject)=>{ timer = setTimeout(()=>reject(new Error('timeout')), ms) })
    ]).finally(()=>clearTimeout(timer))
}

function normalizeItem(raw, provider){
    return {
        provider,
        id: String(raw.id),
        title: raw.title || raw.name || '',
        original_title: raw.original_title || raw.original_name || '',
        year: parseInt(raw.year) || 0,
        poster: raw.poster || '',
        rating: parseFloat(raw.rating) || 0
    }
}

function normalizeStream(raw, provider){
    let audio = (raw.audio || [])
        .filter(a=>Dub.allowedTrack([a.language, a.label, a.name].filter(Boolean).join(' ')))
        .map(a=>({
            label: a.label || a.name || '',
            language: a.language || '',
            uk: Dub.classify([a.language, a.label, a.name].filter(Boolean).join(' ')) == 'uk'
        }))

    return {
        provider,
        url: raw.url,
        quality: raw.quality || '',
        audio,
        uk: audio.some(a=>a.uk),
        subtitles: (raw.subtitles || []).filter(s=>s && s.url).map(s=>({label: s.label || s.url.split('/').pop(), url: s.url}))
    }
}

/**
 * Ask every provider at once; failures and timeouts are dropped.
 * @returns {Promise<object[]>}
 */
function search(query){
    return Promise.allSettled(providers.map(p=>timed(p.search(query)).then(items=>(items || []).map(i=>normalizeItem(i, p.name)))))
        .then(results=>results.flatMap(r=>r.status == 'fulfilled' ? r.value : []))
}

/**
 * Streams for an item from search(), Ukrainian audio first. A stream with no
 * English or Ukrainian track is dropped, so Russian audio never plays.
 * @returns {Promise<object[]>}
 */
function streams(item){
    let provider = providers.find(p=>p.name == item.provider)

    if(!provider) return Promise.resolve([])

    return timed(provider.streams(item.id))
        .then(list=>(list || []).filter(s=>s && s.url).map(s=>normalizeStream(s, provider.name)))
        .then(list=>list.filter(s=>s.audio.length).sort((a, b)=>b.uk - a.uk))
        .catch(()=>[])
}

/**
 * Data for Player.play: external subtitles go through the player's own srt/vtt loader,
 * and `hooktv: 'uk'` makes the player start on the Ukrainian audio track.
 */
function playData(stream, item = {}){
    return {
        url: stream.url,
        title: item.title || '',
        quality: stream.quality ? {[stream.quality]: stream.url} : undefined,
        subtitles: stream.subtitles.length ? stream.subtitles : undefined,
        hooktv: 'uk'
    }
}

export default {
    register,
    remove,
    list,
    search,
    streams,
    playData
}

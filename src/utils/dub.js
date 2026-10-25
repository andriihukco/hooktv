/**
 * HOOK TV dub helpers: tell Ukrainian, Russian and original audio apart by
 * voice / track names so Watch can pick a source without asking the user.
 */

const UK = /укр|україн|ukr|\bua\b|\buk\b/i
const RU = /рус|росій|russian|\brus?\b/i
const ORIGINAL = /оригін|original|\beng|англ|english|без перекладу/i

// Sources that only carry Ukrainian voices
const UK_SOURCES = ['uaflix', 'uatut', 'makhno', 'petlura', 'bambooua', 'starlight', 'midnight', 'ashdibase', 'uakino', 'uafilmme', 'moviestape', 'franko', 'sirko', 'animeon', 'mikai']

/**
 * @param {string} name voice or track label
 * @param {string} [source] source key
 * @returns {'uk'|'ru'|'original'|'unknown'}
 */
function classify(name, source){
    let text = (name || '') + ''

    if(RU.test(text)) return 'ru'
    if(ORIGINAL.test(text)) return 'original'
    if(UK.test(text)) return 'uk'
    if(source && UK_SOURCES.indexOf(source) >= 0) return 'uk'

    return 'unknown'
}

function score(name){
    let text = (name || '').toLowerCase()

    if(/дубляж|dub/.test(text)) return 3
    if(/багатоголос|multi/.test(text)) return 2
    if(/двоголос|одноголос/.test(text)) return 1

    return 0
}

const ENGLISH = /\beng|english|англ/i

/**
 * Only English and Ukrainian tracks may reach the player. Russian and every
 * other language are dropped, and so is a track that cannot be named.
 * @param {string} name track label, language code or both
 */
function allowedTrack(name){
    let text = (name || '') + ''

    if(RU.test(text)) return false

    return UK.test(text) || ENGLISH.test(text)
}

/**
 * Voices that fit the wanted language, best first. Russian never passes.
 * For "original" the Ukrainian voices are kept as a fallback, because the
 * original audio usually lives as a second track inside the same stream.
 * @param {{name:string}[]} voices
 * @param {'uk'|'original'} want
 * @param {string} [source]
 */
function pickVoices(voices, want, source){
    let list = voices.map((v, index)=>({...v, index, lang: classify(v.name, source)})).filter(v=>v.lang !== 'ru')

    let rank = (v)=>{
        let lang = v.lang == want ? 2 : v.lang == 'uk' || v.lang == 'unknown' && source && UK_SOURCES.indexOf(source) >= 0 ? 1 : 0

        // a stream that mentions eng next to ukr is a multi-track release, best for "original"
        let multi = want == 'original' && /eng/i.test(v.hint || '') ? 1 : 0

        return lang * 10 + multi * 5 + score(v.name)
    }

    // unknown voices on mixed sources may be Russian studios, so they never pass
    return list.filter(v=>rank(v) >= 10).sort((a, b)=>rank(b) - rank(a))
}

/**
 * Index of the audio / subtitle track to start on, or -1 to keep the default.
 * @param {{label?:string,name?:string,language?:string,lang?:string}[]} tracks
 * @param {'uk'|'original'} want
 */
function pickTrack(tracks, want){
    let langs = tracks.map(t=>classify([t.language, t.lang, t.label, t.name].filter(Boolean).join(' ')))

    let index = langs.indexOf(want)

    if(index == -1 && want == 'original') index = langs.indexOf('unknown')

    return index
}

function getYear(movie){
    return parseInt((movie.release_date || movie.first_air_date || '0000').slice(0, 4)) || 0
}

/**
 * Search results that can be the movie, best first. A result whose year is
 * known and more than a year off is a different film (a remake), never a match.
 * @param {{title?:string,orig_title?:string,year?:number|string}[]} list
 * @param {{title?:string,name?:string,original_title?:string,original_name?:string,release_date?:string,first_air_date?:string}} movie
 */
function rankSimilar(list, movie){
    let year  = getYear(movie)
    let names = [movie.title, movie.name, movie.original_title, movie.original_name].filter(Boolean).map(n=>n.toLowerCase())

    let rank = (item)=>{
        let text = [item.title, item.orig_title].filter(Boolean).join(' / ').toLowerCase()
        let same = names.some(n=>text.split(' / ').indexOf(n) >= 0) ? 2 : names.some(n=>text.indexOf(n) >= 0) ? 1 : 0

        if(item.year && year && Math.abs(parseInt(item.year) - year) > 1) return -1

        return same * 2 + (item.year && year ? 1 : 0)
    }

    return list.map(item=>({item, rank: rank(item)})).filter(r=>r.rank >= 2).sort((a, b)=>b.rank - a.rank).map(r=>r.item)
}

/**
 * Best match from a list of search results for the movie.
 */
function pickSimilar(list, movie){
    return rankSimilar(list, movie)[0] || null
}

/**
 * Whether loaded content is this movie and not another film of the same name.
 * Balancers often drop the year from search, but the release file name keeps
 * it («night_of_the_living_dead_1990_bdremux»), and the runtime gives remakes
 * and different cuts away. Unknown means yes: only clear evidence rejects.
 * @param {{type?:string,info?:{duration?:number},streams?:{title?:string,raw?:{url?:string,title?:string}}[]}} json /content reply
 * @param {{runtime?:number,release_date?:string,name?:string}} movie TMDB card
 */
function contentMatches(json, movie){
    if(!json || json.type == 'series' || movie.name) return true

    let year = getYear(movie)
    let text = (json.streams || []).map(s=>[s.title, s.raw && s.raw.url, s.raw && s.raw.title].join(' ')).join(' ')
    let found = []

    text.replace(/[._\-\s(]((?:19|20)\d{2})(?=[._\-\s)])/g, (m, y)=>found.push(parseInt(y)))

    if(year && found.length && !found.some(y=>Math.abs(y - year) <= 1)) return false

    let duration = json.info && json.info.duration
    let runtime  = movie.runtime

    // a quarter off is a different film, not a director's cut or credits
    if(duration > 0 && runtime > 0 && Math.abs(duration / 60 - runtime) > runtime * 0.25) return false

    return true
}

export default {
    classify,
    allowedTrack,
    pickVoices,
    pickTrack,
    rankSimilar,
    pickSimilar,
    contentMatches
}

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

/**
 * Best match from a list of search results for the movie.
 * @param {{title?:string,orig_title?:string,year?:number|string}[]} list
 * @param {{title?:string,name?:string,original_title?:string,original_name?:string,release_date?:string,first_air_date?:string}} movie
 */
function pickSimilar(list, movie){
    let year  = parseInt((movie.release_date || movie.first_air_date || '0000').slice(0, 4))
    let names = [movie.title, movie.name, movie.original_title, movie.original_name].filter(Boolean).map(n=>n.toLowerCase())

    let rank = (item)=>{
        let text = [item.title, item.orig_title].filter(Boolean).join(' / ').toLowerCase()
        let same = names.some(n=>text.split(' / ').indexOf(n) >= 0) ? 2 : names.some(n=>text.indexOf(n) >= 0) ? 1 : 0
        let near = item.year ? (Math.abs(parseInt(item.year) - year) <= 1 ? 1 : -1) : 0

        return same * 2 + near
    }

    let best = list.map(item=>({item, rank: rank(item)})).sort((a, b)=>b.rank - a.rank)[0]

    return best && best.rank >= 2 ? best.item : null
}

export default {
    classify,
    pickVoices,
    pickTrack,
    pickSimilar
}

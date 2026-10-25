import Storage from '../core/storage/storage'
import TMDB from '../core/tmdb/tmdb'
import Api from '../core/api/api'

/**
 * HOOK TV: details list cards lack (runtime, age rating, status) plus the title
 * logo in the interface language, in one cached TMDB request per title.
 * A logo is used only in the interface language, so a Ukrainian screen never
 * shows an English logo; without one the text title stays.
 */

let cache = {}

function pickLogo(logos, lang){
    let logo = (logos || []).find(l=>l.iso_639_1 == lang)

    return logo ? Api.img(logo.file_path.replace('.svg', '.png'), 'w500') : ''
}

/**
 * @param {{id:number, name?:string}} card list card or full card
 * @returns {Promise<{logo:string, runtime:number, pg:string, status:string, genres:string[]}|null>}
 */
function get(card){
    if(!card || !card.id) return Promise.resolve(null)

    let type = card.name ? 'tv' : 'movie'
    let key  = type + card.id

    if(!cache[key]){
        let lang = Storage.get('language', 'en')
        let more = type == 'tv' ? 'content_ratings' : 'release_dates'
        let url  = TMDB.api(type + '/' + card.id + '?api_key=' + TMDB.key() + '&language=' + lang + '&append_to_response=images,' + more + '&include_image_language=' + lang)

        cache[key] = new Promise(resolve=>{
            $.get(url, (full)=>{
                resolve({
                    logo: pickLogo(full.images && full.images.logos, lang),
                    runtime: full.runtime || (full.episode_run_time && full.episode_run_time[0]) || 0,
                    pg: Api.sources.tmdb.parsePG(full) || '',
                    status: full.status || '',
                    genres: (full.genres || []).map(g=>g.name),
                    // list cards carry a country only for series; the library filter reads it from here
                    countries: (full.origin_country || []).concat((full.production_countries || []).map(c=>c.iso_3166_1)).filter((c, i, all)=>all.indexOf(c) == i)
                })
            }).fail(()=>{
                // a failed lookup may succeed later, so do not cache it
                delete cache[key]
                resolve(null)
            })
        })
    }

    return cache[key]
}

export default {
    get,
    pickLogo
}

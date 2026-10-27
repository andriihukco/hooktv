/**
 * TMDB metadata by TMDB id. Metadata only: no playback data is read or stored here.
 *
 * createMetadata({key, fetch, language}) returns:
 *   movie(id), series(id)            -> normalized title with imdb_id
 *   search(query, kind, year)        -> normalized results for 'movie' | 'series'
 *   externalIds(kind, id)            -> {imdb_id, tvdb_id, ...} as TMDB reports them
 */

const API = 'https://api.themoviedb.org/3/'
const TTL = 60 * 60 * 1000

function kindPath(kind){
    return kind == 'series' ? 'tv' : 'movie'
}

function year(date){
    let y = parseInt(String(date || '').slice(0, 4), 10)

    return isNaN(y) ? null : y
}

function normalize(kind, data){
    let external = data.external_ids || {}

    return {
        id:             data.id,
        kind:           kind,
        title:          kind == 'series' ? data.name : data.title,
        original_title: kind == 'series' ? data.original_name : data.original_title,
        original_language: data.original_language || '',
        year:           year(kind == 'series' ? data.first_air_date : data.release_date),
        overview:       data.overview || '',
        genres:         (data.genres || []).map(g=>g.name),
        runtime:        kind == 'series' ? (data.episode_run_time || [])[0] || null : data.runtime || null,
        seasons:        kind == 'series' ? data.number_of_seasons || 0 : 0,
        rating:         data.vote_average || 0,
        votes:          data.vote_count || 0,
        poster:         data.poster_path || '',
        backdrop:       data.backdrop_path || '',
        imdb_id:        data.imdb_id || external.imdb_id || ''
    }
}

export function createMetadata({key, fetch: request = fetch, language = 'en-US'} = {}){
    let cache = new Map()

    function get(path, params = {}){
        let query = new URLSearchParams({api_key: key, language, ...params})
        let url   = API + path + '?' + query.toString()
        let hit   = cache.get(url)

        if(hit && Date.now() - hit.at < TTL) return hit.promise

        let promise = request(url).then(response=>{
            if(!response.ok) throw new Error('TMDB ' + response.status + ' ' + path)

            return response.json()
        })

        cache.set(url, {at: Date.now(), promise})

        promise.catch(()=>cache.delete(url))

        return promise
    }

    function details(kind, id){
        let type = kindPath(kind)

        return get(type + '/' + encodeURIComponent(id), {append_to_response: 'external_ids'})
            .then(data=>normalize(kind, data))
    }

    return {
        movie(id){
            return details('movie', id)
        },

        series(id){
            return details('series', id)
        },

        search(query, kind = 'movie', yearHint){
            let type   = kindPath(kind)
            let params = {query: String(query || '')}

            if(yearHint) params[type == 'tv' ? 'first_air_date_year' : 'year'] = String(yearHint)

            return get('search/' + type, params).then(data=>(data.results || []).map(item=>normalize(kind, item)))
        },

        externalIds(kind, id){
            return get(kindPath(kind) + '/' + encodeURIComponent(id) + '/external_ids')
        }
    }
}

export default {createMetadata}

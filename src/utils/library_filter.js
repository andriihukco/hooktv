/**
 * HOOK TV: filters for the Saved and History pages. Pure card matching, so the
 * favorites API, the Saved rows and the filter panel all agree on one result.
 *
 * A filter is {rating: [min, max], year: [min, max], genres: [id], countries: [code]}.
 * Any bound may be null (open), empty lists mean "any".
 */

function year(card){
    return parseInt(((card.release_date || card.first_air_date || '') + '').slice(0, 4), 10) || 0
}

function genres(card){
    if(Array.isArray(card.genre_ids)) return card.genre_ids
    if(Array.isArray(card.genres)) return card.genres.map(g=>typeof g == 'object' ? g.id : g)

    return []
}

function countries(card){
    let list = (card.origin_country || []).concat((card.production_countries || []).map(c=>c.iso_3166_1))

    return list.filter((code, i)=>code && list.indexOf(code) == i)
}

function inRange(value, range){
    if(!range) return true

    let [min, max] = range

    if(min != null && value < min) return false
    if(max != null && value > max) return false

    return true
}

function empty(){
    return {rating: [null, null], year: [null, null], genres: [], countries: []}
}

/** number of filter groups that narrow the list, for the pill badge */
function count(f){
    if(!f) return 0

    let range = (r)=>r && (r[0] != null || r[1] != null) ? 1 : 0

    return range(f.rating) + range(f.year) + (f.genres && f.genres.length ? 1 : 0) + (f.countries && f.countries.length ? 1 : 0)
}

function match(card, f){
    if(!f || !card) return true

    // a bound on a value the card does not have (no rating, no date) keeps it out
    let rating = parseFloat(card.vote_average || 0)

    if(f.rating && (f.rating[0] != null || f.rating[1] != null) && (!rating || !inRange(rating, f.rating))) return false

    let y = year(card)

    if(f.year && (f.year[0] != null || f.year[1] != null) && (!y || !inRange(y, f.year))) return false

    // several genres: the card needs any of them; same for countries
    if(f.genres && f.genres.length && !genres(card).some(id=>f.genres.indexOf(id) >= 0)) return false
    if(f.countries && f.countries.length && !countries(card).some(code=>f.countries.indexOf(code) >= 0)) return false

    return true
}

function apply(list, f){
    return count(f) ? list.filter(card=>match(card, f)) : list
}

/** genres, countries and year span found in the cards, to build the panel from */
function options(list){
    let g = {}
    let c = {}
    let years = []

    list.forEach(card=>{
        genres(card).forEach(id=>g[id] = (g[id] || 0) + 1)
        countries(card).forEach(code=>c[code] = (c[code] || 0) + 1)

        let y = year(card)

        if(y) years.push(y)
    })

    // most common first, so the chips people need sit on top
    let sorted = (map)=>Object.keys(map).sort((a, b)=>map[b] - map[a])

    return {
        genres: sorted(g).map(Number),
        countries: sorted(c),
        years: years.length ? [Math.min(...years), Math.max(...years)] : null
    }
}

// countries offered on TMDB-backed pages, where the full result set is not known up front
const COUNTRIES = ['US', 'GB', 'UA', 'FR', 'DE', 'IT', 'ES', 'JP', 'KR', 'CN', 'IN', 'CA', 'AU', 'PL', 'SE', 'DK', 'NO', 'FI', 'IE', 'NL', 'BE', 'TR', 'MX', 'BR', 'AR', 'NZ', 'HK', 'TW', 'TH']

function type(path){
    return /(^|\/)tv(\/|\?|$)/.test(path) ? 'tv' : 'movie'
}

/**
 * Turns a TMDB list path (movie/popular, trending/tv/week, discover/movie?...) into a
 * discover query that applies the filter on TMDB's side, so every page is full.
 * Several genres or countries match any of them (TMDB's "|"); the filter's genres
 * replace a genre the page already had.
 * @param {string} path
 * @param {object} f
 * @returns {string}
 */
function discover(path, f){
    let kind  = type(path)
    let query = path.indexOf('?') >= 0 ? path.split('?')[1].split('&').filter(Boolean) : []
    let put   = (key, value)=>{
        query = query.filter(q=>q.split('=')[0] !== key)
        query.push(key + '=' + value)
    }

    let date = kind == 'tv' ? 'first_air_date' : 'primary_release_date'

    if(path.indexOf('discover/') !== 0){
        query = []

        put('sort_by', /top_rated/.test(path) ? 'vote_average.desc' : 'popularity.desc')

        if(/top_rated/.test(path)) put('vote_count.gte', 300)

        // a filtered list keeps what it was: in cinemas now, coming soon, on air this week
        let day = (shift)=>new Date(Date.now() + shift * 86400000).toISOString().slice(0, 10)

        if(/now_playing/.test(path)){
            put('primary_release_date.gte', day(-42))
            put('primary_release_date.lte', day(0))
            put('with_release_type', '2|3')
        }

        if(/upcoming/.test(path)){
            put('primary_release_date.gte', day(1))
            put('with_release_type', '2|3')
        }

        if(/on_the_air|airing_today/.test(path)){
            put('air_date.gte', day(/airing_today/.test(path) ? 0 : -7))
            put('air_date.lte', day(/airing_today/.test(path) ? 0 : 7))
        }
    }

    if(f.rating && f.rating[0] != null) put('vote_average.gte', f.rating[0])
    if(f.rating && f.rating[1] != null) put('vote_average.lte', f.rating[1])

    // a rating bound means little on titles with a handful of votes
    if(f.rating && (f.rating[0] != null || f.rating[1] != null) && !query.some(q=>q.indexOf('vote_count.gte=') == 0)) put('vote_count.gte', 50)

    if(f.year && f.year[0] != null) put(date + '.gte', f.year[0] + '-01-01')
    if(f.year && f.year[1] != null) put(date + '.lte', f.year[1] + '-12-31')

    if(f.genres && f.genres.length) put('with_genres', f.genres.join('|'))
    if(f.countries && f.countries.length) put('with_origin_country', f.countries.join('|'))

    return 'discover/' + kind + '?' + query.join('&')
}

// the filter of the open search overlay (it has no activity to keep it on)
let search = {filter: null, query: '', results: []}

export default {
    COUNTRIES,
    empty,
    count,
    match,
    apply,
    options,
    type,
    discover,
    search
}

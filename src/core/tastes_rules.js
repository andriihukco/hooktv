/**
 * HOOK TV: pure rules for the Tastes profile. No imports, so they run in node tests.
 * Any-match everywhere: a title needs one of the chosen genres or countries.
 */

function defaults(){
    return {
        genres: [],
        countries: [],
        actors: [],
        min_rating: 0,
        verdicts: {},
        wizard_done: false,
        updated: 0
    }
}

function isObject(value){
    return value !== null && typeof value == 'object' && !Array.isArray(value)
}

function list(value, check){
    return Array.isArray(value) ? value.filter(check) : []
}

function normalize(raw){
    if(!isObject(raw)) return defaults()

    let base = defaults()
    let rating = Number(raw.min_rating)

    return {
        genres: list(raw.genres, a=>typeof a == 'number'),
        countries: list(raw.countries, a=>typeof a == 'string'),
        actors: list(raw.actors, a=>isObject(a) && typeof a.id == 'number'),
        min_rating: rating > 0 && rating <= 10 ? rating : base.min_rating,
        verdicts: isObject(raw.verdicts) ? raw.verdicts : base.verdicts,
        wizard_done: raw.wizard_done === true,
        updated: typeof raw.updated == 'number' ? raw.updated : base.updated
    }
}

function isTV(card){
    return !!(card.first_air_date || card.number_of_seasons || (card.name && !card.title))
}

function mediaOf(card){
    return isTV(card) ? 'tv' : 'movie'
}

function verdictKey(card){
    return mediaOf(card) + ':' + card.id
}

function genreIds(card){
    return card.genre_ids || (card.genres || []).map(g=>g.id)
}

function countriesOf(card){
    return card.origin_country || []
}

function shares(a, b){
    return a.some(x=>b.indexOf(x) >= 0)
}

function match(profile, card){
    let verdict = profile.verdicts[verdictKey(card)]

    if(verdict && verdict.verdict == 'dislike') return false

    if(profile.min_rating > 0){
        if(typeof card.vote_average != 'number' || card.vote_average < profile.min_rating) return false
    }

    if(profile.genres.length && !shares(genreIds(card), profile.genres)) return false

    if(profile.countries.length && !shares(countriesOf(card), profile.countries)) return false

    return true
}

function score(profile, card){
    let points = 0
    let verdict = profile.verdicts[verdictKey(card)]

    if(verdict && verdict.verdict == 'like') points += 10

    points += shares(genreIds(card), profile.genres) ? 2 : 0
    points += shares(countriesOf(card), profile.countries) ? 1 : 0

    return points
}

function apply(profile, results){
    if(!Array.isArray(results)) return []

    return results
        .filter(card=>match(profile, card))
        .map((card, index)=>({card, index, points: score(profile, card)}))
        .sort((a, b)=>b.points - a.points || a.index - b.index)
        .map(item=>item.card)
}

function discoverParams(profile, media){
    let params = {}

    if(profile.genres.length) params.with_genres = profile.genres.join('|')
    if(profile.countries.length) params.with_origin_country = profile.countries.join('|')
    if(profile.actors.length) params.with_cast = profile.actors.map(a=>a.id).join('|')
    if(profile.min_rating > 0) params['vote_average.gte'] = profile.min_rating

    return params
}

/**
 * Append the params as '&key=value' pairs, skipping keys the caller already sets
 */
function queryString(params, taken = []){
    return Object.keys(params)
        .filter(key=>taken.indexOf(key) < 0)
        .map(key=>'&' + key + '=' + encodeURIComponent(params[key]))
        .join('')
}

export {defaults, normalize, mediaOf, verdictKey, match, score, apply, discoverParams, queryString}

export default {defaults, normalize, mediaOf, verdictKey, match, score, apply, discoverParams, queryString}

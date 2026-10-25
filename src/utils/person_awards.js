import Utils from './utils'
import TMDBApi from '../core/tmdb/tmdb'
import Profile from './person_profile'

// Wikidata holds the awards that TMDB does not: the Oscars, the Emmys and the rest, with their years
const API = 'www.wikidata.org/w/api.php'

// wbgetentities takes at most this many ids per request
const BATCH = 50

function get(params, callback){
    let query = Object.keys(params).map(key=>key + '=' + encodeURIComponent(params[key])).join('&')

    $.get(Utils.protocol() + API + '?' + query + '&format=json&origin=*', callback)
}

// names of the awards and works in the interface language, English where there is none
function names(ids, code, callback){
    let map = {}
    let batch = ids.slice(0, BATCH)

    get({
        action: 'wbgetentities',
        props: 'labels',
        ids: batch.join('|'),
        languages: code == 'en' ? 'en' : code + '|en'
    }, (json)=>{
        let entities = json && json.entities || {}

        batch.forEach(id=>{
            let labels = entities[id] && entities[id].labels || {}
            let label  = labels[code] || labels.en

            if(label) map[id] = label.value
        })

        callback(map)
    })
}

/**
 * Awards of a person, from Wikidata by their TMDB id
 * @param {number} id TMDB person id
 * @param {string} code interface language
 * @param {function(object[])} callback receives the awards, newest first; empty when there are none or no data
 */
function load(id, code, callback){
    $.get(TMDBApi.api('person/' + id + '/external_ids?api_key=' + TMDBApi.key()), (external)=>{
        let qid = external && external.wikidata_id

        if(!qid) return callback([])

        get({action: 'wbgetentities', props: 'claims', ids: qid}, (json)=>{
            let entity = json && json.entities && json.entities[qid]
            let claims = entity && entity.claims
            let ids    = Profile.awardIds(claims)

            if(!ids.length) return callback([])

            names(ids, code, (map)=>callback(Profile.awards(claims, map)))
        })
    })
}

export default {
    load
}

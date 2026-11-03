import Supa from '../core/supa/config'
import Storage from '../core/storage/storage'

const cache = new Map()
const CACHE_MS = 5 * 60 * 1000

// Country used for trending lists: the app language's home country, else the US
const regions = {uk: 'UA', be: 'BY', ru: 'RU', pl: 'PL', cs: 'CZ', ro: 'RO', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', pt: 'PT', nl: 'NL', sv: 'SE', tr: 'TR'}

/**
 * Country code for YouTube lists
 * @returns {string}
 */
export function region(){
    return regions[Storage.get('language', 'en')] || 'US'
}

function url(action, params = {}){
    const query = Object.keys(params).filter(key=>params[key] !== '' && params[key] !== undefined).map(key=> encodeURIComponent(key) + '=' + encodeURIComponent(params[key])).join('&')

    return Supa.url() + '/functions/v1/youtube-proxy?action=' + action + (query ? '&' + query : '')
}

/**
 * Call the YouTube proxy function
 * @param {'GET'|'POST'} method
 * @param {string} action
 * @param {object} data - query params for GET, JSON body for POST
 * @param {string} [token] - the user's access token, for account pages
 * @returns {Promise<object>}
 */
function call(method, action, data = {}, token = ''){
    return new Promise((resolve, reject)=>{
        let headers = {apikey: Supa.anonKey(), authorization: 'Bearer ' + Supa.anonKey()}

        if(token) headers['x-yt-token'] = token

        $.ajax({
            url: method == 'GET' ? url(action, data) : url(action),
            method: method,
            data: method == 'GET' ? undefined : JSON.stringify(Object.assign({action: action}, data)),
            contentType: 'application/json',
            headers: headers,
            timeout: 15000,
            dataType: 'json',
            success: (json)=>{
                if(json && json.ok) resolve(json)
                else reject(new Error((json && json.error) || 'videos error'))
            },
            error: (xhr)=>reject(new Error((xhr.responseJSON && xhr.responseJSON.error) || 'network'))
        })
    })
}

/**
 * Same call as `call`, answered from memory for a few minutes to save API quota
 * @param {string} key
 * @param {()=>Promise<object>} load
 * @returns {Promise<object>}
 */
function cached(key, load){
    let hit = cache.get(key)

    if(hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.data)

    return load().then(data=>{
        cache.set(key, {at: Date.now(), data: data})

        return data
    })
}

export default {
    call,

    trending: (region)=> cached('trending:' + region, ()=> call('GET', 'trending', {region: region})),
    search: (query, region)=> cached('search:' + region + ':' + query, ()=> call('GET', 'search', {q: query, region: region})),
    feed: (token)=> call('GET', 'feed', {}, token),
    me: (token)=> call('GET', 'me', {}, token)
}

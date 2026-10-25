/**
 * HOOK TV storage view: what the app keeps on this device, by kind, the way
 * macOS shows a disk. Local storage is measured key by key; the cache
 * (posters, artwork, server answers in IndexedDB) comes from the browser's
 * own estimate.
 */

// browsers give local storage about 5 million characters per site
const LOCAL_LIMIT = 5 * 1024 * 1024

const KINDS = [
    // what you watched, saved and where you stopped
    {key: 'history', test: /^(favorite|file_view|online_view|online_watched_last|online_last_balanser|hook_online_last_balanser|timetable|torrents_view|account_bookmarks|recomends_|ser_clarifys|person_subscribes)/},
    {key: 'search', test: /^search_history/}
]

/**
 * @param {[string, string][]} entries local storage keys and values
 * @returns {{history:number, search:number, settings:number, chars:number}} bytes (UTF-16) per kind
 */
function local(entries){
    let out = {history: 0, search: 0, settings: 0, chars: 0}

    entries.forEach(([key, value])=>{
        let chars = (key || '').length + (value || '').length
        let kind  = KINDS.find(k=>k.test.test(key))

        out[kind ? kind.key : 'settings'] += chars * 2
        out.chars += chars
    })

    return out
}

/**
 * Parts of the bar, biggest first, with their share of what is used
 * @param {{history:number, search:number, settings:number, cache:number|null}} sizes
 * @returns {{key:string, bytes:number, share:number}[]}
 */
function parts(sizes){
    let keys  = ['history', 'search', 'settings', 'cache']
    let total = keys.reduce((sum, k)=>sum + (sizes[k] || 0), 0)

    return keys.map(key=>({key, bytes: sizes[key] || 0, share: total ? (sizes[key] || 0) / total : 0}))
        .filter(p=>p.bytes > 0)
        .sort((a, b)=>b.bytes - a.bytes)
}

function entries(){
    let list = []

    try{
        for(let i = 0; i < localStorage.length; i++){
            let key = localStorage.key(i)

            list.push([key, localStorage.getItem(key)])
        }
    }
    catch(e){}

    return list
}

/**
 * Everything the view needs, measured now
 * @param {function(object)} call {history, search, settings, cache, local_share, quota, usage}
 */
function measure(call){
    let sizes = local(entries())
    let done  = (cache, quota)=>{
        call({
            history: sizes.history,
            search: sizes.search,
            settings: sizes.settings,
            cache,
            local_share: Math.min(1, sizes.chars / LOCAL_LIMIT),
            quota
        })
    }

    if(navigator.storage && navigator.storage.estimate){
        navigator.storage.estimate().then(e=>done(e.usage || 0, e.quota || 0), ()=>done(null, 0))
    }
    else done(null, 0)
}

export default {
    LOCAL_LIMIT,
    local,
    parts,
    measure
}

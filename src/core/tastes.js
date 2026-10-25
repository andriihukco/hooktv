import R from './tastes_rules'
import Storage from './storage/storage'

/**
 * HOOK TV: the Tastes profile as the app sees it. Reads and writes the 'tastes' key
 * through Storage; the filter rules themselves live in tastes_rules.js.
 */

function get(){
    try {
        return R.normalize(Storage.get('tastes', null))
    }
    catch(e){
        return R.defaults()
    }
}

/**
 * @returns {boolean} false when the profile could not be saved
 */
function write(profile){
    try {
        Storage.set('tastes', profile)

        return true
    }
    catch(e){
        return false
    }
}

function set(patch){
    return write(Object.assign(get(), patch, {updated: Date.now()}))
}

/**
 * Record a like, dislike or skip for a card. null removes the verdict.
 */
function verdict(card, value){
    let profile = get()
    let key     = R.verdictKey(card)

    if(value == null) delete profile.verdicts[key]
    else profile.verdicts[key] = {verdict: value, title: card.title || card.name || ''}

    return write(profile)
}

function reset(){
    return write(R.defaults())
}

function apply(results){
    return R.apply(get(), results)
}

function discoverParams(media){
    return R.discoverParams(get(), media)
}

function match(card){
    return R.match(get(), card)
}

/**
 * Wrap a result callback so any list of titles it receives is filtered and ranked first
 */
function filtered(cb){
    if(typeof cb != 'function') return cb

    return (data)=>{
        if(data && Array.isArray(data.results)) data = Object.assign({}, data, {results: apply(data.results)})

        cb(data)
    }
}

/**
 * One search result: kept when it matches the profile, undefined otherwise
 */
function keep(card){
    return card && match(card) ? card : undefined
}

export default {get, set, verdict, reset, apply, discoverParams, match, filtered, keep}

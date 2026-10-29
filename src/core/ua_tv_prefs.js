import Storage from './storage/storage'
import uaTv from './api/sources/ua_tv'

/**
 * Which Ukrainian channels the viewer hides, and their order, kept in this browser.
 * The order is one list of every channel; pages and rows read it in that order.
 */
const KEY_HIDDEN = 'ua_tv_hidden'
const KEY_ORDER  = 'ua_tv_order'

function saved(key){
    let value = Storage.get(key, [])

    return Array.isArray(value) ? value : []
}

/**
 * Every channel in the viewer's order; channels not yet in the saved order keep the list order
 * @returns {Array} channels
 */
function all(){
    let order = saved(KEY_ORDER)
    let rank  = (name)=>{
        let i = order.indexOf(name)

        return i < 0 ? order.length + uaTv.findIndex(c=>c.name == name) : i
    }

    return uaTv.slice().sort((a, b)=>rank(a.name) - rank(b.name))
}

function isHidden(channel){
    return saved(KEY_HIDDEN).indexOf(channel.name) >= 0
}

/**
 * Visible channels in the viewer's order, optionally filtered
 * @param {function} [filter] channel => boolean
 * @returns {Array} channels
 */
function visible(filter = ()=>true){
    return all().filter(c=>!isHidden(c) && filter(c))
}

function toggleHidden(channel){
    let hidden = saved(KEY_HIDDEN).filter(name=>name != channel.name)

    if(hidden.length == saved(KEY_HIDDEN).length) hidden.push(channel.name)

    Storage.set(KEY_HIDDEN, hidden)
}

/**
 * Move a channel one place up (-1) or down (1) in the viewer's order
 */
function move(channel, direction){
    let order = all().map(c=>c.name)
    let from  = order.indexOf(channel.name)
    let to    = from + direction

    if(to < 0 || to >= order.length) return

    order[from] = order[to]
    order[to]   = channel.name

    Storage.set(KEY_ORDER, order)
}

export default {
    all,
    visible,
    isHidden,
    toggleHidden,
    move
}

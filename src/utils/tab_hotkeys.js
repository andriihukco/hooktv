/**
 * Number keys for the five tabs that carry the Filters pill, in menu order.
 * Kept free of DOM code so the mapping can be tested on its own.
 */
export const TABS = ['main', 'movie', 'tv', 'favorite', 'history']

/**
 * Tab for a key code: 1–5 on the top row (49–53) or the numpad (97–101)
 * @param {number} code keyCode of the keydown event
 * @returns {string} tab name, or '' when the key is not a tab key
 */
export function tabForKey(code){
    let n = 0

    if(code >= 49 && code <= 53) n = code - 48
    else if(code >= 97 && code <= 101) n = code - 96

    return n ? TABS[n - 1] : ''
}

/**
 * The number shown for a tab
 * @param {string} tab tab name
 * @returns {string} '1'…'5', or '' for a tab without a key
 */
export function keyOf(tab){
    let at = TABS.indexOf(tab)

    return at < 0 ? '' : String(at + 1)
}

export default {
    TABS,
    tabForKey,
    keyOf
}

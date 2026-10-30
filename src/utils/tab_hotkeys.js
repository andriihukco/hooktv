/**
 * Number keys on desktop and TV: 1–6 open the menu sections in menu order,
 * 0 opens the Filters of the current page. Pure mapping, kept free of DOM code
 * so it can be tested on its own.
 */
export const TABS = ['main', 'movie', 'tv', 'ua_tv', 'games', 'music']

export const FILTERS = 'filters'

/**
 * Action for a key code: 1–6 on the top row (49–54) or the numpad (97–102),
 * 0 on the top row (48) or the numpad (96)
 * @param {number} code keyCode of the keydown event
 * @returns {string} tab name, 'filters', or '' when the key is not a hotkey
 */
export function actionForKey(code){
    if(code == 48 || code == 96) return FILTERS

    let n = 0

    if(code >= 49 && code <= 54) n = code - 48
    else if(code >= 97 && code <= 102) n = code - 96

    return n ? TABS[n - 1] : ''
}

export default {
    TABS,
    FILTERS,
    actionForKey
}

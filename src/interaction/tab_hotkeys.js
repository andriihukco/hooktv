import Controller from '../core/controller'
import Platform from '../core/platform'
import Hotkeys from '../utils/tab_hotkeys'

/**
 * HOOK TV: on desktop and TV the number keys 1–5 jump to the five tabs that carry
 * the Filters pill (Home, Movies, Series, Saved, History). The key of the tab you
 * are on opens its filters. The number is drawn on each menu item (CSS) and on the
 * pill (library_filter.js). Phones keep their tab bar and get no keys.
 */

// screens where a number key may act: the content, the menu and the pill itself
const ACTIVE = ['content', 'menu', 'library_filter_pill']

// the top-level tab the current page belongs to, '' on a page deeper than the five
function current(){
    let object = Lampa.Activity.active() || {}

    if(object.component == 'main' && !object.url) return 'main'
    if(object.component == 'category' && (object.url == 'movie' || object.url == 'tv')) return object.url
    if(object.component == 'bookmarks') return 'favorite'
    if(object.component == 'favorite' && object.type == 'history') return 'history'

    return ''
}

// the same handler the phone tab bar uses, so the menu stays in sync
function go(tab){
    $('.menu .menu__item[data-action="' + tab + '"]').trigger('hover:enter')
}

/**
 * @param {Function} filters opens the Filters panel of the current page
 */
function init(filters){
    window.addEventListener('keydown', (e)=>{
        let tab = Hotkeys.tabForKey(e.keyCode)

        if(!tab || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
        if(!Platform.screen('tv')) return
        if(e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return
        if(ACTIVE.indexOf(Controller.enabled().name) < 0) return

        e.stopPropagation()
        e.preventDefault()

        if(tab !== current()) return go(tab)

        if(document.querySelector('.library-filter-pill--show')) filters()
    }, true)
}

/**
 * The number to show on the Filters pill: its tab's key on desktop and TV, '' elsewhere
 * @returns {string}
 */
function tabKey(){
    return Platform.screen('tv') ? Hotkeys.keyOf(current()) : ''
}

export default {
    init,
    tabKey
}

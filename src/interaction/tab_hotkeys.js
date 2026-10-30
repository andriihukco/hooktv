import Controller from '../core/controller'
import Platform from '../core/platform'
import Hotkeys from '../utils/tab_hotkeys'

/**
 * HOOK TV: on desktop and TV the number keys open the menu sections (1 Home,
 * 2 Movies, 3 Series, 4 TV, 5 Games, 6 Music) and 0 opens the Filters of the
 * current page. The keys are silent: no hints are drawn. Phones get no keys.
 */

// browsing states where a number key may act: rows, the menu, the top bar and the pill
const ACTIVE = ['content', 'items_line', 'menu', 'head', 'library_filter_pill']

// the same handler the phone tab bar uses, so the menu stays in sync
function go(tab){
    $('.menu .menu__item[data-action="' + tab + '"]').trigger('hover:enter')
}

/**
 * @param {Function} filters opens the Filters panel of the current page
 */
function init(filters){
    window.addEventListener('keydown', (e)=>{
        let action = Hotkeys.actionForKey(e.keyCode)

        if(!action || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
        if(!Platform.screen('tv')) return
        if(e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable]')) return
        if(ACTIVE.indexOf(Controller.enabled().name) < 0) return

        e.stopPropagation()
        e.preventDefault()

        if(action !== Hotkeys.FILTERS) return go(action)

        if(document.querySelector('.library-filter-pill--show')) filters()
    }, true)
}

export default {
    init
}

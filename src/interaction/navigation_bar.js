import Platform from '../core/platform'
import Template from '../interaction/template'
import Activity from './activity/activity'
import Lang from '../core/lang'
import Storage from '../core/storage/storage'
import Controller from '../core/controller'

/**
 * Инициализирует навигационную панель (только для мобильных устройств)
 * @returns {void}
 */
function init(){
    if(window.lampa_settings.minimal_ui) return tabs()

    if(Platform.screen('mobile')){
        let bar = Template.get('navigation_bar',{})

        bar.find('.navigation-bar__item').on('click',function(){
            let action = $(this).data('action')

            if(action == 'back') Controller.back()
            else if(action == 'main'){
                Activity.push({
                    url: '',
                    title: Lang.translate('title_main') + ' - ' + Storage.field('source').toUpperCase(),
                    component: 'main',
                    source: Storage.field('source')
                })
            }
            else if(action == 'search'){
                Lampa.Search.open()
            }
            else if(action == 'settings'){
                Controller.toggle('settings')
            }
        })

        $('body').append(bar)
    }
}

/**
 * HOOK TV: iOS-style tab bar with the four sections and search. CSS shows it
 * on narrow screens only, where it replaces the top section capsule.
 * Sections run through the menu's own handlers, so both stay in sync.
 */
// Rounded tab icons: an outline version for idle tabs and a filled one for the current tab.
// Inner details of filled shapes are cut out with masks so the glass shows through.
function tabIcon(outline, filled, mask){
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        ${mask ? `<defs>${mask}</defs>` : ''}
        <g class="navigation-bar__glyph navigation-bar__glyph--outline">${outline}</g>
        <g class="navigation-bar__glyph navigation-bar__glyph--filled">${filled}</g>
    </svg>`
}

const TAB_ICONS = {
    main: (()=>{
        let house = 'M4.5 10.2 12 4l7.5 6.2v8.3a2 2 0 0 1-2 2H15v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H6.5a2 2 0 0 1-2-2z'

        return tabIcon(`<path d="${house}"/>`, `<path d="${house}" fill="currentColor"/>`)
    })(),
    movie: (()=>{
        let cuts = 'M3.5 9.5h17M8.5 5 7 9.5M13.5 5 12 9.5M18.5 5 17 9.5'

        return tabIcon(
            `<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="${cuts}"/>`,
            `<rect x="3.5" y="5" width="17" height="14" rx="2.5" fill="currentColor" mask="url(#navigation-bar-mask-movie)"/>`,
            `<mask id="navigation-bar-mask-movie" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/><path d="${cuts}" stroke="#000" stroke-width="1.6"/></mask>`
        )
    })(),
    tv: (()=>{
        let play = 'M10.5 10.6v4.8l4-2.4z'

        return tabIcon(
            `<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 3.5 12 7l3.5-3.5"/><path d="${play}"/>`,
            `<rect x="3" y="7" width="18" height="13" rx="2.5" fill="currentColor" mask="url(#navigation-bar-mask-tv)"/><path d="M8.5 3.5 12 7l3.5-3.5"/>`,
            `<mask id="navigation-bar-mask-tv" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/><path d="${play}" fill="#000" stroke="#000" stroke-width="1.4"/></mask>`
        )
    })(),
    ua_tv: (()=>{
        let dish = 'M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2'

        return tabIcon(
            `<circle cx="12" cy="12" r="2"/><path d="${dish}"/>`,
            `<circle cx="12" cy="12" r="2.6" fill="currentColor"/><path d="${dish}"/>`
        )
    })()
}

// Search and Favorites live in the top bar on phones, next to the menu; the tab bar keeps the sections
function tabs(){
    let items = [
        ['main', 'menu_main'],
        ['movie', 'menu_movies'],
        ['tv', 'menu_tv'],
        ['ua_tv', 'menu_ua_tv']
    ].map(([action, title])=>[action, title, TAB_ICONS[action]])

    let bar = $('<div class="navigation-bar navigation-bar--tabs"><div class="navigation-bar__body"></div></div>')

    items.forEach(([action, title, icon])=>{
        let item = $(`<div class="navigation-bar__item" data-action="${action}">
            <div class="navigation-bar__icon">${icon}</div>
            <div class="navigation-bar__label">${Lang.translate(title)}</div>
        </div>`)

        item.on('click',()=>{
            updateVisibility(-1)

            $('.menu .menu__item[data-action="' + action + '"]').trigger('hover:enter')
        })

        bar.find('.navigation-bar__body').append(item)
    })

    $('body').append(bar)

    let positions = new WeakMap()
    let touch_y

    function horizontalTarget(target){
        return target && target.closest && target.closest('.scroll--horizontal')
    }

    let hidden = false
    let idle

    // scroll/touch events fire every frame; only touch the DOM when the state flips
    function updateVisibility(direction){
        if(!direction) return

        // bring the bar back once scrolling settles
        clearTimeout(idle)
        if(direction > 0) idle = setTimeout(()=>updateVisibility(-1), 450)

        if((direction > 0) === hidden) return

        hidden = direction > 0
        bar[0].classList.toggle('navigation-bar--hidden', hidden)
    }

    document.addEventListener('scroll',(event)=>{
        let target = event.target === document ? document.scrollingElement : event.target

        if(!target || typeof target.scrollTop !== 'number') return
        if(horizontalTarget(target)) return

        let position = target.scrollTop
        let previous = positions.has(target) ? positions.get(target) : 0

        positions.set(target, position)

        // any scroll hides the bar; it returns once scrolling settles
        if(Math.abs(position - previous) > 2) updateVisibility(1)
    }, { capture: true, passive: true })

    document.addEventListener('wheel',(event)=>{
        if(horizontalTarget(event.target)) return
        if(Math.abs(event.deltaY) > 3) updateVisibility(1)
    }, { capture: true, passive: true })

    let touch_x

    document.addEventListener('touchstart',(event)=>{
        let touch = event.touches[0]

        touch_x = touch && touch.clientX
        touch_y = touch && touch.clientY
    }, { capture: true, passive: true })

    // judge by gesture direction, not target: rows are horizontal scrollers but cover most of the screen
    document.addEventListener('touchmove',(event)=>{
        let touch = event.touches[0]

        if(!touch || typeof touch_y !== 'number') return

        let dx = Math.abs(touch.clientX - touch_x)
        let dy = Math.abs(touch.clientY - touch_y)

        if(dy > 8 && dy > dx){
            updateVisibility(1)

            touch_x = touch.clientX
            touch_y = touch.clientY
        }
    }, { capture: true, passive: true })
}

export default {
    init
}
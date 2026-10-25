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
function tabs(){
    let items = [
        ['main', 'menu_main', '<svg><use xlink:href="#sprite-home"></use></svg>'],
        ['movie', 'menu_movies', '<svg><use xlink:href="#sprite-movie"></use></svg>'],
        ['tv', 'menu_tv', '<svg><use xlink:href="#sprite-live_tv"></use></svg>'],
        ['favorite', 'settings_input_links', Template.string('icon_bookmark')],
        ['search', 'search', Template.string('icon_search')]
    ]

    let bar = $('<div class="navigation-bar navigation-bar--tabs"><div class="navigation-bar__body"></div></div>')

    items.forEach(([action, title, icon])=>{
        let item = $(`<div class="navigation-bar__item" data-action="${action}">
            <div class="navigation-bar__icon">${icon}</div>
            <div class="navigation-bar__label">${Lang.translate(title)}</div>
        </div>`)

        item.on('click',()=>{
            updateVisibility(-1)

            if(action == 'search') Lampa.Search.open()
            else if(action == 'favorite') $('.head .open--favorite').trigger('hover:enter')
            else $('.menu .menu__item[data-action="' + action + '"]').trigger('hover:enter')
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

        if(position <= 8 || position < previous - 2){
            updateVisibility(-1)
        }
        else if(position > previous + 2){
            updateVisibility(1)
        }
    }, { capture: true, passive: true })

    document.addEventListener('wheel',(event)=>{
        if(horizontalTarget(event.target)) return
        if(Math.abs(event.deltaY) > 3) updateVisibility(event.deltaY)
    }, { capture: true, passive: true })

    document.addEventListener('touchstart',(event)=>{
        touch_y = event.touches[0] && event.touches[0].clientY
    }, { capture: true, passive: true })

    document.addEventListener('touchmove',(event)=>{
        if(horizontalTarget(event.target)) return

        let next_y = event.touches[0] && event.touches[0].clientY

        if(typeof next_y === 'number' && typeof touch_y === 'number'){
            let distance = touch_y - next_y

            if(Math.abs(distance) > 8) updateVisibility(distance)

            touch_y = next_y
        }
    }, { capture: true, passive: true })
}

export default {
    init
}
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
            if(action == 'search') Lampa.Search.open()
            else if(action == 'favorite') $('.head .open--favorite').trigger('hover:enter')
            else $('.menu .menu__item[data-action="' + action + '"]').trigger('hover:enter')
        })

        bar.find('.navigation-bar__body').append(item)
    })

    $('body').append(bar)
}

export default {
    init
}
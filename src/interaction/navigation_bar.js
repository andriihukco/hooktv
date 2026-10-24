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
        ['movie', 'menu_movies', '<svg><path fill="currentColor" d="m18 4 1.82 3.64c.08.16-.04.36-.22.36h-1.98c-.38 0-.73-.21-.89-.55L15 4h-2l1.82 3.64c.08.16-.04.36-.22.36h-1.98c-.38 0-.73-.21-.89-.55L10 4H8l1.82 3.64c.08.16-.04.36-.22.36H7.62c-.38 0-.73-.21-.9-.55L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-.55-.45-1-1-1h-3z"/></svg>'],
        ['tv', 'menu_tv', '<svg><path fill="currentColor" d="m10.5 17.15 3.98-2.28c.67-.38.67-1.35 0-1.74l-3.98-2.28c-.67-.38-1.5.11-1.5.87v4.55c0 .77.83 1.26 1.5.88zM21 6h-7.59l2.94-2.94c.2-.2.2-.51 0-.71s-.51-.2-.71 0L12 5.99 8.36 2.35c-.2-.2-.51-.2-.71 0s-.2.51 0 .71L10.59 6H3a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8a2 2 0 0 0-2-2zm-1 14H4c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h16c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1z"/></svg>'],
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
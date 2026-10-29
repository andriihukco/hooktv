import Template from '../template'
import Controller from '../../core/controller'
import Select from '../select'
import Api from '../../core/api/api'
import Activity from '../activity/activity'
import Modal from '../modal'
import Scroll from '../scroll'
import Storage from '../../core/storage/storage'
import Filter from '../content_filter/menu'
import Lang from '../../core/lang'
import Platform from '../../core/platform'
import DeviceInput from '../device_input'
import ParentalControl from '../parental_control'
import Editor from './editor'
import Utils from '../../utils/utils'
import Router from '../../core/router'
import Head from '../head/head'

let html
let last
let scroll
let visible_timer

function menuAlwaysVisible(){
    return Platform.screen('tv') && Storage.field('menu_always')
}

let menu_items = [
    {action: 'main', title: 'menu_main', sprite: 'home'},
    {action: 'movie', title: 'menu_movies', sprite: 'movie'},
    {action: 'cartoon', title: 'menu_multmovie', sprite: 'cartoon'},
    {action: 'tv', title: 'menu_tv', sprite: 'tv'},
    {action: 'ua_tv', title: 'menu_ua_tv', sprite: 'live_tv'},
    {action: 'games', title: 'menu_games', sprite: 'games'},
    {action: 'music', title: 'menu_music', sprite: 'music'},
    {action: 'catalog', title: 'menu_catalog', sprite: 'catalog'},
    {action: 'filter', title: 'menu_filter', sprite: 'filter'},    
    {action: 'favorite', title: 'settings_input_links', sprite: 'favorite'},
    {action: 'history', title: 'menu_history', sprite: 'history'},
    {action: 'timetable', title: 'menu_timeline', sprite: 'calendar'},
    {action: 'mytorrents', title: 'menu_torrents', sprite: 'torrent'},
]

/**
 * Инициализация меню
 * @returns {void}
 */
function init(){
    html   = Template.get('menu')
    scroll = new Scroll({mask: true, over: true})

    // Minimal UI: the section list only, no settings / about / console / editor entries
    if(window.lampa_settings.minimal_ui) html.find('.menu__case.nosort, .menu__split').remove()

    // Фильтрация пунктов меню в зависимости от настроек
    menu_items = menu_items.filter(item=>{
        if(window.lampa_settings.minimal_ui) return ['main','movie','tv','ua_tv','games','music'].indexOf(item.action) >= 0

        if(!window.lampa_settings.torrents_use && item.action == 'mytorrents') return false

        return true
    })

    // Minimal UI: Favorites is a bookmark icon in the head, next to search
    if(window.lampa_settings.minimal_ui) Head.addIcon(Template.string('icon_bookmark'), openBookmarks).addClass('open--favorite')

    // Добавление кнопок меню
    menu_items.forEach((item)=>{
        addButton(`<svg><use xlink:href="#sprite-${item.sprite}"></use></svg>`, Lang.translate(item.title)).attr('data-action', item.action)
    })
    
    // Отправка события для плагинов
    Lampa.Listener.send('menu',{type:'start', body: html})

    // Инициализация редактора меню
    Editor.init($('.menu__list:eq(0)', html))

    // Наблюдатель за добавлением новых селекторов в меню
    observe()

    // Инициализация контроллера меню
    Controller.add('menu',{
        toggle: ()=>{
            Controller.collectionSet(html)
            Controller.collectionFocus(last,html,true)

            clearTimeout(visible_timer)

            $('.wrap__left').removeClass('wrap__left--hidden')
    
            $('body').toggleClass('menu--open',true)
        },
        right: ()=>{
            if(window.lampa_settings.minimal_ui){
                if(Navigator.canmove('right')) Navigator.move('right')
                else Head.focusEdge('actions')
            }
            else Controller.toggle('content')
        },
        left: ()=>{
            if(!window.lampa_settings.minimal_ui) return

            if(Navigator.canmove('left')) Navigator.move('left')
            else Head.focusEdge('logo')
        },
        up: ()=>{
            if(window.lampa_settings.minimal_ui) return Controller.toggle('head')

            if(Navigator.canmove('up')) Navigator.move('up')
            else Controller.toggle('head')
        },
        down: ()=>{
            if(window.lampa_settings.minimal_ui) return Controller.toggle('content')

            if(Navigator.canmove('down')) Navigator.move('down')
        },
        gone: ()=>{
            $('body').toggleClass('menu--open',false)

            if(!menuAlwaysVisible()){
                visible_timer = setTimeout(()=>{
                    $('.wrap__left').addClass('wrap__left--hidden')
                },300)
            }
        },
        back: ()=>{
            Activity.backward()
        }
    })

    // Закрытие меню по клику вне его области
    $('body').on('mousedown',(e)=>{
        if(DeviceInput.canClick(e.originalEvent) && opened()){
            if(e.originalEvent.clientX > html.outerWidth()) close()
        }
    })

    scroll.minus()
    scroll.append(html)

    if(menuAlwaysVisible()){
        $('.wrap__left').removeClass('wrap__left--hidden')
    }

    // Отправка события для плагинов
    Lampa.Listener.send('menu',{type:'end'})

    Lampa.Listener.follow('app',e=>{
        if(e.type == 'ready') ready()
    })

    if(window.lampa_settings.minimal_ui){
        Lampa.Listener.follow('activity',e=>{
            if(e.type == 'start') markSection(section(e.object))
        })

        // the first 'start' can fire before the top tabs get their data-action, so mark again once they exist
        Lampa.Listener.follow('app',e=>{
            if(e.type == 'ready') markSection(section(Lampa.Activity.active()))
        })
    }
}

/**
 * Root section an activity belongs to, or '' when it is something deeper
 * (a card, a person, "more" of a row...)
 * @param {object} object activity
 * @returns {string} main | movie | tv | favorite | ''
 */
function section(object){
    if(!object) return ''

    if(object.component == 'main' && !object.url) return 'main'
    if(object.component == 'category' && (object.url == 'movie' || object.url == 'tv')) return object.url
    if(object.component == 'bookmarks') return 'favorite'
    if(object.component == 'ua_tv') return 'ua_tv'
    if(object.component == 'games') return 'games'

    return ''
}

/**
 * Minimal UI: highlight the current section everywhere it is shown (top
 * capsule, head bookmark, bottom tab bar) and show Back only deeper down
 * @param {string} current section from section()
 */
function markSection(current){
    html.find('.menu__item').each(function(){
        this.classList.toggle('menu__item--current', $(this).data('action') == current)
    })

    $('.head .open--favorite').toggleClass('head__action--current', current == 'favorite')

    $('.navigation-bar__item').each(function(){
        this.classList.toggle('navigation-bar__item--current', $(this).data('action') == current)
    })

    $('body').toggleClass('section--root', Boolean(current))
}

/**
 * Следит за добавлением новых селекторов в меню
 * @returns {void}
 */
function observe(){
    if(typeof MutationObserver == 'undefined') return

    let observer = new MutationObserver((mutations)=>{
        for(let i = 0; i < mutations.length; i++){
            let mutation = mutations[i]

            if(mutation.type == 'childList' && !mutation.removedNodes.length){
                let selectors = Array.from(mutation.target.querySelectorAll('.selector')).filter(s=>!s.checked)

                if(selectors.length) Editor.observe()

                selectors.forEach(s=>{
                    s.checked=true

                    if(!$(s).data('binded_events')){
                        $(s).on('hover:focus',(e)=>{
                            last = e.target

                            scroll.update($(e.target),true)
                        }).on('hover:hover hover:touch hover:enter',(e)=>{
                            last = e.target
                        })
                    }
                })
            }
        }
    })

    observer.observe(html[0], {
        childList: true,
        subtree: true
    })
}

/**
 * Проверяет, нужно ли открывать новый компонент или обновлять текущий
 * @param {string} action Действие, которое нужно выполнить
 * @param {Array} name Название компонента(ов), которые нужно проверить
 * @returns {boolean|void} Нужно ли открывать новый компонент или обновлять текущий
 */
function prepared(action, name){
    if(name.indexOf(action) >= 0){
        let comp = Lampa.Activity.active().component

        if(name.indexOf(comp) >= 0) Activity.replace()
        else return true
    }
}

function openBookmarks(){
    ParentalControl.personal('bookmarks',()=>{
        if(prepared('bookmarks',['bookmarks'])){
            Router.call('bookmarks', {
                title: Lang.translate('settings_input_links')
            })
        }
    }, false, true)
}

/**
 * Готово к работе
 * @returns {void}
 */
function ready(){
    html.find('.selector').data('binded_events',true).on('hover:enter',(e)=>{
        let action = $(e.target).data('action')

        Lampa.Listener.send('menu',{type:'action', action: action, target: e.target, abort: ()=>{ action = null }})

        if(action == 'catalog') catalog()

        if(action == 'movie' || action == 'tv'){
            Router.call('category', {
                url: action,
                title: (action == 'movie' ? Lang.translate('menu_movies') : Lang.translate('menu_tv')) + ' - ' + Storage.field('source').toUpperCase(),
                source: Storage.field('source')
            })
        }

        if(prepared(action,['ua_tv'])){
            Router.call('ua_tv', {
                title: Lang.translate('title_ua_tv')
            })
        }

        if(prepared(action,['games'])){
            Router.call('games', {
                title: Lang.translate('title_games')
            })
        }

        if(prepared(action,['music'])){
            Router.call('music', {
                title: Lang.translate('menu_music')
            })
        }

        if(action == 'cartoon'){
            Router.call('category', {
                url: 'movie',
                title: Lang.translate('menu_multmovie') + ' - ' + Storage.field('source').toUpperCase(),
                genres: 16
            })
        }

        if(prepared(action,['main'])){
            Router.call('main', {
                title: Lang.translate('title_main') + ' - ' + Storage.field('source').toUpperCase()
            })
        }

        if(action == 'search') Controller.toggle('search')

        if(action == 'settings'){
            ParentalControl.personal('settings',()=>{
                Controller.toggle('settings')
            }, false, true)
        }

        if(action == 'about'){
            let about = Template.get('about')

            if(window.lampa_settings.white_use){
                about.find('.about__contacts > div:eq(1)').remove()
            }

            if(Platform.is('android')){
                about.find('.platform_android').removeClass('hide')
                about.find('.version_android').text(Platform.version('android'))
            }

            about.find('.version_app').text(Platform.version('app'))

            Modal.open({
                about: true,
                title: Lang.translate('title_about'),
                html: about,
                size: 'medium',
                onBack: ()=>{
                    Modal.close()

                    Controller.toggle('content')
                }
            })
        }

        if(action == 'favorite') openBookmarks()

        if(action == 'history'){
            ParentalControl.personal('bookmarks',()=>{
                if(prepared('favorite',['favorite'])){
                    Router.call('favorite', {
                        title: Lang.translate('title_history'),
                        type: 'history'
                    })
                }
            }, false, true)
        }

        if(prepared(action,['timetable'])){
            Router.call('timetable', {
                title: Lang.translate('title_timetable')
            })
        }

        if(prepared(action,['mytorrents'])){
            Router.call('mytorrents', {
                title: Lang.translate('title_mytorrents')
            })
        }
        if(action == 'console'){
            Controller.toggle('console')
        }

        if(action == 'filter') Filter.show()

        if(action == 'edit') Editor.start()

    }).on('hover:focus',(e)=>{
        last = e.target

        scroll.update($(e.target), true)
    }).on('hover:hover hover:touch hover:enter',(e)=>{
        last = e.target
    })
}

/**
 * Открывает каталог
 * @returns {void}
 */
function catalog(){
    Api.menu({
        source: Storage.field('source')
    },(menu)=>{
        Select.show({
            title: Lang.translate('title_catalog'),
            items: menu,
            onSelect: (a)=>{
                let tmdb = (Storage.field('source') == 'tmdb')
                
                Router.call(tmdb ? 'category' : 'category_full', {
                    url: 'movie',
                    title: (a.title || Lang.translate('title_catalog')) + ' - ' + Storage.field('source').toUpperCase(),
                    genres: a.id,
                    id: a.id
                })
            },
            onBack: open
        })
    })
}

/**
 * Добавляет элемент в меню
 * @param {JQuery} element Элемент меню
 * @param {Function} action Действие при нажатии на элемент
 * @returns {JQuery} Добавленный элемент меню
 */
function addElement(element, action){
    html.find('.menu__list:eq(0)').append(element)

    if(action && typeof action == 'function') element.on('hover:enter', action)
    
    return element
}

/**
 * Добавляет кнопку в меню
 * @param {string} svg_icon SVG иконка кнопки
 * @param {string} title Название кнопки
 * @param {Function} action Действие при нажатии на кнопку
 * @returns {JQuery} Добавленная кнопка меню
 */
function addButton(svg_icon, title, action){
    return addElement($(`<li class="menu__item selector"><div class="menu__ico">${svg_icon}</div><div class="menu__text">${title}</div></li>`), action)
}

/**
 * Переключает меню
 * @returns {void}
 */
/**
 * Focus the first or last visible tab, coming from the head beside them
 * @param {'first'|'last'} which
 */
function focusEdge(which){
    let tabs = html.find('.selector').toArray().filter(el=>el.getClientRects().length > 0)

    if(tabs.length) last = which == 'first' ? tabs[0] : tabs[tabs.length - 1]

    Controller.toggle('menu')
}

function toggle(){
    if($('body').hasClass('menu--open')) Controller.toggle('content')
    else Controller.toggle('menu')

    Lampa.Listener.send('menu',{type:'toggle'})
}

/**
 * Проверяет, открыто ли меню
 * @returns {boolean} Открыто ли меню
 */
function opened(){
    return $('body').hasClass('menu--open')
}

/**
 * Открывает меню
 * @returns {void}
 */
function open(){
    if(!opened()) toggle()
}

/**
 * Закрывает меню
 * @returns {void}
 */
function close(){
    if(opened()) toggle()
}

/**
 * Рендерит меню
 * @returns {JQuery} Меню
 */
function render(){
    return scroll.render()
}

export default {
    init: Utils.onceInit(init),
    render,
    ready,
    focusEdge,
    toggle,
    opened,
    addElement,
    addButton,
    open,
    close
}
import Template from '../template'
import Controller from '../../core/controller'
import Utils from '../../utils/utils'
import Activity from '../activity/activity'
import Platform from '../../core/platform'
import DeviceInput from '../device_input'
import Menu from '../menu/menu'
import Lang from '../../core/lang'
import Storage from '../../core/storage/storage'

let html
let last

/**
 * Наблюдение за изменениями в DOM
 * @returns {void}
 */
function observe(){
    if(typeof MutationObserver == 'undefined') return

    let observer = new MutationObserver((mutations)=>{
        for(let i = 0; i < mutations.length; i++){
            let mutation = mutations[i]

            if(mutation.type == 'childList' && !mutation.removedNodes.length){
                let selectors = Array.from(mutation.target.querySelectorAll('.selector'))

                selectors.forEach(s=>{
                    $(s).unbind('hover:focus hover:hover hover:touch').on('hover:focus hover:hover hover:touch',(e)=>{
                        last = e.target
                    })
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
 * Инициализация шапки
 * @returns {void}
 */
function init(){
    html = Template.get('head')

    if(window.local_lampa) html.find('.head__logo-icon').append('<span class="head__logo-local">local</span>')

    // HOOK TV: the arrow only shows deeper than a root section (body.section--root hides it)
    let touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    if(Platform.mouse() || (window.lampa_settings.minimal_ui && touch)){
        // a selector, so the remote can reach it and it shows focus like the other head buttons
        let back = $(Template.elem('div', {class: 'head__backward selector', children: [
            Template.js('icon_back')
        ]}))

        back.on('hover:enter', ()=>Controller.back())

        // Controller only turns clicks into hover:enter once the head collection is set
        back.on('click', ()=>{
            if(!back[0].trigger_click) Controller.back()
        })

        html.find('.head__body').prepend(back)
    }

    Utils.time(html)

    // HOOK TV: the logo is the home button; the menu icon is the only thing that opens the menu
    // Controller turns a click on a selector into hover:enter, so one event covers mouse, touch and remote
    html.find('.head__logo-icon').addClass('selector').on('hover:enter',()=>{
        Activity.push({
            url: '',
            title: Lang.translate('title_main') + ' - ' + Storage.field('source').toUpperCase(),
            component: 'main',
            source: Storage.field('source')
        })
    })

    html.find('.head__menu-icon').on('mousedown',(e)=>{
        if(DeviceInput.canClick(e.originalEvent)) Menu.toggle()
    })

    html.find('.full--screen').on('hover:enter',()=>{
        Utils.toggleFullscreen()
    }).toggleClass('hide', Platform.tv() || Platform.is('android') || !Utils.canFullScreen())

    // Selector clicks are already converted to hover:enter by Controller.
    // Keeping one activation path also lets remote/keyboard Enter work directly.
    html.find('.open--history').on('hover:enter', ()=>{
        Activity.push({
            url: '',
            title: Lang.translate('title_history'),
            component: 'favorite',
            page: 1,
            type: 'history'
        })
    })

    observe()

    Controller.add('head',{
        toggle: ()=>{
            Controller.collectionSet(html, false, true)
            Controller.collectionFocus(last, html, true)
        },
        // minimal layout reads logo · Home Movies Series · icons, and Left / Right walk it in that order
        right: ()=>{
            if(window.lampa_settings.minimal_ui && focused() == logo()) Menu.focusEdge('first')
            else Navigator.move('right')
        },
        left: ()=>{
            if(window.lampa_settings.minimal_ui && focused() == actions()[0]) Menu.focusEdge('last')
            else if(Navigator.canmove('left')) Navigator.move('left')
            // the logo is the left edge of the minimal layout
            else if(!window.lampa_settings.minimal_ui) Controller.toggle('menu')
        },
        down: ()=>{
            Controller.toggle('content')
        },
        back: ()=>{
            Activity.backward()
        }
    })
}

function visible(el){
    return el && el.getClientRects().length > 0
}

function focused(){
    return html.find('.selector.focus')[0]
}

function logo(){
    return html.find('.head__logo-icon')[0]
}

function actions(){
    return html.find('.head__actions .selector').toArray().filter(visible)
}

/**
 * Focus the head from the centre tabs: the logo on their left, the first icon on their right
 * @param {'logo'|'actions'} side
 */
function focusEdge(side){
    let target = side == 'logo' ? logo() : actions()[0]

    if(visible(target)) last = target

    Controller.toggle('head')
}

/**
 * Установка заголовка
 * @param {string} title Заголовок
 * @returns {void}
 */
function title(title){
    html.find('.head__title').text(title || '')
}

/**
 * Добавление элемента в шапку
 * @param {JQuery|HTMLElement|string} element - Элемент
 * @param {function} action - Действие при нажатии
 * @returns {JQuery|HTMLElement} - Добавленный элемент
 */
function addElement(element, action){
    html.find('.head__actions').prepend(element)

    if(action && typeof action == 'function') element.on('hover:enter', action)

    return element
}

/**
 * Добавление иконки в шапку
 * @param {string} svg_icon - SVG иконка
 * @param {function} action - Действие при нажатии
 * @returns {JQuery|HTMLElement} - Добавленная иконка
 */
function addIcon(svg_icon, action){
    return addElement($(`<div class="head__action selector">${svg_icon}</div>`), action)
}

/**
 * Получение HTML шапки
 * @param {boolean} js - Вернуть DOM элемент вместо JQuery
 * @returns {JQuery|HTMLElement}
 */
function render(js){
    return js ? html[0] : html
}

export default {
    init,
    render,
    focusEdge,
    title,
    addElement,
    addIcon
}
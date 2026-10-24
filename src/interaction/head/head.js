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
        let back = Template.elem('div', {class: 'head__backward', children: [
            Template.js('icon_back')
        ]})

        back.on('click', Controller.back.bind(Controller))

        html.find('.head__body').prepend(back)
    }

    Utils.time(html)

    // HOOK TV: the logo is the home button; the menu icon is the only thing that opens the menu
    html.find('.head__logo-icon').addClass('selector').on('hover:enter click',()=>{
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

    observe()

    Controller.add('head',{
        toggle: ()=>{
            Controller.collectionSet(html, false, true)
            Controller.collectionFocus(last, html, true)
        },
        right: ()=>{
            Navigator.move('right')
        },
        left: ()=>{
            if(Navigator.canmove('left')) Navigator.move('left')
            else Controller.toggle('menu')
        },
        down: ()=>{
            Controller.toggle('content')
        },
        back: ()=>{
            Activity.backward()
        }
    })
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
    title,
    addElement,
    addIcon
}
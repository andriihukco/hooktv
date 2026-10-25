import Modal from './modal'
import Lang from '../core/lang'
import Storage from '../core/storage/storage'
import Platform from '../core/platform'

/**
 * HOOK TV: the first time the app opens in a browser, suggest installing it to the home screen.
 * Chrome and Edge get a one-tap Install button; every platform gets its own step-by-step guide.
 */

const SEEN = 'install_prompt_seen'

const guides = {
    android: ['install_android_1', 'install_android_2', 'install_android_3'],
    ios:     ['install_ios_1', 'install_ios_2', 'install_ios_3'],
    mac:     ['install_mac_1', 'install_mac_2'],
    windows: ['install_windows_1', 'install_windows_2']
}

const systems = [
    {id: 'android', name: 'install_os_android'},
    {id: 'ios',     name: 'install_os_ios'},
    {id: 'mac',     name: 'install_os_mac'},
    {id: 'windows', name: 'install_os_windows'}
]

/**
 * Операционная система по user agent
 * @returns {string} android, ios, mac, windows или other
 */
function system(){
    let ua = navigator.userAgent

    if(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
    if(/Android/.test(ua)) return 'android'
    if(/Windows/.test(ua)) return 'windows'
    if(/Macintosh/.test(ua)) return 'mac'

    return 'other'
}

function standalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/**
 * Показываем только в браузере на компьютере и телефоне, один раз
 * @returns {boolean}
 */
function eligible(){
    let tv = ['tizen', 'webos', 'orsay', 'netcast', 'apple_tv'].some(name=>Platform.is(name))

    if(standalone() || tv || Platform.is('android')) return false

    return !Storage.get(SEEN, false)
}

function steps(os){
    return guides[os].map(key=>`<li class="install-app__step">${Lang.translate(key)}</li>`).join('')
}

/**
 * Окно с инструкцией. Вкладка ОС открывается та, что совпадает с устройством
 */
function open(){
    Storage.set(SEEN, true)

    let prompt   = window.hooktv_install
    let os       = system()
    let current  = guides[os] ? os : 'windows'
    let html     = $(`
        <div class="install-app">
            <p class="install-app__lead">${Lang.translate('install_descr')}</p>
            <div class="install-app__tabs"></div>
            <ol class="install-app__steps"></ol>
        </div>
    `)

    let tabs  = html.find('.install-app__tabs')
    let list  = html.find('.install-app__steps')

    let show = (os)=>{
        current = os

        tabs.find('.install-app__tab').each(function(){
            $(this).toggleClass('install-app__tab--active', $(this).data('os') == os)
        })

        list.html(steps(os))
    }

    systems.forEach(item=>{
        let tab = $(`<div class="install-app__tab selector">${Lang.translate(item.name)}</div>`).data('os', item.id)

        tab.on('hover:enter click', ()=>show(item.id))

        tabs.append(tab)
    })

    show(current)

    let buttons = prompt ? [
        {
            name: Lang.translate('install_button'),
            onSelect: ()=>{
                prompt.prompt()

                Modal.close()
            }
        },
        {
            name: Lang.translate('install_later'),
            onSelect: ()=>Modal.close()
        }
    ] : [
        {
            name: Lang.translate('install_got_it'),
            onSelect: ()=>Modal.close()
        }
    ]

    Modal.open({
        title: Lang.translate('install_title'),
        html,
        size: 'small',
        buttons
    })
}

/**
 * Запуск после готовности приложения
 */
function init(){
    if(!eligible()) return

    setTimeout(()=>{
        if(!window.show_app || Modal.opened()) return

        open()
    }, 3000)
}

export default {
    init
}

import Storage from '../core/storage/storage'
import Controller from '../core/controller'
import Template from './template'
import Lang from '../core/lang'
import Scroll from './scroll'

/**
 * Greeting per language: other translations are only fetched after the
 * choice, so the screen carries its own copy to retitle itself on focus.
 */
const GREETING = {
    en: ['English', 'Welcome', 'Choose your language'],
    uk: ['Українська', 'Ласкаво просимо', 'Оберіть мову'],
    ru: ['Русский', 'Добро пожаловать', 'Выберите язык'],
    be: ['Беларуская', 'Сардэчна запрашаем', 'Выберыце мову'],
    zh: ['简体中文', '欢迎', '选择您的语言'],
    pt: ['Português', 'Bem-vindo', 'Escolha o seu idioma'],
    bg: ['Български', 'Здравейте', 'Изберете език'],
    he: ['עִברִית', 'ברוך הבא', 'בחר שפה'],
    cs: ['Čeština', 'Vítejte', 'Vyberte jazyk'],
    ro: ['Română', 'Bun venit', 'Alegeți limba'],
    fr: ['Français', 'Bienvenue', 'Choisissez votre langue']
}

const FLAG = {
    en: '🇬🇧', uk: '🇺🇦', ru: '🇷🇺', be: '🇧🇾', zh: '🇨🇳', pt: '🇵🇹',
    bg: '🇧🇬', he: '🇮🇱', cs: '🇨🇿', ro: '🇷🇴', fr: '🇫🇷'
}

const CHECK ='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12.5 10 17.5 19 7"></polyline></svg>'

/**
 * Открывает окно выбора языка на начальном экране
 * @param {function} callSelected - вызывается при выборе языка, получает код языка
 * @param {function} callCancel - вызывается при отмене выбора
 * @returns {void}
 */
function open(callSelected, callCancel){
    let html   = Template.get('lang_choice',{})
    let scroll = new Scroll({over:true})
    let codes  = Lang.codes()
    let browser = (navigator.language || '').toLowerCase().split('-')[0]
    let initial = Storage.get('language', codes[browser] ? browser : 'en')

    function greet(code){
        let text = GREETING[code] || GREETING.en

        html.find('.lang__title').text(text[1])
        html.find('.lang__subtitle').text(text[2])
    }

    function selector(code){
        let native = GREETING[code] ? GREETING[code][0] : codes[code]
        let item   = $(`<div class="selector lang__selector-item" data-code="${code}">
            <div class="lang__item-flag">${FLAG[code] || ''}</div>
            <div class="lang__item-name">${native}</div>
            ${native !== codes[code] ? `<div class="lang__item-sub">${codes[code]}</div>` : ''}
            <div class="lang__item-check">${CHECK}</div>
        </div>`)

        item.on('hover:enter click',(e)=>{
            // a mouse click fires both events
            if(!html || html.hasClass('lang--out')) return

            if(callSelected) callSelected(code)

            html.addClass('lang--out')

            setTimeout(()=>{
                scroll.destroy()
                html.remove()

                scroll = null
                html   = null
            },400)
        }).on('hover:focus',(e)=>{
            scroll.update($(e.target), true)

            $('.lang__selector-item',html).removeClass('last-focus')

            $(e.target).addClass('last-focus')

            greet(code)
        })

        scroll.append(item)
    }

    for(let code in codes) selector(code)

    greet(initial)

    html.find('.lang__selector').append(scroll.render())

    $('body').append(html)

    Controller.add('language',{
        toggle: ()=>{
            let focus = html.find('[data-code="'+initial+'"]')

            Controller.collectionSet(scroll.render())
            Controller.collectionFocus(focus[0],scroll.render())
        },
        up: ()=>{
            Navigator.move('up')
        },
        down: ()=>{
            Navigator.move('down')
        },
        back: ()=>{
            if(callCancel){
                scroll.destroy()
                html.remove()

                scroll = null
                html   = null

                callCancel()
            } 
        }
    })
    
    Controller.toggle('language')
}

export default {
    open
}

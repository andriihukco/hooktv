import Storage from '../core/storage/storage'
import Controller from '../core/controller'
import Template from './template'
import Lang from '../core/lang'
import VPN from '../core/vpn'
import en from '../lang/en'

/**
 * Greeting per language: other translations are only fetched after the
 * choice, so the screen carries its own copy to retitle itself on focus.
 */
const GREETING = {
    en: ['English', 'Welcome to HOOK TV', 'Choose your language', 'Movies, series and live TV — all in one place.', 'Your country', 'Language'],
    uk: ['Українська', 'Ласкаво просимо до HOOK TV', 'Оберіть мову', 'Фільми, серіали та телебачення — усе в одному місці.', 'Ваша країна', 'Мова'],
    ru: ['Русский', 'Добро пожаловать в HOOK TV', 'Выберите язык', 'Фильмы, сериалы и ТВ — всё в одном месте.', 'Ваша страна', 'Язык'],
    be: ['Беларуская', 'Сардэчна запрашаем у HOOK TV', 'Выберыце мову', 'Фільмы, серыялы і тэлебачанне — усё ў адным месцы.', 'Ваша краіна', 'Мова'],
    zh: ['简体中文', '欢迎来到 HOOK TV', '选择您的语言', '电影、剧集和电视内容，一站畅享。', '您所在的国家/地区', '语言'],
    pt: ['Português', 'Bem-vindo ao HOOK TV', 'Escolha o seu idioma', 'Filmes, séries e TV — tudo num só lugar.', 'O seu país', 'Idioma'],
    bg: ['Български', 'Добре дошли в HOOK TV', 'Изберете език', 'Филми, сериали и телевизия — всичко на едно място.', 'Вашата държава', 'Език'],
    he: ['עִברִית', 'ברוך הבא', 'בחר שפה'],
    cs: ['Čeština', 'Vítejte v HOOK TV', 'Vyberte jazyk', 'Filmy, seriály a TV — vše na jednom místě.', 'Vaše země', 'Jazyk'],
    ro: ['Română', 'Bun venit la HOOK TV', 'Alegeți limba', 'Filme, seriale și TV — toate într-un singur loc.', 'Țara dvs.', 'Limbă'],
    fr: ['Français', 'Bienvenue sur HOOK TV', 'Choisissez votre langue', 'Films, séries et TV — tout au même endroit.', 'Votre pays', 'Langue']
}

GREETING.he[1] = 'ברוכים הבאים ל-HOOK TV'
GREETING.he[3] = 'סרטים, סדרות וטלוויזיה — הכול במקום אחד.'
GREETING.he[4] = 'המדינה שלך'
GREETING.he[5] = 'שפה'

const COUNTRY_LANGUAGE = {
    bg: 'bg', by: 'be', cn: 'zh', cz: 'cs', fr: 'fr', il: 'he',
    pt: 'pt', ro: 'ro', ru: 'ru', ua: 'uk'
}

const FLAG = {
    en: '🇬🇧', uk: '🇺🇦', ru: '🇷🇺', be: '🇧🇾', zh: '🇨🇳', pt: '🇵🇹',
    bg: '🇧🇬', he: '🇮🇱', cs: '🇨🇿', ro: '🇷🇴', fr: '🇫🇷'
}

// the Save button, in the language being chosen
const SAVE = {
    en: 'Save', uk: 'Зберегти', ru: 'Сохранить', be: 'Захаваць', zh: '保存', pt: 'Guardar',
    bg: 'Запази', he: 'שמירה', cs: 'Uložit', ro: 'Salvează', fr: 'Enregistrer'
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
    let codes  = Lang.codes()
    let browserLocale = navigator.language || 'en'
    let browser = browserLocale.toLowerCase().split('-')[0]
    let browserCountry = (browserLocale.match(/[-_]([a-z]{2})(?:$|[-_])/i) || [])[1]
    let storedLanguage = Storage.get('language', '')
    let initial = storedLanguage || (codes[browser] ? browser : 'en')
    let selectedCountry = Storage.get('setup_country', (browserCountry || 'us').toLowerCase())
    let countries = Object.keys(en)
        .filter(key=>/^country_[a-z]{2}$/.test(key))
        .map(key=>key.slice(8))
        .sort((a,b)=>en['country_' + a].localeCompare(en['country_' + b]))
    let closing = false
    let openingCountry = false

    function cleanup(){
        html.remove()

        html = null
    }

    function dismiss(){
        if(!html || closing) return

        closing = true
        html.addClass('lang--out')

        setTimeout(cleanup, 400)

        if(callCancel) callCancel(initial, selectedCountry)
    }

    function greet(code){
        let text = GREETING[code] || GREETING.en

        html.find('.lang__title').text(text[1])
        html.find('.lang__subtitle').text(text[2])
        html.find('.lang__intro').text(text[3] || GREETING.en[3])
        html.find('.lang__location-label').text(text[4] || GREETING.en[4])
        html.find('.lang__language-label').text(text[5] || GREETING.en[5])
        html.find('.lang__country-select').attr('aria-label', text[4] || GREETING.en[4])
        html.find('.lang__save span').text(SAVE[code] || SAVE.en)
    }

    // ticks a language; nothing is applied until Save
    function choose(code){
        initial = code

        $('.lang__selector-item',html).removeClass('lang__selector-item--selected')
        html.find('[data-code="' + code + '"]').addClass('lang__selector-item--selected')

        greet(code)
    }

    function save(){
        if(!html || closing) return

        closing = true

        if(callSelected) callSelected(initial, selectedCountry)

        html.addClass('lang--out')

        setTimeout(cleanup,400)
    }

    function selectSuggestedLanguage(country){
        let proposed = COUNTRY_LANGUAGE[country] || browser

        if(codes[proposed]) initial = proposed

        $('.lang__selector-item',html).removeClass('lang__selector-item--selected')
        html.find('[data-code="' + initial + '"]').addClass('lang__selector-item--selected')
        greet(initial)
    }

    function setCountry(country, suggestLanguage){
        if(!countries.includes(country)) return

        selectedCountry = country
        html.find('.lang__country-select').val(country)

        if(suggestLanguage) selectSuggestedLanguage(country)
    }

    function selector(code){
        let native = GREETING[code] ? GREETING[code][0] : codes[code]
        let item   = $(`<div class="selector lang__selector-item" data-code="${code}">
            <div class="lang__item-flag">${FLAG[code] || ''}</div>
            <div class="lang__item-name">${native}</div>
            ${native !== codes[code] ? `<div class="lang__item-sub">${codes[code]}</div>` : ''}
            <div class="lang__item-check">${CHECK}</div>
        </div>`)

        item.on('hover:enter',()=>{
            if(!html || closing) return

            // on a remote, Enter on the ticked language is the same as Save
            if(initial == code && item.hasClass('lang__selector-item--selected')) return save()

            choose(code)
        }).on('hover:focus',(e)=>{
            $('.lang__selector-item',html).removeClass('last-focus')

            $(e.target).addClass('last-focus')

            // keep the focused row clear of the pinned Save bar
            if(e.target.scrollIntoView) e.target.scrollIntoView({block: 'nearest'})
        })

        html.find('.lang__list').append(item)
    }

    countries.forEach(country=>{
        html.find('.lang__country-select').append($('<option>', {
            value: country,
            text: en['country_' + country]
        }))
    })

    for(let code in codes) selector(code)

    choose(initial)

    if(!countries.includes(selectedCountry)) selectedCountry = 'us'
    html.find('.lang__country-select').val(selectedCountry)

    html.find('.lang__country-select').on('click',()=>{
        openingCountry = true
        setTimeout(()=>{ openingCountry = false }, 150)
    }).on('hover:enter',()=>{
        if(openingCountry) return

        openingCountry = true

        let select = html.find('.lang__country-select')[0]

        if(typeof select.showPicker === 'function') select.showPicker()
        else select.focus()

        setTimeout(()=>{ openingCountry = false }, 50)
    })

    html.find('.lang__country-select').on('change',function(){
        setCountry(this.value, true)
    })

    html.find('.lang__close').on('click hover:enter', dismiss)
    html.find('.lang__save').on('hover:enter', save)

    $('body').append(html)

    if(!Storage.get('setup_country')){
        VPN.region(country=>{
            if(!html || closing || Storage.get('setup_country')) return
            setCountry(country, !storedLanguage)
        })
    }

    Controller.add('language',{
        toggle: ()=>{
            let focus = html.find('[data-code="'+initial+'"]')

            Controller.collectionSet(html)
            Controller.collectionFocus(focus[0],html)
        },
        up: ()=>{
            Navigator.move('up')
        },
        down: ()=>{
            // past the last language is the pinned Save button
            if(Navigator.canmove('down')) Navigator.move('down')
            else Controller.collectionFocus(html.find('.lang__save')[0], html)
        },
        back: ()=>{
            dismiss()
        }
    })
    
    Controller.toggle('language')
}

export default {
    open
}

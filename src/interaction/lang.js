import Storage from '../core/storage/storage'
import Controller from '../core/controller'
import Template from './template'
import Lang from '../core/lang'
import Scroll from './scroll'
import Brand from '../core/brand'
import VPN from '../core/vpn'

/**
 * Mapping of ISO 3166-1 alpha-2 country codes to supported language codes
 */
const COUNTRY_TO_LANG = {
    ua: 'uk',
    by: 'be',
    cn: 'zh', tw: 'zh', hk: 'zh', sg: 'zh',
    pt: 'pt', br: 'pt', ao: 'pt', mz: 'pt', cv: 'pt',
    bg: 'bg',
    il: 'he',
    cz: 'cs', sk: 'cs',
    ro: 'ro', md: 'ro',
    fr: 'fr', mc: 'fr', lu: 'fr', sn: 'fr', ci: 'fr', cd: 'fr', mg: 'fr', cm: 'fr',
    us: 'en', gb: 'en', uk: 'en', ca: 'en', au: 'en', nz: 'en', ie: 'en', in: 'en', za: 'en'
}

/**
 * Region flags
 */
const COUNTRY_FLAGS = {
    ua: '🇺🇦', by: '🇧🇾', cn: '🇨🇳', tw: '🇹🇼', hk: '🇭🇰',
    pt: '🇵🇹', br: '🇧🇷', bg: '🇧🇬', il: '🇮🇱', cz: '🇨🇿',
    sk: '🇸🇰', ro: '🇷🇴', md: '🇲🇩', fr: '🇫🇷', us: '🇺🇸',
    gb: '🇬🇧', ca: '🇨🇦', au: '🇦🇺', de: '🇩🇪', es: '🇪🇸',
    it: '🇮🇹', pl: '🇵🇱'
}

const LANG_FLAGS = {
    en: '🌐',
    uk: '🇺🇦',
    be: '🇧🇾',
    zh: '🇨🇳',
    pt: '🇵🇹',
    bg: '🇧🇬',
    he: '🇮🇱',
    cs: '🇨🇿',
    ro: '🇷🇴',
    fr: '🇫🇷'
}

const COUNTRY_NAMES = {
    ua: 'Ukraine', by: 'Belarus', cn: 'China', tw: 'Taiwan', hk: 'Hong Kong',
    pt: 'Portugal', br: 'Brazil', bg: 'Bulgaria', il: 'Israel', cz: 'Czechia',
    sk: 'Slovakia', ro: 'Romania', md: 'Moldova', fr: 'France', us: 'United States',
    gb: 'United Kingdom', ca: 'Canada', au: 'Australia', de: 'Germany'
}

/**
 * Localized strings for suggested onboarding screen
 */
const LANG_DETAILS = {
    en: {
        native: 'English',
        english: 'English',
        continue_text: 'Continue in English',
        rec_text: 'Recommended for your region',
        all_text: 'View all languages',
        back_text: 'Back to recommendation',
        title: 'Welcome',
        subtitle: 'Choose your language to get started'
    },
    uk: {
        native: 'Українська',
        english: 'Ukrainian',
        continue_text: 'Продовжити українською',
        rec_text: 'Рекомендовано для вашого регіону',
        all_text: 'Всі мови',
        back_text: 'Назад до рекомендованої',
        title: 'Ласкаво просимо',
        subtitle: 'Оберіть зручну мову для продовження'
    },
    fr: {
        native: 'Français',
        english: 'French',
        continue_text: 'Continuer en Français',
        rec_text: 'Recommandé pour votre région',
        all_text: 'Voir toutes les langues',
        back_text: 'Retour à la recommandation',
        title: 'Bienvenue',
        subtitle: 'Choisissez votre langue pour commencer'
    },
    ro: {
        native: 'Română',
        english: 'Romanian',
        continue_text: 'Continuă în Română',
        rec_text: 'Recomandat pentru regiunea ta',
        all_text: 'Vezi toate limbile',
        back_text: 'Înapoi la recomandare',
        title: 'Bun venit',
        subtitle: 'Alegeți limba preferată pentru a continua'
    },
    cs: {
        native: 'Čeština',
        english: 'Czech',
        continue_text: 'Pokračovat v Češtině',
        rec_text: 'Doporučeno pro vaši oblast',
        all_text: 'Zobrazit všechny jazyky',
        back_text: 'Zpět na doporučení',
        title: 'Vítejte',
        subtitle: 'Vyberte svůj jazyk pro zahájení'
    },
    pt: {
        native: 'Português',
        english: 'Portuguese',
        continue_text: 'Continuar em Português',
        rec_text: 'Recomendado para a sua região',
        all_text: 'Ver todos os idiomas',
        back_text: 'Voltar à recomendação',
        title: 'Bem-vindo',
        subtitle: 'Escolhe o teu idioma para continuar'
    },
    he: {
        native: 'עִברִית',
        english: 'Hebrew',
        continue_text: 'המשך בעברית',
        rec_text: 'מומלץ עבור האזור שלך',
        all_text: 'כל השפות',
        back_text: 'חזרה להמלצה',
        title: 'ברוך הבא',
        subtitle: 'בחר את השפה שלך כדי להתחיל'
    },
    bg: {
        native: 'Български',
        english: 'Bulgarian',
        continue_text: 'Продължи на Български',
        rec_text: 'Препоръчано за вашия регион',
        all_text: 'Всички езици',
        back_text: 'Назад към препоръката',
        title: 'Здравейте',
        subtitle: 'Изберете вашият език, за да започнете'
    },
    be: {
        native: 'Беларуская',
        english: 'Belarusian',
        continue_text: 'Працягнуць па-беларуску',
        rec_text: 'Рэкамендавана для вашага рэгіёну',
        all_text: 'Усе мовы',
        back_text: 'Назад да рэкамендацыі',
        title: 'Сардэчна запрашаем',
        subtitle: 'Выберыце сваю мову, каб пачаць'
    },
    zh: {
        native: '简体中文',
        english: 'Chinese',
        continue_text: '以简体中文继续',
        rec_text: '根据您的地区推荐',
        all_text: '查看所有语言',
        back_text: '返回推荐',
        title: '欢迎',
        subtitle: '选择您的首选语言以继续'
    }
}

/**
 * Detect user language based on browser environment and IP / region
 * @param {function} callback Receives (langCode, countryCode)
 */
function detectLanguage(callback) {
    let supported = Object.keys(LANG_DETAILS)
    
    // 1. Browser language check (instant)
    let browserRaw = (navigator.language || navigator.userLanguage || '').toLowerCase()
    let browserLang = browserRaw.split('-')[0]
    let browserCountry = browserRaw.split('-')[1] || ''

    // 2. Cached region check
    let cached = Storage.get('region', '{}')
    if (cached && cached.code) {
        let fromCache = COUNTRY_TO_LANG[cached.code.toLowerCase()]
        if (fromCache && supported.indexOf(fromCache) >= 0) {
            return callback(fromCache, cached.code.toLowerCase())
        }
    }

    let initialLang = supported.indexOf(browserLang) >= 0 ? browserLang : 'en'
    let initialCountry = browserCountry || (initialLang === 'uk' ? 'ua' : initialLang === 'fr' ? 'fr' : '')

    let resolved = false
    let timer = setTimeout(() => {
        if (!resolved) {
            resolved = true
            callback(initialLang, initialCountry)
        }
    }, 1200)

    function onFound(country) {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        country = (country || '').trim().toLowerCase()
        let detected = COUNTRY_TO_LANG[country] || initialLang
        callback(detected, country)
    }

    // Try VPN.region first
    try {
        VPN.region((country) => {
            if (country && typeof country === 'string' && country.length <= 4) {
                onFound(country)
            } else {
                fetchFallbackGeo(onFound)
            }
        })
    } catch(e) {
        fetchFallbackGeo(onFound)
    }
}

function fetchFallbackGeo(call) {
    $.ajax({
        url: 'https://api.country.is/',
        type: 'GET',
        dataType: 'json',
        timeout: 1000,
        success: (res) => {
            if (res && res.country) call(res.country)
            else call(null)
        },
        error: () => call(null)
    })
}

/**
 * Открывает окно выбора языка на начальном экране с автоопределением по IP
 * @param {function} callSelected - вызывается при выборе языка, получает код языка
 * @param {function} callCancel - вызывается при отмене выбора
 * @returns {void}
 */
function open(callSelected, callCancel){
    let html = Template.get('lang_choice', {})
    let scroll = new Scroll({mask: true, over: true})
    let codes = Lang.codes()
    let currentView = 'suggested'
    let suggestedCode = 'en'
    let detectedCountry = ''

    // Update brand name
    try {
        html.find('.lang__brand').text(Brand.getName('short') || 'HOOK')
    } catch(e) {}

    // Populate all languages list
    let listCount = 0
    for(let code in codes){
        listCount++
        let details = LANG_DETAILS[code] || { native: codes[code], english: codes[code] }
        let flag = LANG_FLAGS[code] || '🌐'

        let item = $(`
            <div class="selector lang__selector-item" data-code="${code}">
                <div class="lang__item-flag">${flag}</div>
                <div class="lang__item-texts">
                    <span class="lang__item-native">${details.native}</span>
                    ${details.english && details.english !== details.native ? `<span class="lang__item-sub">${details.english}</span>` : ''}
                </div>
            </div>
        `)

        item.on('hover:enter click', (e) => {
            selectLanguage(code)
        }).on('hover:focus', (e) => {
            scroll.update($(e.target), true)
            $('.lang__selector-item', html).removeClass('last-focus')
            $(e.target).addClass('last-focus')
        })

        scroll.append(item)
    }

    html.find('.lang__card-count').text(listCount)
    html.find('.lang__selector').append(scroll.render())

    function updateSuggestedUI(code, country){
        suggestedCode = code || 'en'
        detectedCountry = country || ''

        let info = LANG_DETAILS[suggestedCode] || LANG_DETAILS.en
        let flag = COUNTRY_FLAGS[detectedCountry] || LANG_FLAGS[suggestedCode] || '🌐'
        let countryName = COUNTRY_NAMES[detectedCountry] || ''

        html.find('.lang__title').text(info.title)
        html.find('.lang__subtitle').text(info.subtitle)

        html.find('.lang__card-flag').text(flag)
        let badgeText = countryName ? `${info.rec_text} (${countryName})` : info.rec_text
        html.find('.lang__card-badge-text').text(badgeText)
        html.find('.lang__card-title').text(info.continue_text)
        html.find('.lang__card-hint').text(`${info.native} • Default interface language`)
        html.find('.lang__card-secondary-title').text(info.all_text)
        html.find('.lang__back-text').text(info.back_text)

        // Highlight active item in all languages list
        html.find('.lang__selector-item').removeClass('is-selected')
        html.find(`[data-code="${suggestedCode}"]`).addClass('is-selected')
    }

    // Default to en initially while detection completes
    updateSuggestedUI('en', '')

    // Run IP / Region detection
    detectLanguage((detectedLang, countryCode) => {
        updateSuggestedUI(detectedLang, countryCode)
        if(currentView === 'suggested'){
            Controller.collectionSet(html.find('.lang__suggested'))
            Controller.collectionFocus(html.find('.lang__card--suggested')[0], html.find('.lang__suggested'))
        }
    })

    function selectLanguage(code){
        if(callSelected) callSelected(code)

        html.fadeOut(300, () => {
            if(scroll) scroll.destroy()
            html.remove()
            scroll = null
            html = null
        })
    }

    function switchView(view){
        currentView = view

        if(view === 'suggested'){
            html.find('.lang__all').addClass('hide')
            html.find('.lang__suggested').removeClass('hide')
            Controller.collectionSet(html.find('.lang__suggested'))
            Controller.collectionFocus(html.find('.lang__card--suggested')[0], html.find('.lang__suggested'))
        } else {
            html.find('.lang__suggested').addClass('hide')
            html.find('.lang__all').removeClass('hide')
            Controller.collectionSet(html.find('.lang__all'))
            let targetItem = html.find(`[data-code="${suggestedCode}"]`)
            let focusElem = targetItem.length ? targetItem[0] : html.find('.lang__selector-item')[0]
            Controller.collectionFocus(focusElem, html.find('.lang__all'))
            if(targetItem.length) scroll.update(targetItem, true)
        }
    }

    // Handlers for Suggested View
    html.find('.lang__card--suggested').on('hover:enter click', () => {
        selectLanguage(suggestedCode)
    })

    html.find('.lang__card--secondary').on('hover:enter click', () => {
        switchView('all')
    })

    // Handler for Back button
    html.find('.lang__back').on('hover:enter click', () => {
        switchView('suggested')
    })

    $('body').append(html)

    Controller.add('language', {
        toggle: () => {
            if(currentView === 'suggested'){
                Controller.collectionSet(html.find('.lang__suggested'))
                Controller.collectionFocus(html.find('.lang__card--suggested')[0], html.find('.lang__suggested'))
            } else {
                Controller.collectionSet(html.find('.lang__all'))
                let focus = html.find(`[data-code="${suggestedCode}"]`)
                Controller.collectionFocus(focus[0] || html.find('.lang__selector-item')[0], html.find('.lang__all'))
            }
        },
        up: () => {
            Navigator.move('up')
        },
        down: () => {
            Navigator.move('down')
        },
        back: () => {
            if(currentView === 'all'){
                switchView('suggested')
            } else if(callCancel){
                if(scroll) scroll.destroy()
                html.remove()
                scroll = null
                html = null
                callCancel()
            }
        }
    })

    Controller.toggle('language')
}

export default {
    open
}
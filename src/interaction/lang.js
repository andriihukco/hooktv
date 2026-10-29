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
    fr: ['Français', 'Bienvenue sur HOOK TV', 'Choisissez votre langue', 'Films, séries et TV — tout au même endroit.', 'Votre pays', 'Langue'],
    pl: ['Polski', 'Witamy w HOOK TV', 'Wybierz swój język', 'Filmy, seriale i TV — wszystko w jednym miejscu.', 'Twój kraj', 'Język'],
    de: ['Deutsch', 'Willkommen bei HOOK TV', 'Wähle deine Sprache', 'Filme, Serien und TV — alles an einem Ort.', 'Dein Land', 'Sprache'],
    es: ['Español', 'Bienvenido a HOOK TV', 'Elige tu idioma', 'Películas, series y TV — todo en un solo lugar.', 'Tu país', 'Idioma'],
    it: ['Italiano', 'Benvenuto su HOOK TV', 'Scegli la tua lingua', 'Film, serie e TV — tutto in un unico posto.', 'Il tuo paese', 'Lingua'],
    nl: ['Nederlands', 'Welkom bij HOOK TV', 'Kies je taal', 'Films, series en tv — alles op één plek.', 'Jouw land', 'Taal'],
    sv: ['Svenska', 'Välkommen till HOOK TV', 'Välj ditt språk', 'Filmer, serier och TV — allt på ett ställe.', 'Ditt land', 'Språk'],
    da: ['Dansk', 'Velkommen til HOOK TV', 'Vælg dit sprog', 'Film, serier og TV — alt samlet ét sted.', 'Dit land', 'Sprog'],
    no: ['Norsk', 'Velkommen til HOOK TV', 'Velg språk', 'Filmer, serier og TV — alt på ett sted.', 'Ditt land', 'Språk'],
    fi: ['Suomi', 'Tervetuloa HOOK TV:hen', 'Valitse kieli', 'Elokuvat, sarjat ja TV — kaikki yhdessä paikassa.', 'Maasi', 'Kieli'],
    et: ['Eesti', 'Tere tulemast HOOK TV-sse', 'Vali oma keel', 'Filmid, sarjad ja TV — kõik ühes kohas.', 'Sinu riik', 'Keel'],
    lv: ['Latviešu', 'Laipni lūdzam HOOK TV', 'Izvēlieties valodu', 'Filmas, seriāli un TV — viss vienā vietā.', 'Jūsu valsts', 'Valoda'],
    lt: ['Lietuvių', 'Sveiki atvykę į HOOK TV', 'Pasirinkite kalbą', 'Filmai, serialai ir TV — viskas vienoje vietoje.', 'Jūsų šalis', 'Kalba'],
    sk: ['Slovenčina', 'Vitajte v HOOK TV', 'Vyberte si jazyk', 'Filmy, seriály a TV — všetko na jednom mieste.', 'Vaša krajina', 'Jazyk'],
    hu: ['Magyar', 'Üdvözöljük a HOOK TV-n', 'Válassza ki a nyelvet', 'Filmek, sorozatok és TV — mindez egy helyen.', 'Az Ön országa', 'Nyelv'],
    el: ['Ελληνικά', 'Καλώς ήρθατε στο HOOK TV', 'Επιλέξτε τη γλώσσα σας', 'Ταινίες, σειρές και τηλεόραση — όλα σε ένα μέρος.', 'Η χώρα σας', 'Γλώσσα'],
    hr: ['Hrvatski', 'Dobro došli u HOOK TV', 'Odaberite jezik', 'Filmovi, serije i TV — sve na jednom mjestu.', 'Vaša zemlja', 'Jezik'],
    sr: ['Српски', 'Добродошли у HOOK TV', 'Изаберите језик', 'Филмови, серије и ТВ — све на једном месту.', 'Ваша земља', 'Језик'],
    sl: ['Slovenščina', 'Dobrodošli v HOOK TV', 'Izberite jezik', 'Filmi, serije in TV — vse na enem mestu.', 'Vaša država', 'Jezik'],
    mk: ['Македонски', 'Добредојдовте во HOOK TV', 'Изберете јазик', 'Филмови, серии и ТВ — сè на едно место.', 'Вашата земја', 'Јазик'],
    sq: ['Shqip', 'Mirë se erdhët në HOOK TV', 'Zgjidhni gjuhën tuaj', 'Filma, seriale dhe TV — gjithçka në një vend.', 'Vendi juaj', 'Gjuha'],
    bs: ['Bosanski', 'Dobro došli na HOOK TV', 'Odaberite jezik', 'Filmovi, serije i TV — sve na jednom mjestu.', 'Vaša zemlja', 'Jezik'],
    is: ['Íslenska', 'Velkomin á HOOK TV', 'Veldu tungumál', 'Kvikmyndir, þættir og sjónvarp — allt á einum stað.', 'Land þitt', 'Tungumál'],
    mt: ['Malti', 'Merħba fuq HOOK TV', 'Agħżel il-lingwa tiegħek', 'Films, serje u TV — kollox f’post wieħed.', 'Il-pajjiż tiegħek', 'Lingwa'],
    ga: ['Gaeilge', 'Fáilte go HOOK TV', 'Roghnaigh do theanga', 'Scannáin, sraitheanna agus teilifís — gach rud in aon áit amháin.', 'Do thír', 'Teanga'],
    ca: ['Català', 'Benvingut a HOOK TV', 'Tria el teu idioma', 'Pel·lícules, sèries i TV — tot en un sol lloc.', 'El teu país', 'Idioma'],
    lb: ['Lëtzebuergesch', 'Wëllkomm op HOOK TV', 'Wiel deng Sprooch', 'Filmer, Serien a TV — alles op enger Plaz.', 'Däi Land', 'Sprooch'],
    ja: ['日本語', 'HOOK TVへようこそ', '言語を選択してください', '映画、ドラマ、テレビ番組をすべて一か所で。', 'お住まいの国', '言語'],
    ko: ['한국어', 'HOOK TV에 오신 것을 환영합니다', '언어를 선택하세요', '영화, 드라마, TV를 한곳에서.', '국가', '언어'],
    tr: ['Türkçe', "HOOK TV'ye hoş geldiniz", 'Dilinizi seçin', 'Filmler, diziler ve TV — hepsi tek bir yerde.', 'Ülkeniz', 'Dil'],
    ka: ['ქართული', 'კეთილი იყოს თქვენი მობრძანება HOOK TV-ზე', 'აირჩიეთ ენა', 'ფილმები, სერიალები და ტელევიზია — ყველაფერი ერთ ადგილას.', 'თქვენი ქვეყანა', 'ენა']
}

GREETING.he[1] = 'ברוכים הבאים ל-HOOK TV'
GREETING.he[3] = 'סרטים, סדרות וטלוויזיה — הכול במקום אחד.'
GREETING.he[4] = 'המדינה שלך'
GREETING.he[5] = 'שפה'

const COUNTRY_LANGUAGE = {
    bg: 'bg', by: 'be', cn: 'zh', cz: 'cs', fr: 'fr', il: 'he',
    pt: 'pt', ro: 'ro', ru: 'ru', ua: 'uk',
    pl: 'pl', de: 'de', at: 'de', es: 'es', it: 'it', nl: 'nl', se: 'sv', dk: 'da', no: 'no', fi: 'fi',
    ee: 'et', lv: 'lv', lt: 'lt', sk: 'sk', hu: 'hu', gr: 'el', hr: 'hr', rs: 'sr', si: 'sl', mk: 'mk',
    al: 'sq', ba: 'bs', is: 'is', mt: 'mt', ie: 'ga', ad: 'ca', lu: 'lb', jp: 'ja', kr: 'ko', tr: 'tr', ge: 'ka'
}

const FLAG = {
    pl: '🇵🇱', de: '🇩🇪', es: '🇪🇸', it: '🇮🇹', nl: '🇳🇱', sv: '🇸🇪', da: '🇩🇰', no: '🇳🇴', fi: '🇫🇮',
    et: '🇪🇪', lv: '🇱🇻', lt: '🇱🇹', sk: '🇸🇰', hu: '🇭🇺', el: '🇬🇷', hr: '🇭🇷', sr: '🇷🇸', sl: '🇸🇮',
    mk: '🇲🇰', sq: '🇦🇱', bs: '🇧🇦', is: '🇮🇸', mt: '🇲🇹', ga: '🇮🇪', ca: '🇦🇩', lb: '🇱🇺', ja: '🇯🇵',
    ko: '🇰🇷', tr: '🇹🇷', ka: '🇬🇪',
    en: '🇬🇧', uk: '🇺🇦', ru: '🇷🇺', be: '🇧🇾', zh: '🇨🇳', pt: '🇵🇹',
    bg: '🇧🇬', he: '🇮🇱', cs: '🇨🇿', ro: '🇷🇴', fr: '🇫🇷'
}

// the Save button, in the language being chosen
const SAVE = {
    en: 'Save', uk: 'Зберегти', ru: 'Сохранить', be: 'Захаваць', zh: '保存', pt: 'Guardar',
    bg: 'Запази', he: 'שמירה', cs: 'Uložit', ro: 'Salvează', fr: 'Enregistrer',
    pl: 'Zapisz', de: 'Speichern', es: 'Guardar', it: 'Salva', nl: 'Opslaan', sv: 'Spara', da: 'Gem', no: 'Lagre',
    fi: 'Tallenna', et: 'Salvesta', lv: 'Saglabāt', lt: 'Išsaugoti', sk: 'Uložiť', hu: 'Mentés', el: 'Αποθήκευση',
    hr: 'Spremi', sr: 'Сачувај', sl: 'Shrani', mk: 'Зачувај', sq: 'Ruaj', bs: 'Sačuvaj', is: 'Vista', mt: 'Ħżin',
    ga: 'Sábháil', ca: 'Desa', lb: 'Späicheren', ja: '保存', ko: '저장', tr: 'Kaydet', ka: 'შენახვა'
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

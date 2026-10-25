import { inject } from '@vercel/analytics'
import Define from './utils/define/define'
import PromisePolyfill from './utils/define/promise'
import Brand from './core/brand'
import Manifest from './core/manifest'
import Lang from './core/lang'
import Platform from './core/platform'
import Render from './interaction/render'
import Keypad from './core/keypad'
import Activity from './interaction/activity/activity'
import Controller from './core/controller'
import Layer from './core/layer'
import Select from './interaction/select'
import Favorite from './core/favorite'
import Background from './interaction/background'
import Head from './interaction/head/head'
import Menu from './interaction/menu/menu'
import Utils from './utils/utils'
import Console from './interaction/console'
import Params from './interaction/settings/params'
import Input from './interaction/settings/input'
import Screensaver from './interaction/screensaver'
import Android from './core/android'
import Subscribe from './utils/subscribe'
import Storage from './core/storage/storage'
import Template from './interaction/template'
import Component from './core/component'
import Reguest from './utils/reguest'
import Filter from './interaction/filter'
import Files from './interaction/files_old'
import Explorer from './interaction/explorer'
import Scroll from './interaction/scroll'
import Empty from './interaction/empty/empty'
import Arrays from './utils/arrays'
import Noty from './interaction/noty'
import Player from './interaction/player'
import Sources from './core/sources'
import PlayerVideo from './interaction/player/video'
import PlayerPanel from './interaction/player/panel'
import PlayerFooter from './interaction/player/footer'
import PlayerInfo from './interaction/player/info'
import PlayerPlaylist from './interaction/player/playlist'
import Timeline from './interaction/timeline'
import Settings from './interaction/settings/settings'
import SettingsApi from './interaction/settings/api'
import Modal from './interaction/modal'
import Api from './core/api/api'
import Info from './interaction/info_old'
import Card from './interaction/card'
import Account from './core/account/account'
import Plugins from './core/plugins'
import Recomends from './core/recomend'
import PersonalRows from './core/personal_rows'
import TimeTable from './core/timetable'
import Helper from './interaction/helper'
import Tizen from './core/tizen'
import InteractionMain from './interaction/items/old/main'
import InteractionCategory from './interaction/items/old/category'
import InteractionLine from './interaction/items/old/line'
import Status from './utils/status'
import LangChoice from './interaction/lang'
import Iframe from './interaction/iframe'
import Parser from './core/api/sources/parser'
import TMDB from './core/tmdb/tmdb'
import Base64 from './utils/base64'
import Loading from './interaction/loading'
import YouTube from './interaction/youtube'
import WebOSLauncher from './interaction/webos_launcher'
import Search from './interaction/search/global'
import Developer from './interaction/developer'
import DeviceInput from './interaction/device_input'
import AppWorker from './utils/worker'
import Theme from './core/theme'
import DB from './utils/db'
import NavigationBar from './interaction/navigation_bar'
import LibraryFilter from './interaction/library_filter'
import Endless from './interaction/endless'
import Color from './utils/color'
import Cache from './utils/cache'
import Demo from './core/demo'
import Torrent from './interaction/torrent'
import Torserver from './interaction/torserver'
import Speedtest from './interaction/speedtest'
import VPN from './core/vpn'
import Processing from './interaction/processing'
import ParentalControl from './interaction/parental_control'
import Personal from './core/personal'
import Sound from './core/sound'
import Bell from './interaction/bell'
import HoverSwitcher from './core/switcher'
import Task from './core/loading'
import App from './interaction/app'
import LoadingProgress from './interaction/loading_progress'
import StorageMenager from './interaction/storage_manager'
import RemoteHelper from './interaction/remote_helper'
import DataBase from './interaction/database'
import Maker from './interaction/maker'
import MaskHelper from './utils/mask'
import ContentRows from './core/content_rows'
// Tastes is paused for now; restore this import together with the init call below
// import TastesSettings from './interaction/tastes/settings'
import Emit from './utils/emit'
import Router from './core/router'
import Timer from './core/timer'

import ServiceTorserver from './services/torrserver'
import ServiceSettings from './services/settings'
import ServiceDeveloper from './services/developer'
import ServiceRemoteFavorites from './services/remote_favorites'
import ServiceBlocklists from './services/blocklists'
import ServiceFPS from './services/fps'
import ServiceChildren from './services/children'
import ServiceOnline from './services/online'

window.screen_width  = window.innerWidth
window.screen_height = window.innerHeight

/**
 * Настройки приложения
 */

if(typeof window.lampa_settings == 'undefined'){
    window.lampa_settings = {}
}

if(typeof window.hook_settings !== 'undefined'){
    Arrays.extend(window.lampa_settings, window.hook_settings)
}

// HOOK TV: no torrents. Playback comes from the online sources only, so there
// is no TorrServer or parser to set up
let torrents_use = false

Arrays.extend(window.lampa_settings,{
    // Использовать сокеты для синхронизации данных
    socket_use: true,

    // Адрес сокета, по умолчанию лампа берет адреса из манифеста
    socket_url: undefined,

    // Обрабатывать сообщения сокетов
    socket_methods: true,

    // Адрес проекта Supabase и публичный anon-ключ (аккаунты, синхронизация)
    supabase_url: undefined,
    supabase_anon_key: undefined,

    // Страница входа с телефона для ТВ (в QR-код добавляется ?ticket=...)
    supabase_signin_url: undefined,

    // Использовать аккаунты (включается, только если задан проект Supabase)
    account_use: false,

    // Синхронизировать закладки, таймкоды и прочее (включается вместе с аккаунтом)
    account_sync: false,

    // Разрешить установку плагинов и расширений
    plugins_use: false,

    // Разрешить использование магазина расширений
    plugins_store: false,

    // Показывать кнопку торрентов
    torrents_use: torrents_use,

    // Минимальный интерфейс: верхняя навигация Home / Series / Movies / Favorites + поиск
    minimal_ui: true,

    // Отключить фитчи куба и лампы
    disable_features: {
        // Блокировку карточек
        dmca: false,
        // Блокировка ЛГБТ-контента
        lgbt: false,
        // Реакции
        reactions: false,
        // Обсуждения
        discuss: true,
        // ИИ
        ai: true,
        // Подписка на уведомления
        subscribe: true,
        // Черный список плагинов
        blacklist: false,
        // Подписка на актеров
        persons: true,
        // Вспомогатиленые сервисы на подписку према
        ads: false,
        // Трейлеры
        trailers: false,
        // Установка прокси для запросов
        install_proxy: false,
        // Удаленная конфигурация
        remote_configuration: false
    },

    // Подключить другие языки интерфейса, по умолчанию только русский и английский
    lang_use: true,

    // Белая и пушистая лампа, для одобрения модерации
    white_use: false,

    // Режим только для чтения, без кнопок онлайн и расширений
    read_only: false,

    // Добавить список блокировки карточек, пример: [{"id":3566556,"cat":"movie"},...]
    dcma: false,

    // Добавить блокировку ЛГБТ контента, пример: [{"id":3566556,"type":"movie"},...]
    lgbt: false,

    // Добавлять в адресную строку название текущего экрана
    push_state: true,

    // Показать ленту
    feed: false,

    // Различные сервисы в приложении
    services: true,

    // Подключить YouTube API
    youtube: false,

    // Определять гео по IP, иначе будет RU
    geo: true,

    // Использовать поиск зеркал
    mirrors: true,

    // Режим разработчика
    developer: {
        enabled: false
    },

    // Размывать постер для мобильных устройств, эффект стекла
    blur_poster: true,

    // Скрывать важные параметры в приложении
    hide_important_params: true,

    // Фикс для виджетов, чтобы не подгружались стили с github
    fix_widget: window.localStorage.getItem('fix_widget') ? true : false,
})

window.hook_settings = window.lampa_settings


// Если отключили 
if(window.localStorage.getItem('remove_white_and_demo')){
    window.lampa_settings.demo         = false
    window.lampa_settings.white_use    = false
}

// Аккаунт и синхронизация работают только при заданном проекте Supabase
const supa_ready = Boolean(window.lampa_settings.supabase_url && window.lampa_settings.supabase_anon_key)

window.lampa_settings.account_use  = supa_ready
window.lampa_settings.account_sync = supa_ready

// Realtime-сокет CUB не нужен: синхронизация идет через Supabase
window.lampa_settings.socket_use = false

/**
 * Делаем классы доступными в глобальной области видимости
 */
function initClass(){
    let api = {
        Brand,
        Listener: Subscribe(),
        Lang,
        Subscribe,
        Storage,
        Platform,
        Utils,
        Params,
        Menu,
        Head,
        Background,
        Favorite,
        Select,
        Controller,
        Activity,
        Keypad,
        Template,
        Component,
        Reguest,
        Filter,
        Files,
        Explorer,
        Scroll,
        Empty,
        Arrays,
        Noty,
        Player,
        Sources,
        PlayerVideo,
        PlayerInfo,
        PlayerPanel,
        PlayerFooter,
        PlayerPlaylist,
        Timeline,
        Modal,
        Api,
        Settings,
        SettingsApi,
        Android,
        Card,
        Info,
        Account,
        Input,
        Screensaver,
        Recomends,
        TimeTable,
        Helper,
        InteractionMain,
        InteractionCategory,
        InteractionLine,
        Status,
        Plugins,
        Tizen,
        Layer,
        Console,
        Iframe,
        Parser,
        Manifest,
        TMDB,
        Base64,
        Loading,
        YouTube,
        WebOSLauncher,
        Search,
        DeviceInput,
        Worker: AppWorker,
        DB,
        NavigationBar,
        Endless,
        Color,
        Cache,
        Torrent,
        Torserver,
        Speedtest,
        Processing,
        ParentalControl,
        VPN,
        Bell,
        StorageMenager,
        RemoteHelper,
        Network: new Reguest(),
        Maker,
        MaskHelper,
        ContentRows,
        Emit,
        Router,
        Timer
    }

    window.HOOK = api
    window.Lampa = api
}

/**
 * Подготовка приложения к запуску
 */
function prepareApp(){
    if(window.prepared_app) return

    LoadingProgress.init()

    document.body.append(Noty.render())

    Platform.init()

    LoadingProgress.status('Platform init')

    DeviceInput.init()

    LoadingProgress.status('DeviceInput init')

    Params.init()

    LoadingProgress.status('Params init')

    Controller.observe()

    LoadingProgress.status('Controller observe init')

    Console.init()

    LoadingProgress.status('Console init')

    Keypad.init()

    LoadingProgress.status('Keypad init')

    Layer.init()

    LoadingProgress.status('Layer init')

    HoverSwitcher.init()

    // Передаем фокус в контроллер

    Navigator.follow('focus', (event)=>{
        Controller.focus(event.elem)
    })

    // Выход в начальном скрине

    Keypad.listener.follow('keydown',(e)=>{
        if(window.appready || Controller.enabled().name == 'modal' || (Platform.is('browser') || Platform.desktop())) return

        if (e.code == 8 || e.code == 27 || e.code == 461 || e.code == 10009 || e.code == 88) App.modalClose()
    })

    LoadingProgress.status('Subscribe on keydown')

    // Отключаем правый клик

    if(window.innerWidth > 1280) window.addEventListener("contextmenu", e => e.preventDefault())
    
    App.loadStyle()

    LoadingProgress.status('Loaded styles')

    Layer.update()

    LoadingProgress.status('Prepare ready')

    window.prepared_app = true
}

/**
 * Меню разработчика
 */
function developerApp(proceed){
    let expect  = true
    let pressed = 0

    let timer   = setTimeout(()=>{
        expect  = false

        proceed()
    }, 1000)

    let check = ()=>{
        pressed++

        if(pressed === 3){
            clearTimeout(timer)

            expect = false

            Keypad.enable()

            Developer.open(()=>{
                Keypad.disable()

                proceed()
            })

            console.log('Developer mode','on')
        }
    }

    let keydown = (event)=>{
        if(expect){
            if(event.keyCode == 38 || event.keyCode == 29460 || event.keyCode == 50400012) check()
        }
        else{
            document.removeEventListener('keydown', keydown)
        }
    }

    $('.welcome').on('click', (e)=>{
        if(expect && DeviceInput.canClick(e.originalEvent)) check()
    })

    window.addEventListener("keydown", keydown)
}

/**
 * Старт приложения
 */
function startApp(){
    if(window.appready || window.app_time_launch) return

    window.app_time_launch = Date.now()
    window.app_time_end    = 0

    // Стартуем

    LoadingProgress.status('Launching the application')

    Lampa.Listener.send('app',{type:'start'})

    // Инициализируем классы

    Timer.init()
    LoadingProgress.status('Timer init')

    Storage.init()
    LoadingProgress.status('Storage init')

    Timeline.init()
    LoadingProgress.status('Timeline init')



    Personal.init()
    LoadingProgress.status('Personal init')

    Head.init()
    LoadingProgress.status('Head init')

    Settings.init()
    LoadingProgress.status('Settings init')

    Select.init()
    LoadingProgress.status('Select init')

    Favorite.init()
    LoadingProgress.status('Favorite init')

    Background.init()
    LoadingProgress.status('Background init')



    Bell.init()
    LoadingProgress.status('Bell init')

    Menu.init()
    LoadingProgress.status('Menu init')

    Activity.init()
    LoadingProgress.status('Activity init')

    Screensaver.init()
    LoadingProgress.status('Screensaver init')


    Account.init()
    LoadingProgress.status('Account init')


    Plugins.init()
    LoadingProgress.status('Plugins init')

    Recomends.init()
    LoadingProgress.status('Recomends init')

    PersonalRows.init()
    LoadingProgress.status('PersonalRows init')

    TimeTable.init()
    LoadingProgress.status('Timetable init')

    Helper.init()
    LoadingProgress.status('Helper init')

    Tizen.init()
    LoadingProgress.status('Tizen init')

    Player.init()
    LoadingProgress.status('Player init')

    Iframe.init()
    LoadingProgress.status('Iframe init')

    Parser.init()
    LoadingProgress.status('Parser init')

    WebOSLauncher.init()
    LoadingProgress.status('WebOSLauncher init')

    Theme.init()
    LoadingProgress.status('Theme init')


    NavigationBar.init()
    LoadingProgress.status('NavigationBar init')

    LibraryFilter.init()

    Demo.init()
    LoadingProgress.status('Demo init')

    Speedtest.init()
    LoadingProgress.status('Speedtest init')

    Processing.init()
    LoadingProgress.status('Processing init')

    ParentalControl.init()
    LoadingProgress.status('ParentalControl init')

    Android.init()
    LoadingProgress.status('Android init')

    Sound.init()
    LoadingProgress.status('Sound init')




    Search.init()
    LoadingProgress.status('Search init')

    DataBase.init()
    LoadingProgress.status('DataBase init')

    ContentRows.init()
    LoadingProgress.status('ContentRows init')

    // TastesSettings.init()
    
    // Добавляем источники поиска


    LoadingProgress.status('Initialization successful')

    // Выводим информацию о приложении

    let ratio = window.devicePixelRatio || 1

    console.log('App','screen size:', Math.round(window.innerWidth * ratio) + ' / ' + Math.round(window.innerHeight * ratio))
    console.log('App','interface size:', window.innerWidth + ' / ' + window.innerHeight)
    console.log('App','pixel ratio:', window.devicePixelRatio)
    console.log('App','user agent:', navigator.userAgent)
    console.log('App','touch points:', navigator.maxTouchPoints)
    console.log('App','is tv:', Platform.screen('tv'))
    console.log('App','is mobile:', Platform.screen('mobile'))
    console.log('App','is touch:', Utils.isTouchDevice())
    console.log('App','is PWA:', Utils.isPWA())
    console.log('App','platform:', Storage.get('platform', 'noname'))
    console.log('App','version:', Manifest.app_version)
    console.log('App','build date:', '{__APP_BUILD__}')
    console.log('App','hash', '{__APP_HASH__}')
    console.log('App','location:', location.href)

    // Записываем uid

    if(!Storage.get('lampa_uid','')) Storage.set('lampa_uid', Utils.uid())

    // Ренедрим лампу

    Render.app()

    LoadingProgress.status('Render app')

    // Инициализируем остальные сервисы

    ServiceDeveloper.init()
    LoadingProgress.status('ServiceDeveloper init')

    ServiceTorserver.init()
    LoadingProgress.status('ServiceTorserver init')


    ServiceSettings.init()
    LoadingProgress.status('ServiceSettings init')


    ServiceRemoteFavorites.init()
    LoadingProgress.status('ServiceBlocklists init')
    ServiceBlocklists.init()
    LoadingProgress.status('ServiceRemoteFavorites init')


    ServiceFPS.init()
    LoadingProgress.status('ServiceFPS init')




    ServiceChildren.init()
    LoadingProgress.status('ServiceChildren init')


    ServiceOnline.init()
    LoadingProgress.status('ServiceOnline init')

    // Обновляем слои

    Layer.update()

    LoadingProgress.status('Layer update')

    // Сообщаем о готовности

    LoadingProgress.status('Send app ready')

    // Лампа полностью готова

    window.appready = true

    window.app_time_end = Date.now()

    Lampa.Listener.send('app',{type:'ready'})
}

/**
 * Показать приложение в любом случае
 */
function showApp(){
    LoadingProgress.status('Show app')
    
    // Скрытие логотипа: not before the logo has filled left to right (2.2s) and the OO spark has run a lap
    let shown = Date.now() - (window.hooktv_splash_start || 0)

    setTimeout(()=>{
        if(window.show_app) return

        window.show_app = true

        LoadingProgress.destroy()

        Keypad.enable()

        Screensaver.enable()

        $('.welcome').fadeOut(500,function(){
            $(this).remove()
        })

        // the app rises into view as the splash fades (welcome.scss); the class goes once it ends,
        // so the transform does not stay on #app and break position: fixed children
        // (a timer too: animationend never comes when the animation does not run, e.g. reduced motion)
        let app = $('#app').addClass('app--enter')
        let entered = ()=>app.removeClass('app--enter')

        app.one('animationend', function(e){
            if(e.target === this) entered()
        })

        setTimeout(entered, 1000)
    },Math.max(500, 3200 - shown))

    // Старт приложения
    startApp()
}

/**
 * Приоритетная загрузка
 */
function loadTask(){
    Task.queue((next)=>{
        LoadingProgress.status('Open cache database')

        Cache.openDatabase().then(()=>{
            console.log('Cache', 'worked')

            next()
        }).catch(()=>{
            console.log('Cache', 'error', 'no open database')

            next()
        })
    })

    Task.queue((next)=>{
        LoadingProgress.status('Storage load reserve')
        
        Storage.task(next)
    })

    Task.queue((next)=>{
        LoadingProgress.status('Plugins initialization')

        LoadingProgress.step(3)

        Plugins.task(next)
    })

    Task.queue((next)=>{
        LoadingProgress.status('Account initialization')

        LoadingProgress.step(4)

        Account.task(next)
    })

    Task.queue((next)=>{
        LoadingProgress.status('Cache initialization')

        LoadingProgress.step(5)

        next()
    })

    Task.secondary(()=>{
        setTimeout(showApp, 5000)
    })

    Task.secondary(()=>{
        LoadingProgress.status('Loading plugins')
        LoadingProgress.step(6)

        Plugins.load(showApp)
    })

    Task.start()
}

/**
 * Загрузка языка
 */
function loadLang(){
    let code = window.localStorage.getItem('language') || 'en'

    // HOOK TV: TMDB speaks the interface language; there is no separate setting for it
    if(Storage.get('tmdb_lang', '') !== code) Storage.set('tmdb_lang', code, true)

    // the torrents start page is gone with the torrents
    if(Storage.get('start_page', 'main') == 'mytorrents') Storage.set('start_page', 'main', true)

    LoadingProgress.setTotalSteps(6)
    LoadingProgress.step(1)
    
    if(['ru','en'].indexOf(code) >= 0) loadTask()
    else{
        LoadingProgress.status('Loading language')

        $.ajax({
            url: (location.protocol == 'file:' || Platform.desktop() ? Manifest.github_lampa : './') + 'lang/' + code + '.js',
            dataType: 'text',
            timeout: 10000,
            success: (data)=>{
                try{
                    let translate = {}

                    eval((data + '').replace(/export default/g,'translate = ').trim())

                    Lang.AddTranslation(code, translate)
                }
                catch(e){}

                loadTask()
            },
            error: loadTask
        })
    }
}

/**
 * Первая загрузка приложения
 */
function loadApp(){
    prepareApp() // Готовим приложение

    // Если язык уже установлен, то запускаем приложение
    if(window.localStorage.getItem('language') || !window.lampa_settings.lang_use){
        // Но сперва ожидаем не вызвали ли пользователь меню разработчика, затем подгружаем язык
        developerApp(loadLang)
    }
    else{
        // Иначе предлагаем выбрать язык
        let selectLanguage = (code, country)=>{
            Storage.set('language', code, true)
            Storage.set('tmdb_lang',code, true)
            if(country) Storage.set('setup_country', country, true)

            Keypad.disable()

            loadLang()
        }

        LangChoice.open(selectLanguage, selectLanguage)

        Keypad.enable()
    }
}

if(!window.fitst_load){
    window.fitst_load = true

    // Initialize Vercel Web Analytics
    inject()

    initClass()
    
    if(navigator.userAgent.toLowerCase().indexOf('lampa_client') > -1){
        function checkReady(){
            if(window.innerWidth > 0) loadApp()
            else{
                setTimeout(checkReady,100)
            }
        }

        checkReady()
    }
    else loadApp()
}

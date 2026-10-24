function startPlugin(){
    if(window.zen_mode_ready) return

    window.zen_mode_ready = true

    let component = 'zen_mode'
    let storageKey = 'zen_mode_enabled'

    let manifest = {
        type: 'video',
        version: '1.0.0',
        name: 'Zen Mode',
        description: 'Neo-minimal interface: posters, typography, no visual noise.',
        component: component
    }

    Lampa.Manifest.plugins = manifest

    Lampa.Lang.add({
        zen_mode: {
            ru: 'Zen Mode',
            uk: 'Zen Mode',
            en: 'Zen Mode',
            be: 'Zen Mode'
        },
        zen_mode_enabled: {
            ru: 'Включить Zen Mode',
            uk: 'Увімкнути Zen Mode',
            en: 'Enable Zen Mode',
            be: 'Уключыць Zen Mode'
        },
        zen_mode_enabled_descr: {
            ru: 'Минималистичный интерфейс: крупная типографика, постеры, без рейтингов и лишних элементов',
            uk: 'Мінімалістичний інтерфейс: велика типографіка, постери, без рейтингів і зайвих елементів',
            en: 'Minimal interface: large typography, posters, no ratings or clutter',
            be: 'Мінімалістычны інтэрфейс: вялікая тыпографіка, постэры, без рэйтынгаў і лішніх элементаў'
        }
    })

    function isEnabled(value){
        if(typeof value === 'undefined') value = Lampa.Storage.get(storageKey, true)

        return value !== false && value !== 'false'
    }

    function apply(enabled){
        document.body.classList.toggle('zen--mode', isEnabled(enabled))
    }

    function injectCss(){
        if(document.getElementById('zen-mode-css')) return

        $('body').append(`
            <style id="zen-mode-css">
            @@include('../plugins/zen_mode/css/style.css')
            </style>
        `)
    }

    Lampa.SettingsApi.addComponent({
        component: component,
        icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="18" stroke="white" stroke-width="2.5"/>
            <path d="M24 14v10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="24" cy="32" r="1.5" fill="white"/>
        </svg>`,
        name: Lampa.Lang.translate('zen_mode')
    })

    Lampa.SettingsApi.addParam({
        component: component,
        param: {
            name: storageKey,
            type: 'trigger',
            default: true
        },
        field: {
            name: Lampa.Lang.translate('zen_mode_enabled'),
            description: Lampa.Lang.translate('zen_mode_enabled_descr')
        },
        onChange: apply
    })

    injectCss()
    apply()

    Lampa.Storage.listener.follow('change', (e)=>{
        if(e.name === storageKey) apply(e.value)
    })
}

if(window.appready) startPlugin()
else{
    Lampa.Listener.follow('app', (e)=>{
        if(e.type === 'ready') startPlugin()
    })
}

// Settings page "HOOK TV plugins": lists every hooktv_* plugin loaded in this session.
// Importing the core makes window.HookTV available regardless of plugin load order;
// the core guards itself, so a second copy in this bundle does not re-initialise.
import '../hooktv_core/hooktv_core'

function startPlugin(){
    if(window.hooktv_registry_ready || !window.HookTV) return

    window.hooktv_registry_ready = true

    const component = 'hooktv_registry'
    const api = Lampa.SettingsApi

    const manifest = {
        id: 'hooktv_registry',
        name: 'HOOK TV Plugins',
        version: '1.0.0',
        category: 'utilities',
        licence: 'Proprietary (HOOK TV)',
        description: 'Settings page listing the HOOK TV plugins loaded in this session.'
    }

    window.HookTV.registry.register(manifest)

    Lampa.Lang.add({
        hooktv_registry_name: {
            ru: 'Плагины HOOK TV',
            uk: 'Плагіни HOOK TV',
            be: 'Плагіны HOOK TV',
            en: 'HOOK TV plugins'
        },
        hooktv_registry_empty: {
            ru: 'Плагины HOOK TV не загружены',
            uk: 'Плагіни HOOK TV не завантажені',
            be: 'Плагіны HOOK TV не загружаны',
            en: 'No HOOK TV plugins loaded'
        }
    })

    api.addComponent({
        component,
        name: Lampa.Lang.translate('hooktv_registry_name'),
        icon: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="8" width="14" height="14" rx="3" stroke="white" stroke-width="2.5"/>
            <rect x="26" y="8" width="14" height="14" rx="3" stroke="white" stroke-width="2.5"/>
            <rect x="8" y="26" width="14" height="14" rx="3" stroke="white" stroke-width="2.5"/>
            <rect x="26" y="26" width="14" height="14" rx="3" stroke="white" stroke-width="2.5"/>
        </svg>`
    })

    function render(){
        api.removeParams(component)

        const list = window.HookTV.registry.list()

        if(!list.length){
            api.addParam({
                component,
                param: {name: 'hooktv_registry_empty', type: 'static'},
                field: {name: Lampa.Lang.translate('hooktv_registry_empty')}
            })

            return
        }

        list.forEach(item=>{
            api.addParam({
                component,
                param: {name: 'hooktv_plugin_' + item.id, type: 'static'},
                field: {
                    name: item.name + ' ' + item.version,
                    description: item.category + ' · ' + item.licence + ' · ' + (item.description || '')
                }
            })
        })
    }

    Lampa.Settings.listener.follow('open', e=>{
        if(e.name === component) render()
    })
}

if(window.appready) startPlugin()
else{
    Lampa.Listener.follow('app', e=>{
        if(e.type === 'ready') startPlugin()
    })
}

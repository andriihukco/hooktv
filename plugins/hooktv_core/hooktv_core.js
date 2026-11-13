import {HOOKTV_VERSION, createRegistry, createConfig, safe} from './sdk'

// Core of the HOOK TV plugin ecosystem. Loads first and exposes window.HookTV,
// which every other hooktv_* plugin uses for registration, config and error handling.
if(!window.HookTV){
    const registry = createRegistry()

    const report = (name, e) => console.warn('HookTV', name + ':', e && e.message ? e.message : e)

    window.HookTV = {
        version: HOOKTV_VERSION,
        registry,
        safe: (name, fn) => safe(name, fn, report),
        config: createConfig(Lampa.Storage, 'hooktv_'),
        report
    }

    const manifest = {
        id: 'hooktv_core',
        name: 'HOOK TV Core',
        version: HOOKTV_VERSION,
        category: 'core',
        licence: 'Proprietary (HOOK TV)',
        description: 'Shared registry, config and error handling for HOOK TV plugins.'
    }

    registry.register(manifest)

    if(Lampa.Lang){
        Lampa.Lang.add({
            hooktv_core_name: {
                ru: 'Ядро HOOK TV',
                uk: 'Ядро HOOK TV',
                be: 'Ядро HOOK TV',
                en: 'HOOK TV Core'
            }
        })
    }

    console.log('HookTV', 'core ' + HOOKTV_VERSION + ' ready')
}

import {afterEach, beforeEach, expect, suite, test, vi} from 'vitest'

const saved = vi.hoisted(()=>({}))

vi.mock('../src/core/storage/storage', ()=>({
    default: {
        get: (name, empty)=> name in saved ? saved[name] : empty,
        set: (name, value)=>{ saved[name] = value }
    }
}))

import Catalog from '../src/services/online_sources_catalog.js'
import Sources from '../src/services/online_sources_store.js'

suite('online sources', ()=>{
    beforeEach(()=>{
        for(let key in saved) delete saved[key]
        vi.stubGlobal('window', {lampa_settings: {}})
        Sources.saveAvailable([])
    })

    afterEach(()=>vi.unstubAllGlobals())

    test('built-in catalog has unique keys, a title and a quality label where one is known', ()=>{
        let keys = Catalog.map(item=>item.key)

        expect(new Set(keys).size).toBe(keys.length)
        expect(Catalog.every(item=>item.display_name)).toBe(true)
        expect(Sources.getQuality('kinotochka')).toBe('4K')
        expect(Sources.getQuality('aniliberty')).toBe('')
    })

    test('sources that were not answering or disabled start switched off, the rest on', ()=>{
        let hidden = Sources.getHidden()

        expect(hidden).toEqual(Catalog.filter(item=>item.off).map(item=>item.key))
        expect(hidden).toEqual(expect.arrayContaining(['krasview', 'collaps-dash', 'iremux']))
        expect(hidden).not.toContain('kodik')
        expect(hidden).not.toContain('uaflix')
    })

    test('the settings list shows the catalog until the server sends its own list', ()=>{
        expect(Sources.settingsList()).toBe(Catalog)

        Sources.saveAvailable([{key: 'Server', name: 'Server', enabled: true}])

        expect(Sources.settingsList()).toEqual([{key: 'Server', name: 'Server', enabled: true}])
    })

    test('a saved switch list replaces the default-off list, so a switched-on source stays on', ()=>{
        Sources.saveHidden(['kodik'])

        expect(Sources.getHidden()).toEqual(['kodik'])
        expect(Sources.applyUserFilters(['kodik', 'vibix'])).toEqual(['vibix'])
    })

    test('an empty saved switch list means every source is on', ()=>{
        Sources.saveHidden([])

        expect(Sources.getHidden()).toEqual([])
    })

    test('the title sheet lists switched-on sources first, each group in the saved order', ()=>{
        Sources.saveAvailable([
            {key: 'krasview', enabled: true},
            {key: 'kodik', enabled: true},
            {key: 'vibix', enabled: true},
            {key: 'hdrezka', enabled: true}
        ])
        Sources.saveHidden(['krasview'])
        Sources.saveSorted(['vibix', 'kodik'])

        expect(Sources.ordered().map(s=>s.key)).toEqual(['vibix', 'kodik', 'hdrezka', 'krasview'])
        expect(Sources.ordered().map(s=>s.active)).toEqual([true, true, true, false])
    })

    test('HDRezka is listed as a source like the others', ()=>{
        Sources.saveAvailable([{key: 'hdrezka', enabled: true}])

        expect(Sources.ordered().map(s=>s.key)).toEqual(['hdrezka'])
    })

    test('a stored value that is not a list falls back to the defaults', ()=>{
        saved.HOOK_ONLINE_SOURCES_HIDE = 'broken'

        expect(Sources.getHidden()).toEqual(Sources.defaultHidden())
    })

    test('the system flag hides providers from settings and search results', ()=>{
        window.lampa_settings.hooktv_system_flags = {online_sources: false}

        expect(Sources.settingsList()).toEqual([])
        expect(Sources.applyUserFilters(['kodik', 'vibix'])).toEqual([])
    })

    test('system source overrides hide a provider and can enable a default-off provider', ()=>{
        window.lampa_settings.hooktv_system_source_overrides = {kodik: false, 'collaps-dash': true}

        expect(Sources.settingsList().map(source=>source.key)).not.toContain('kodik')
        expect(Sources.getHidden()).not.toContain('collaps-dash')
        expect(Sources.applyUserFilters(['kodik', 'collaps-dash'])).toEqual(['collaps-dash'])
    })
})

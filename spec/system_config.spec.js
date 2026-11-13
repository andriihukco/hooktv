import {afterEach, expect, it, vi} from 'vitest'
import system from '../api/_system-config.js'

afterEach(()=>vi.unstubAllGlobals())

it('starts from the checked-in defaults and validates each managed setting', ()=>{
    expect(system.parseSystemConfig(system.DEFAULT_CONFIG)).toEqual(system.DEFAULT_CONFIG)

    const parsed = system.parseSystemConfig({
        schema: 1,
        flags: {movies: false},
        plugins: {collections: true},
        onlineSourceOverrides: {kodik: false}
    })

    expect(parsed.flags.movies).toBe(false)
    expect(parsed.plugins.collections).toBe(true)
    expect(parsed.onlineSourceOverrides.kodik).toBe(false)
})

it('rejects unknown keys, invalid values and feature-dependent plugin conflicts', ()=>{
    expect(()=>system.parseSystemConfig({schema: 2})).toThrow(/Unsupported/)
    expect(()=>system.parseSystemConfig({schema: 1, flags: {unknown: true}})).toThrow(/flag/)
    expect(()=>system.parseSystemConfig({schema: 1, plugins: {unknown: true}})).toThrow(/plugin/)
    expect(()=>system.parseSystemConfig({schema: 1, onlineSourceOverrides: {unknown: true}})).toThrow(/source/)
    expect(()=>system.parseSystemConfig({
        schema: 1,
        flags: {live_tv: false},
        plugins: {iptv: true}
    })).toThrow(/requires/)
})

it('joins local bundles, online providers and all audited third-party sources for admin', ()=>{
    const catalog = system.adminCatalog()

    expect(catalog.plugins).toHaveLength(19)
    expect(catalog.onlineSources.length).toBeGreaterThan(0)
    expect(catalog.thirdPartySources).toHaveLength(24)
    expect(catalog.thirdPartySources.every(source=>source.audit && source.assessment && source.functionality)).toBe(true)
})

it('returns only runtime settings from the public config projection', ()=>{
    const config = system.publicConfig(system.DEFAULT_CONFIG, 7, '2026-11-13T00:00:00Z')

    expect(config.revision).toBe(7)
    expect(config.plugins.hooktv_core).toBe(true)
    expect(config).not.toHaveProperty('catalog')
    expect(config).not.toHaveProperty('thirdPartySources')
})

it('reads defaults when no persisted row exists and reports compare-and-swap conflicts', async ()=>{
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async()=>[]}))

    const stored = await system.readStoredConfig('https://database.example', 'service-key')
    const conflict = await system.saveStoredConfig('https://database.example', 'service-key', 0, system.DEFAULT_CONFIG)

    expect(stored.revision).toBe(0)
    expect(stored.updatedAt).toBeNull()
    expect(stored.config).toEqual(system.DEFAULT_CONFIG)
    expect(conflict).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
})

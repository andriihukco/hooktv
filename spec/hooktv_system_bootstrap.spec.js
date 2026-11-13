import {expect, it, vi} from 'vitest'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync('public/js/hooktv-system.js', 'utf8')

async function boot({cached, response, fetchError} = {}){
    const values = new Map(cached ? [['hooktv_system_config_v1', JSON.stringify(cached)]] : [])
    const window = {hook_settings: {language: 'uk'}}
    const context = {
        window,
        localStorage: {
            getItem: key=>values.get(key) || null,
            setItem: (key, value)=>values.set(key, value)
        },
        fetch: fetchError ? vi.fn().mockRejectedValue(fetchError) : vi.fn().mockResolvedValue({ok: true, json: async()=>response}),
        AbortController,
        setTimeout,
        clearTimeout
    }

    vm.runInNewContext(source, context)
    await window.hooktv_system_ready

    return {window, values, fetch: context.fetch}
}

it('applies a valid server config before app startup without replacing existing hook settings', async ()=>{
    const result = await boot({response: {
        schema: 1,
        revision: 2,
        flags: {movies: false},
        plugins: {hooktv_core: true, hooktv_registry: true, collections: true},
        onlineSourceOverrides: {hdrezka: false}
    }})

    expect(result.window.hook_settings.language).toBe('uk')
    expect(result.window.hook_settings.hooktv_system_flags.movies).toBe(false)
    expect(result.window.hook_settings.hooktv_system_plugins).toEqual(['hooktv_core', 'hooktv_registry', 'collections'])
    expect(result.window.hook_settings.hooktv_system_source_overrides.hdrezka).toBe(false)
    expect(result.values.has('hooktv_system_config_v1')).toBe(true)
})

it('uses cached settings after an API failure and safe defaults on a first launch', async ()=>{
    const cache = {
        schema: 1,
        flags: {music: false},
        plugins: {hooktv_core: true, hooktv_registry: true},
        onlineSourceOverrides: {}
    }
    const cached = await boot({cached: cache, fetchError: new Error('offline')})
    const firstLaunch = await boot({fetchError: new Error('offline')})

    expect(cached.window.hook_settings.hooktv_system_flags.music).toBe(false)
    expect(firstLaunch.window.hook_settings.hooktv_system_flags.music).toBe(true)
    expect(firstLaunch.window.hook_settings.hooktv_system_plugins).toEqual(['hooktv_core', 'hooktv_registry'])
})

it('ignores malformed API settings and retains a safe first-launch configuration', async ()=>{
    const result = await boot({response: {
        schema: 1,
        flags: {unknown: true},
        plugins: {hooktv_core: true},
        onlineSourceOverrides: {}
    }})

    expect(result.window.hook_settings.hooktv_system_flags.online_sources).toBe(true)
    expect(result.window.hook_settings.hooktv_system_plugins).toEqual(['hooktv_core', 'hooktv_registry'])
})

import {afterEach, expect, it, vi} from 'vitest'
import {menuActionEnabled, systemFeatureEnabled} from '../src/core/system.js'

afterEach(()=>vi.unstubAllGlobals())

it('maps media menu actions to their global feature switches', ()=>{
    vi.stubGlobal('window', {lampa_settings: {hooktv_system_flags: {
        movies: false,
        series: false,
        live_tv: false,
        music: false,
        games: false,
        videos: false
    }}})

    expect(menuActionEnabled('movie')).toBe(false)
    expect(menuActionEnabled('cartoon')).toBe(false)
    expect(menuActionEnabled('tv')).toBe(false)
    expect(menuActionEnabled('ua_tv')).toBe(false)
    expect(menuActionEnabled('music')).toBe(false)
    expect(menuActionEnabled('games')).toBe(false)
    expect(menuActionEnabled('video')).toBe(false)
    expect(menuActionEnabled('main')).toBe(true)
})

it('keeps features enabled when no system override exists', ()=>{
    vi.stubGlobal('window', {lampa_settings: {}})

    expect(systemFeatureEnabled('movies')).toBe(true)
    expect(menuActionEnabled('movie')).toBe(true)
})

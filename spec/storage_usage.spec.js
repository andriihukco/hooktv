import {describe, it, expect} from 'vitest'
import Usage from '../src/utils/storage_usage'

describe('Usage.local', () => {
    it('sorts local storage into history, search and settings, in UTF-16 bytes', () => {
        let out = Usage.local([
            ['favorite', '{"history":[1,2]}'],
            ['file_view_123', '{"time":40}'],
            ['search_history', '["dune"]'],
            ['language', 'uk']
        ])

        expect(out.history).toBe(('favorite{"history":[1,2]}'.length + 'file_view_123{"time":40}'.length) * 2)
        expect(out.search).toBe('search_history["dune"]'.length * 2)
        expect(out.settings).toBe('languageuk'.length * 2)
    })
})

describe('Usage.parts', () => {
    it('lists the parts biggest first with their share, and skips empty ones', () => {
        let parts = Usage.parts({history: 100, search: 0, settings: 300, cache: 600})

        expect(parts.map(p=>p.key)).toEqual(['cache', 'settings', 'history'])
        expect(parts[0].share).toBeCloseTo(0.6)
    })

    it('has no parts when the device reports nothing', () => {
        expect(Usage.parts({history: 0, search: 0, settings: 0, cache: null})).toEqual([])
    })
})

import {beforeEach, describe, expect, it, vi} from 'vitest'

const stored = {}

vi.mock('../src/core/storage/storage', () => ({
    default: {
        get: (name, empty) => (name in stored ? stored[name] : empty)
    }
}))

import {CATEGORIES, enabledCategories, storageKey} from '../src/videos/categories'

describe('videos categories', () => {
    beforeEach(() => {
        for (const key of Object.keys(stored)) delete stored[key]
    })

    it('shows every category until the user switches it off', () => {
        expect(enabledCategories().map(item => item.id)).toEqual(CATEGORIES.map(item => item.id))
    })

    it('hides a category that was switched off, whether saved as text or boolean', () => {
        stored[storageKey('gaming')] = 'false'
        stored[storageKey('news')] = false

        const ids = enabledCategories().map(item => item.id)

        expect(ids).not.toContain('gaming')
        expect(ids).not.toContain('news')
        expect(ids).toContain('sports')
    })

    it('gives every category a search query for its shelf', () => {
        CATEGORIES.forEach(item => expect(item.query.length).toBeGreaterThan(0))
        expect(CATEGORIES.find(item => item.id == 'gaming').query).toBe('gaming')
    })
})

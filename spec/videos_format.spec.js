import {describe, expect, it} from 'vitest'

import {views} from '../src/videos/format'

describe('videos view counts', () => {
    it('shows small counts as they are', () => {
        expect(views(0)).toBe('')
        expect(views(999)).toBe('999')
    })

    it('shortens thousands, millions and billions', () => {
        expect(views(1234)).toBe('1.2K')
        expect(views(1000)).toBe('1K')
        expect(views(3400000)).toBe('3.4M')
        expect(views(2000000000)).toBe('2B')
    })
})

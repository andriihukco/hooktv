import { describe, it, expect } from 'vitest'
import { seekTime } from '../src/music/seek.js'

describe('seekTime', () => {
    it('moves forward and back by the step', () => {
        expect(seekTime(30, 10, 200)).toBe(40)
        expect(seekTime(30, -10, 200)).toBe(20)
    })

    it('never goes below the start', () => {
        expect(seekTime(4, -10, 200)).toBe(0)
        expect(seekTime(0, -10, 200)).toBe(0)
    })

    it('never goes past the end of the track', () => {
        expect(seekTime(195, 10, 200)).toBe(200)
    })

    it('moves freely when the duration is unknown', () => {
        expect(seekTime(30, 10, NaN)).toBe(40)
        expect(seekTime(30, 10, 0)).toBe(40)
    })

    it('treats a bad current time as zero', () => {
        expect(seekTime(NaN, 10, 200)).toBe(10)
    })
})

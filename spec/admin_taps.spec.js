import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import createTapCounter from '../src/interaction/settings/tap_counter.js'

describe('admin tap counter on the build row', ()=>{
    beforeEach(()=>{ vi.useFakeTimers() })
    afterEach(()=>{ vi.useRealTimers() })

    it('completes on the fifth press within three seconds', ()=>{
        const press = createTapCounter({taps: 5, windowMs: 3000})
        const results = [0, 1, 2, 3, 4].map(()=>{ const r = press(); vi.advanceTimersByTime(200); return r })

        expect(results.slice(0, 4).every(r => r === false)).toBe(true)
        expect(results[4]).toBe(true)
    })

    it('starts over when the presses are too slow', ()=>{
        const press = createTapCounter({taps: 5, windowMs: 3000})

        for(let i = 0; i < 4; i++){ press(); vi.advanceTimersByTime(1000) }
        vi.advanceTimersByTime(5000)

        expect(press()).toBe(false)
    })

    it('resets after a completed run', ()=>{
        const press = createTapCounter({taps: 5, windowMs: 3000})

        for(let i = 0; i < 5; i++) press()

        expect(press()).toBe(false)
    })
})

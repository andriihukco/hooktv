import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import createTapCounter from '../src/interaction/head/logo_taps.js'

describe('head logo taps', ()=>{
    beforeEach(()=>{ vi.useFakeTimers() })
    afterEach(()=>{ vi.useRealTimers() })

    it('opens the admin prompt on the fifth press within three seconds', ()=>{
        const press = createTapCounter({taps: 5, windowMs: 3000})
        const results = [0, 1, 2, 3, 4].map(()=>{ const r = press(); vi.advanceTimersByTime(200); return r })

        expect(results.slice(0, 4).every(r => !r.admin)).toBe(true)
        expect(results[4].admin).toBe(true)
    })

    it('only the first press of a run goes home', ()=>{
        const press = createTapCounter({taps: 5, windowMs: 3000})

        expect(press().home).toBe(true)
        expect(press().home).toBe(false)
        expect(press().home).toBe(false)
    })

    it('starts over when the presses are too slow', ()=>{
        const press = createTapCounter({taps: 5, windowMs: 3000})

        for(let i = 0; i < 4; i++){ press(); vi.advanceTimersByTime(1000) }
        vi.advanceTimersByTime(5000)

        expect(press().admin).toBe(false)
    })
})

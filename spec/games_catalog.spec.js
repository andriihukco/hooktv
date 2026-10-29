import {describe, it, expect} from 'vitest'
import catalog from '../src/games/catalog'

describe('games catalog', ()=>{
    it('lists all 42 games once each', ()=>{
        expect(catalog.length).toBe(42)
        expect(new Set(catalog.map(g=>g.id)).size).toBe(42)
    })

    it('gives every game what the row and the player need', ()=>{
        catalog.forEach(g=>{
            expect(g.title, g.id).toBeTruthy()
            expect(g.emoji, g.id).toBeTruthy()
            expect(g.c1, g.id).toMatch(/^#/)
            expect(g.c2, g.id).toMatch(/^#/)
            expect(g.size, g.id).toHaveLength(2)
            expect(typeof g.start, g.id).toBe('function')
        })
    })
})

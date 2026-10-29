import {expect, suite, test} from 'vitest'
import games, {cardData, hydrate, byId} from '../src/games/catalog.js'
import {ids, glyph, iconHTML} from '../src/games/icons.js'

suite('games', ()=>{
    test('every game has an icon and a stable negative card id', ()=>{
        let seen = new Set()

        games.forEach(g=>{
            expect(glyph(g.id), g.id).not.toBe('')
            expect(g.card_id).toBeLessThan(0)
            expect(seen.has(g.card_id), g.id).toBe(false)
            seen.add(g.card_id)
        })

        expect(ids.length).toBe(games.length)
    })

    test('a stored bookmark gets everything back from the catalogue', ()=>{
        let stored = {id: byId('chess').card_id, game: 'chess', title: 'Chess'}
        let data = hydrate(stored)

        expect(data.params.style.name).toBe('game')
        expect(data.overview).toBe(byId('chess').hint)
        expect(data.kind).toBe('board')
        expect(hydrate({id: 5, title: 'Not a game'}).params).toBeUndefined()
    })

    test('icons are plain markup: a white glyph on a monochrome tile', ()=>{
        expect(iconHTML('snake')).toContain('<span class="game-icon"><svg viewBox="0 0 100 100"')
        expect(iconHTML('snake')).toContain('fill="#fff"')
        expect(iconHTML('snake')).not.toContain('--ga:')
        expect(cardData(byId('2048')).game).toBe('2048')
    })
})

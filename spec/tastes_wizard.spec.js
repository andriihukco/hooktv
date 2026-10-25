import {expect, test} from 'vitest'
import W from '../src/interaction/tastes/wizard_state.js'

test('step order', () => {
    expect(W.next({step: 'pick'}).step).toBe('swipe')
    expect(W.next({step: 'summary'}).step).toBe('summary')
    expect(W.prev({step: 'swipe'}).step).toBe('pick')
})

test('deckFor drops rated cards and caps at 20', () => {
    const popular = Array.from({length: 30}, (_, i) => ({id: i, media: 'movie'}))
    const deck = W.deckFor(popular, {'movie:0': {verdict: 'like'}})
    expect(deck.length).toBe(20)
    expect(deck.find(c => c.id === 0)).toBeUndefined()
})

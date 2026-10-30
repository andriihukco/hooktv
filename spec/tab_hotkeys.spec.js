import {expect, suite, test} from 'vitest'
import Hotkeys from '../src/utils/tab_hotkeys.js'

suite('tab hotkeys', () => {
    test('keys 1 to 6 open home, movies, series, tv, games and music', () => {
        expect([49, 50, 51, 52, 53, 54].map(Hotkeys.actionForKey)).toEqual(['main', 'movie', 'tv', 'ua_tv', 'games', 'music'])
    })

    test('the numpad keys work the same', () => {
        expect([97, 98, 99, 100, 101, 102].map(Hotkeys.actionForKey)).toEqual(['main', 'movie', 'tv', 'ua_tv', 'games', 'music'])
    })

    test('0 opens the filters, on the top row and the numpad', () => {
        expect(Hotkeys.actionForKey(48)).toBe('filters')
        expect(Hotkeys.actionForKey(96)).toBe('filters')
    })

    test('other keys do nothing', () => {
        expect(Hotkeys.actionForKey(55)).toBe('')
        expect(Hotkeys.actionForKey(95)).toBe('')
        expect(Hotkeys.actionForKey(13)).toBe('')
    })
})

import {expect, suite, test} from 'vitest'
import Hotkeys from '../src/utils/tab_hotkeys.js'

suite('tab hotkeys', () => {
    test('keys 1 to 4 open home, movies, series and tv', () => {
        expect([49, 50, 51, 52].map(Hotkeys.actionForKey)).toEqual(['main', 'movie', 'tv', 'ua_tv'])
    })

    test('the numpad keys work the same', () => {
        expect([97, 98, 99, 100].map(Hotkeys.actionForKey)).toEqual(['main', 'movie', 'tv', 'ua_tv'])
    })

    test('0 opens the filters, on the top row and the numpad', () => {
        expect(Hotkeys.actionForKey(48)).toBe('filters')
        expect(Hotkeys.actionForKey(96)).toBe('filters')
    })

    test('other keys do nothing', () => {
        expect(Hotkeys.actionForKey(53)).toBe('')
        expect(Hotkeys.actionForKey(54)).toBe('')
        expect(Hotkeys.actionForKey(55)).toBe('')
        expect(Hotkeys.actionForKey(95)).toBe('')
        expect(Hotkeys.actionForKey(13)).toBe('')
    })
})

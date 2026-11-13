import {expect, suite, test} from 'vitest'
import Hotkeys from '../src/utils/tab_hotkeys.js'

suite('tab hotkeys', () => {
    test('keys 1 to 5 open home, movies, series, tv and video', () => {
        expect([49, 50, 51, 52, 53].map(Hotkeys.actionForKey)).toEqual(['main', 'movie', 'tv', 'ua_tv', 'video'])
    })

    test('the numpad keys work the same', () => {
        expect([97, 98, 99, 100, 101].map(Hotkeys.actionForKey)).toEqual(['main', 'movie', 'tv', 'ua_tv', 'video'])
    })

    test('keys 6 and 7 are no longer hotkeys (Games and Music were removed)', () => {
        expect(Hotkeys.actionForKey(54)).toBe('')
        expect(Hotkeys.actionForKey(55)).toBe('')
    })

    test('0 opens the filters, on the top row and the numpad', () => {
        expect(Hotkeys.actionForKey(48)).toBe('filters')
        expect(Hotkeys.actionForKey(96)).toBe('filters')
    })

    test('other keys do nothing', () => {
        expect(Hotkeys.actionForKey(56)).toBe('')
        expect(Hotkeys.actionForKey(95)).toBe('')
        expect(Hotkeys.actionForKey(13)).toBe('')
    })
})

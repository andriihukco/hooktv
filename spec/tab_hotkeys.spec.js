import {expect, suite, test} from 'vitest'
import Hotkeys from '../src/utils/tab_hotkeys.js'

suite('tab hotkeys', () => {
    test('keys 1 to 5 pick the five filter tabs in menu order', () => {
        expect([49, 50, 51, 52, 53].map(Hotkeys.tabForKey)).toEqual(['main', 'movie', 'tv', 'favorite', 'history'])
    })

    test('the numpad keys work the same', () => {
        expect([97, 98, 99, 100, 101].map(Hotkeys.tabForKey)).toEqual(['main', 'movie', 'tv', 'favorite', 'history'])
    })

    test('other keys pick no tab', () => {
        expect(Hotkeys.tabForKey(48)).toBe('')
        expect(Hotkeys.tabForKey(54)).toBe('')
        expect(Hotkeys.tabForKey(96)).toBe('')
        expect(Hotkeys.tabForKey(13)).toBe('')
    })

    test('each tab shows its number', () => {
        expect(Hotkeys.keyOf('main')).toBe('1')
        expect(Hotkeys.keyOf('history')).toBe('5')
        expect(Hotkeys.keyOf('ua_tv')).toBe('')
    })
})

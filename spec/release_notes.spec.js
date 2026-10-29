import {describe, it, expect} from 'vitest'
import {missed} from '../src/utils/releases'
import releases from '../scripts/releases.js'

let list = [{id: 'c'}, {id: 'b'}, {id: 'a'}, {id: 'z'}]

describe('missed', () => {
    it('is empty when the device is on the newest release', () => {
        expect(missed(list, 'c')).toEqual([])
    })

    it('is empty when there are no releases', () => {
        expect(missed([], 'c')).toEqual([])
    })

    it('shows every release since the last seen one, newest first', () => {
        expect(missed(list, 'a')).toEqual([{id: 'c'}, {id: 'b'}])
        expect(missed(list, 'b')).toEqual([{id: 'c'}])
    })

    it('shows the latest releases when the last seen one is no longer listed', () => {
        expect(missed(list, 'gone', 2)).toEqual([{id: 'c'}, {id: 'b'}])
    })
})

describe('parse', () => {
    it('splits "Area: title" and capitalises the title', () => {
        expect(releases.parse('Watch: torrent fallback when no online source plays')).toEqual({
            area: 'Watch',
            title: 'Torrent fallback when no online source plays'
        })
    })

    it('keeps a subject without an area as the title', () => {
        expect(releases.parse('fix the thing')).toEqual({area: '', title: 'Fix the thing'})
    })

    it('does not treat a long prefix as an area', () => {
        let subject = 'Settings and the account and the devices list: rows now sync'

        expect(releases.parse(subject).area).toBe('')
    })
})

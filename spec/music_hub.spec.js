import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import {artistQuery, excludedCountries, phrase} from '../src/music/api/musicbrainz'
import {findMix, mixGroups} from '../src/music/hub'

const en = readFileSync(new URL('../src/lang/en.js', import.meta.url), 'utf8')

describe('music hub discovery', () => {
    it('keeps Russian and Indian artists out of every artist query', () => {
        expect(excludedCountries).toEqual(['RU', 'IN'])
        expect(artistQuery({tag: 'happy'})).toBe('tag:"happy" AND NOT country:RU AND NOT country:IN')
        expect(artistQuery({name: 'Miles', tag: 'jazz'})).toContain('NOT country:RU')
    })

    it('returns no query when there is nothing to search for', () => {
        expect(artistQuery({})).toBe('')
    })

    it('escapes quotes and backslashes in user text', () => {
        expect(phrase('Miles "Davis" \\ x')).toBe('"Miles \\"Davis\\" \\\\ x"')
    })

    it('resolves every mix to a group and a tag', () => {
        Object.keys(mixGroups).forEach(group => {
            mixGroups[group].forEach(mix => {
                expect(mix.tag).toBeTruthy()
                expect(findMix(mix.id)).toMatchObject({id: mix.id, group, tag: mix.tag})
            })
        })
    })

    it('has an English label for every mix and group chip', () => {
        Object.keys(mixGroups).forEach(group => {
            expect(en).toContain(`music_group_${group}:`)
            mixGroups[group].forEach(mix => expect(en).toContain(`music_mix_${mix.id}:`))
        })
    })
})

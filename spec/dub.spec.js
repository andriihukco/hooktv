import { describe, it, expect } from 'vitest'
import Dub from '../src/utils/dub.js'

describe('Dub.classify', () => {
    it('tells languages apart', () => {
        expect(Dub.classify('Український дубляж')).toBe('uk')
        expect(Dub.classify('UKR')).toBe('uk')
        expect(Dub.classify('Оригінал')).toBe('original')
        expect(Dub.classify('ENG')).toBe('original')
        expect(Dub.classify('Дубляж (RU)')).toBe('ru')
        expect(Dub.classify('Russian')).toBe('ru')
        expect(Dub.classify('LostFilm')).toBe('unknown')
        expect(Dub.classify('багатоголосий закадровий | ICTV', 'makhno')).toBe('uk')
    })
})

describe('Dub.pickVoices', () => {
    it('never offers Russian and prefers a dub', () => {
        let voices = [{name: 'Russian'}, {name: 'багатоголосий | ICTV'}, {name: 'Дубляж'}]
        let picked = Dub.pickVoices(voices, 'uk', 'makhno')

        expect(picked.map(v=>v.index)).toEqual([2, 1])
    })

    it('drops unknown voices of mixed sources', () => {
        expect(Dub.pickVoices([{name: 'LostFilm'}], 'uk', 'filmix')).toEqual([])
    })

    it('for original prefers an original voice, then multi-track Ukrainian', () => {
        let voices = [{name: 'Дубляж', hint: 'film.ukr'}, {name: 'ICTV', hint: 'film.2xukr.eng'}, {name: 'Original'}]

        expect(Dub.pickVoices(voices, 'original', 'makhno').map(v=>v.index)).toEqual([2, 1, 0])
    })
})

describe('Dub.pickTrack', () => {
    it('finds the wanted track', () => {
        let tracks = [{name: 'Ukr'}, {name: 'Rus'}, {language: 'eng'}]

        expect(Dub.pickTrack(tracks, 'original')).toBe(2)
        expect(Dub.pickTrack(tracks, 'uk')).toBe(0)
        expect(Dub.pickTrack([{name: 'Ukr'}], 'original')).toBe(-1)
    })
})

describe('Dub.pickSimilar', () => {
    let movie = {title: 'Початок', original_title: 'Inception', release_date: '2010-07-15'}

    it('picks the title of the right year', () => {
        let list = [
            {title: 'Голем: Початок / The Golem', year: null},
            {title: 'Початок / Inception', year: 2010}
        ]

        expect(Dub.pickSimilar(list, movie)).toBe(list[1])
    })

    it('returns null when nothing matches', () => {
        expect(Dub.pickSimilar([{title: 'Something else', year: 1999}], movie)).toBe(null)
    })
})

import { describe, it, expect } from 'vitest'
import Audio from '../src/utils/audio_order.js'

const item = (Title, voices = [], extra = {}) => ({Title, info: {voices}, ...extra})

describe('Audio.order', () => {
    it('drops a result whose voice is Russian', () => {
        const list = [item('Film 2020 1080p', ['Дубляж (RU)']), item('Film 2020 1080p ENG')]
        expect(Audio.order(list).map(i => i.Title)).toEqual(['Film 2020 1080p ENG'])
    })

    it('drops a result tagged RUS or рус in its title', () => {
        const list = [item('Film 2020 1080p RUS BDRip'), item('Film 2020 рус дубляж'), item('Film 2020 1080p UKR')]
        expect(Audio.order(list).map(i => i.Title)).toEqual(['Film 2020 1080p UKR'])
    })

    it('keeps a title that only mentions Russian as a word in its name', () => {
        const list = [item('Russian Doll 2019 1080p')]
        expect(Audio.order(list)).toHaveLength(1)
    })

    it('lists English before Ukrainian before unknown', () => {
        const list = [
            item('Film 1080p LostFilm'),
            item('Film 1080p UKR'),
            item('Film 1080p ENG'),
            item('Film 1080p UKR ENG multi'),
        ]
        expect(Audio.order(list).map(i => i.Title)).toEqual([
            'Film 1080p ENG',
            'Film 1080p UKR ENG multi',
            'Film 1080p UKR',
            'Film 1080p LostFilm',
        ])
    })

    it('keeps the viewer order inside each group', () => {
        const list = [item('B ENG'), item('A ENG'), item('C ENG')]
        expect(Audio.order(list).map(i => i.Title)).toEqual(['B ENG', 'A ENG', 'C ENG'])
    })

    it('reads the en language code as English', () => {
        expect(Audio.audioGroup(item('Film', ['en']))).toBe(0)
    })
})

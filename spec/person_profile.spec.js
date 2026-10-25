import {describe, it, expect} from 'vitest'
import Profile from '../src/utils/person_profile'

let t = (k)=>({menu_movies: 'Movies', menu_tv: 'Series'})[k] || k
let today = Date.parse('2026-10-25')

describe('Profile.age', () => {
    it('counts full years, and stops at the death date', () => {
        expect(Profile.age('1974-11-11', null, new Date('2026-10-25'))).toBe(51)
        expect(Profile.age('1974-11-11', null, new Date('2026-11-11'))).toBe(52)
        expect(Profile.age('1926-06-01', '1962-08-04')).toBe(36)
        expect(Profile.age('', null)).toBe(null)
    })

    it('says it in Ukrainian with the right form', () => {
        expect(Profile.ageText(51, 'uk')).toBe('51 рік')
        expect(Profile.ageText(52, 'uk')).toBe('52 роки')
        expect(Profile.ageText(11, 'uk')).toBe('11 років')
        expect(Profile.ageText(51, 'en')).toBe('51 years')
    })
})

describe('Profile.role', () => {
    it('uses the feminine word where the language has one', () => {
        let uk = (k)=>({hooktv_person_role_acting: 'Актор', hooktv_person_role_acting_f: 'Акторка'})[k] || k

        expect(Profile.role({known_for_department: 'Acting', gender: 1}, uk)).toBe('Акторка')
        expect(Profile.role({known_for_department: 'Acting', gender: 2}, uk)).toBe('Актор')
        expect(Profile.role({known_for_department: 'Directing', gender: 1}, uk)).toBe('hooktv_person_role_directing')
    })
})

describe('Profile.rows', () => {
    let credits = {
        cast: [
            {id: 1, media_type: 'movie', title: 'Inception', release_date: '2010-07-15', vote_count: 38000, character: 'Cobb'},
            {id: 2, media_type: 'movie', title: 'Titanic', release_date: '1997-12-18', vote_count: 26000, character: 'Jack'},
            {id: 3, media_type: 'movie', title: 'Revenant', release_date: '2015-12-25', vote_count: 20000, character: 'Hugh'},
            {id: 4, media_type: 'tv', name: 'Late Show', first_air_date: '2015-09-08', vote_count: 500, character: 'Self', genre_ids: [10767]},
            {id: 5, media_type: 'movie', title: 'Next One', release_date: '2027-03-01', vote_count: 0, character: 'Lead'},
            {id: 6, media_type: 'movie', title: 'Idea', vote_count: 0, character: 'Someone'}
        ],
        crew: [
            {id: 3, media_type: 'movie', title: 'Revenant', release_date: '2015-12-25', vote_count: 20000, department: 'Production', job: 'Producer'},
            {id: 3, media_type: 'movie', title: 'Revenant', release_date: '2015-12-25', vote_count: 20000, department: 'Production', job: 'Executive Producer'},
            {id: 7, media_type: 'movie', title: 'In development', vote_count: 0, department: 'Production', job: 'Producer'}
        ]
    }
    let rows = Profile.rows(credits, {known_for_department: 'Acting'}, t, today)
    let row = (key)=>rows.find(r=>r.key == key)

    it('opens with what they are known for, most watched first', () => {
        expect(rows[0].key).toBe('known')
        expect(row('known').results.map(c=>c.id)).toEqual([1, 2, 3])
    })

    it('keeps roles, appearances as themselves and upcoming work apart', () => {
        expect(row('movies').results.map(c=>c.id)).toEqual([3, 1, 2])
        expect(row('series')).toBeUndefined()
        expect(row('self').results.map(c=>c.id)).toEqual([4])
        expect(row('soon').results.map(c=>c.id)).toEqual([5])
    })

    it('lists a title once per row whatever the jobs, and counts it in the title', () => {
        expect(row('production').results.map(c=>c.id)).toEqual([3])
        expect(row('production').title).toBe('hooktv_person_production (1)')
    })
})

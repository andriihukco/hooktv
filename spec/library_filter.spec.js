import {expect, suite, test} from 'vitest'
import Filter from '../src/utils/library_filter.js'

const cards = [
    {id: 1, title: 'A', vote_average: 8.1, release_date: '2010-05-01', genre_ids: [28, 12], origin_country: ['US']},
    {id: 2, name: 'B', vote_average: 6.4, first_air_date: '2021-01-01', genre_ids: [18], origin_country: ['UA']},
    {id: 3, title: 'C', vote_average: 0, release_date: '1999-01-01', genres: [{id: 35}], production_countries: [{iso_3166_1: 'FR'}]},
    {id: 4, title: 'D', vote_average: 7, genre_ids: [28]}
]

const ids = (list)=>list.map(c=>c.id)

suite('library filter', () => {
    test('an empty filter keeps everything', () => {
        expect(Filter.count(Filter.empty())).toBe(0)
        expect(ids(Filter.apply(cards, Filter.empty()))).toEqual([1, 2, 3, 4])
    })

    test('rating range is inclusive and drops unrated cards', () => {
        let f = {...Filter.empty(), rating: [6.4, 8]}

        expect(ids(Filter.apply(cards, f))).toEqual([2, 4])
    })

    test('year range uses release or first air date', () => {
        expect(ids(Filter.apply(cards, {...Filter.empty(), year: [2000, null]}))).toEqual([1, 2])
        expect(ids(Filter.apply(cards, {...Filter.empty(), year: [null, 2000]}))).toEqual([3])
    })

    test('genres and countries match any of the picked values', () => {
        expect(ids(Filter.apply(cards, {...Filter.empty(), genres: [35, 18]}))).toEqual([2, 3])
        expect(ids(Filter.apply(cards, {...Filter.empty(), countries: ['FR', 'US']}))).toEqual([1, 3])
    })

    test('groups combine', () => {
        let f = {rating: [7, null], year: [null, null], genres: [28], countries: ['US']}

        expect(Filter.count(f)).toBe(3)
        expect(ids(Filter.apply(cards, f))).toEqual([1])
    })

    test('list paths become discover queries', () => {
        let f = {rating: [7, null], year: [2000, 2010], genres: [28, 12], countries: ['US', 'FR']}
        let q = Filter.discover('movie/popular', f)

        expect(q.indexOf('discover/movie?')).toBe(0)
        expect(q).toContain('sort_by=popularity.desc')
        expect(q).toContain('vote_average.gte=7')
        expect(q).toContain('vote_count.gte=50')
        expect(q).toContain('primary_release_date.gte=2000-01-01')
        expect(q).toContain('primary_release_date.lte=2010-12-31')
        expect(q).toContain('with_genres=28|12')
        expect(q).toContain('with_origin_country=US|FR')
    })

    test('series use first air date and keep discover params', () => {
        let q = Filter.discover('discover/tv?with_genres=16&sort_by=vote_count.desc', {...Filter.empty(), year: [null, 1999], genres: [18]})

        expect(q.indexOf('discover/tv?')).toBe(0)
        expect(q).toContain('sort_by=vote_count.desc')
        expect(q).toContain('first_air_date.lte=1999-12-31')
        expect(q).toContain('with_genres=18')
        expect(q).not.toContain('with_genres=16')
    })

    test('options list what the cards contain, most common first', () => {
        let o = Filter.options(cards)

        expect(o.genres[0]).toBe(28)
        expect(o.countries.sort()).toEqual(['FR', 'UA', 'US'])
        expect(o.years).toEqual([1999, 2021])
    })
})

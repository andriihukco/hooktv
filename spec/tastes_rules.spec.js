import {expect, test} from 'vitest'
import R from '../src/core/tastes_rules.js'

const empty = R.defaults()

test('defaults and normalize survive bad input', () => {
    expect(R.normalize(null)).toEqual(R.defaults())
    expect(R.normalize('x')).toEqual(R.defaults())
    expect(R.normalize([])).toEqual(R.defaults())
})

test('empty profile passes every card and keeps order', () => {
    const list = [{id: 1, vote_average: 2}, {id: 2}]
    expect(R.apply(empty, list)).toEqual(list)
})

test('apply on non-array returns []', () => {
    expect(R.apply(empty, undefined)).toEqual([])
})

test('dislike hides, skip does not', () => {
    const p = {...empty, verdicts: {'movie:1': {verdict: 'dislike'}, 'movie:2': {verdict: 'skip'}}}
    expect(R.match(p, {id: 1, title: 'a'})).toBe(false)
    expect(R.match(p, {id: 2, title: 'b'})).toBe(true)
})

test('min_rating hides unrated and low titles', () => {
    const p = {...empty, min_rating: 7}
    expect(R.match(p, {id: 1, vote_average: 6.9})).toBe(false)
    expect(R.match(p, {id: 2, vote_average: null})).toBe(false)
    expect(R.match(p, {id: 3, vote_average: 7})).toBe(true)
})

test('genres and countries use any-match', () => {
    const p = {...empty, genres: [28, 35]}
    expect(R.match(p, {id: 1, genres: [{id: 35}]})).toBe(true)
    expect(R.match(p, {id: 2, genres: [{id: 18}]})).toBe(false)
})

test('score ranks likes and matches higher, never hides', () => {
    const p = {...empty, genres: [28], verdicts: {'movie:1': {verdict: 'like'}}}
    expect(R.score(p, {id: 1, genres: [{id: 28}]})).toBeGreaterThan(R.score(p, {id: 2, genres: [{id: 18}]}))
})

test('discoverParams omits unset fields', () => {
    expect(R.discoverParams(empty, 'movie')).toEqual({})
    expect(R.discoverParams({...empty, genres: [28, 35], min_rating: 7}, 'movie'))
        .toEqual({with_genres: '28|35', 'vote_average.gte': 7})
})

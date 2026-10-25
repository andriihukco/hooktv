import {expect, test, vi, beforeEach} from 'vitest'

let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({
    default: {
        get: (name, empty) => (name in saved ? saved[name] : empty),
        set: (name, value) => { saved[name] = value }
    }
}))

import Tastes from '../src/core/tastes.js'

beforeEach(() => { saved = {} })

test('get returns defaults for a corrupt stored value', () => {
    saved.tastes = 'garbage'
    expect(Tastes.get().genres).toEqual([])
})

test('verdict with null removes the entry', () => {
    Tastes.verdict({id: 5, media_type: 'movie', title: 'x'}, 'like')
    Tastes.verdict({id: 5, media_type: 'movie', title: 'x'}, null)
    expect(Tastes.get().verdicts['movie:5']).toBeUndefined()
})

test('reset clears profile and verdicts', () => {
    Tastes.set({genres: [28]})
    Tastes.reset()
    expect(Tastes.get().genres).toEqual([])
})

test('filtered passes results through apply and leaves non-list data alone', () => {
    Tastes.set({min_rating: 7})
    let out
    Tastes.filtered((d)=>{ out = d })({results: [{id: 1, vote_average: 3}, {id: 2, vote_average: 8}]})
    expect(out.results.map(r => r.id)).toEqual([2])

    let raw = {movie: {id: 1}}
    Tastes.filtered((d)=>{ out = d })(raw)
    expect(out).toBe(raw)
})

test('keep drops a search side that does not match and tolerates a missing side', () => {
    Tastes.set({min_rating: 7})
    expect(Tastes.keep(undefined)).toBeUndefined()
    expect(Tastes.keep({id: 3, vote_average: 2})).toBeUndefined()
    expect(Tastes.keep({id: 4, vote_average: 8})).toEqual({id: 4, vote_average: 8})
})

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

import {expect, test} from 'vitest'
import R from '../src/core/tastes_rules.js'

test('profile genre is not appended twice when the row already sets with_genres', () => {
    const profile = {...R.defaults(), genres: [28]}
    expect(R.queryString(R.discoverParams(profile, 'tv'), ['with_genres', 'vote_average.gte'])).toBe('')
})

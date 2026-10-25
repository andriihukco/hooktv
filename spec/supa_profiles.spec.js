import {expect, test, vi} from 'vitest'

vi.mock('../src/core/storage/storage.js', () => ({default: {get: (n, e) => e, set: () => {}}}))
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async () => [])}))
vi.mock('../src/core/supa/auth.js', () => ({default: {session: () => ({user_id: 'u1', token: 't'})}}))

import Profiles from '../src/core/supa/profiles.js'
import client from '../src/core/supa/client.js'

test('limit is 3 without premium and 8 with premium', () => {
    expect(Profiles.limit(false)).toBe(3)
    expect(Profiles.limit(true)).toBe(8)
})

test('create rejects with profile_limit when the list is full', async () => {
    client.mockResolvedValueOnce([{id: 1}, {id: 2}, {id: 3}])
    await expect(Profiles.create('Kid', false)).rejects.toMatchObject({code: 'profile_limit'})
})

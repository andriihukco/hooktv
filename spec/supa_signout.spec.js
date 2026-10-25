import {expect, test, vi, beforeEach} from 'vitest'

let saved = {}
let calls = []
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (path) => { calls.push(path); return {} })}))
vi.mock('../src/core/supa/devices.js', () => ({default: {
    deviceId: () => 'd1',
    remove: async () => { calls.push('devices.remove') }
}}))

import Signout from '../src/core/supa/signout.js'

beforeEach(() => {
    saved = {
        account: {token: 't', refresh_token: 'r', expires_at: 9999999999, user_id: 'u1', email: 'a@b.c', profile: {id: 'p1'}},
        supa_cursors: {'p1_bookmarks': '2026-01-01T00:00:00Z'},
        supa_queue: []
    }
    calls = []
})

test('sign out removes this device, ends the session and clears local state', async () => {
    await Signout.signOutThisDevice()
    expect(calls).toEqual(['devices.remove', 'auth/v1/logout'])
    expect(saved.account).toBe('')
    expect(saved.supa_cursors).toBe('')
    expect(saved.account_use).toBe(false)
})

test('sign out still completes when the device row is already gone', async () => {
    vi.mocked(await import('../src/core/supa/devices.js')).default.remove = async () => { throw {status: 404} }
    await Signout.signOutThisDevice()
    expect(saved.account).toBe('')
})

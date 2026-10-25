import {expect, test, vi, beforeEach} from 'vitest'

let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))

let next = () => ({})
let calls = []
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (path, opts) => { calls.push([path, opts]); return next(path, opts) })}))

import Auth from '../src/core/supa/auth.js'

beforeEach(() => { saved = {}; calls = []; next = () => ({}) })

test('isExpiring is true within 60 seconds of expiry', () => {
    expect(Auth.isExpiring({expires_at: Math.floor(Date.now()/1000) + 30})).toBe(true)
    expect(Auth.isExpiring({expires_at: Math.floor(Date.now()/1000) + 3600})).toBe(false)
})

test('signIn with an unconfirmed email rejects with code email_not_confirmed', async () => {
    next = () => { throw {status: 400, code: 'email_not_confirmed'} }
    await expect(Auth.signIn('a@b.c', 'pw')).rejects.toMatchObject({code: 'email_not_confirmed'})
})

test('refresh keeps the session when the network is down', async () => {
    saved.account = {token: 't', refresh_token: 'r', expires_at: 1, user_id: 'u', email: 'a@b.c'}
    next = () => { throw {status: 0, code: 'network'} }
    const s = await Auth.refresh()
    expect(s).not.toBeNull()
    expect(saved.account.token).toBe('t')
})

test('clear removes the account token', () => {
    saved.account = {token: 't'}
    Auth.clear()
    expect(Auth.session()).toBeNull()
})

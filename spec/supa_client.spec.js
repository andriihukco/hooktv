import {expect, test, vi, beforeEach} from 'vitest'
import client from '../src/core/supa/client.js'

beforeEach(() => {
    globalThis.window = {lampa_settings: {supabase_url: 'https://x.supabase.co', supabase_anon_key: 'anon'}}
})

test('builds URL with query and sends apikey and bearer token', async () => {
    const fetch = vi.fn(async () => ({ok: true, status: 200, json: async () => ([])}))
    globalThis.fetch = fetch
    await client('bookmarks', {query: {profile_id: 'eq.p1'}, token: 't1'})
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://x.supabase.co/rest/v1/bookmarks?profile_id=eq.p1')
    expect(init.headers.apikey).toBe('anon')
    expect(init.headers.Authorization).toBe('Bearer t1')
})

test('maps a device_limit error to code device_limit', async () => {
    globalThis.fetch = vi.fn(async () => ({ok: false, status: 400, json: async () => ({message: 'device_limit'})}))
    await expect(client('devices', {method: 'POST', body: {}})).rejects.toMatchObject({code: 'device_limit', status: 400})
})

test('falls back to http_<status> when the body has no code', async () => {
    globalThis.fetch = vi.fn(async () => ({ok: false, status: 503, json: async () => ({})}))
    await expect(client('x')).rejects.toMatchObject({code: 'http_503'})
})

test('a failed fetch rejects with status 0 and code network', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('offline') })
    await expect(client('x')).rejects.toMatchObject({status: 0, code: 'network'})
})

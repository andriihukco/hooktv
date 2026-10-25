import {expect, test, vi, beforeEach} from 'vitest'

let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async () => [])}))
vi.mock('../src/core/supa/auth.js', () => ({default: {session: () => ({user_id: 'u1', token: 't'})}}))
vi.mock('../src/interaction/noty.js', () => ({default: {show: () => {}}}))
vi.mock('../src/core/lang.js', () => ({default: {translate: k => k}}))

import Sync from '../src/core/supa/sync.js'
import client from '../src/core/supa/client.js'

beforeEach(() => { saved = {} })

test('newer remote wins', () => {
    const r = Sync.mergeRow({updated_at: 1, x: 'old'}, {updated_at: 2, x: 'new'})
    expect(r.x).toBe('new')
})

test('removal on one device beats an offline edit with an older timestamp', () => {
    const r = Sync.mergeRow({updated_at: 5, x: 'edit'}, {updated_at: 7, deleted: true})
    expect(r.deleted).toBe(true)
})

test('watch_history tie keeps the larger time', () => {
    const r = Sync.mergeRow({updated_at: 3, time: 100}, {updated_at: 3, time: 250})
    expect(r.time).toBe(250)
})

test('queue drops an item after 10 failed server attempts', async () => {
    client.mockRejectedValue({status: 500, code: 'http_500'})
    Sync.enqueue('bookmarks', {type: 'upsert', row: {card_id: '1'}, tries: 9})
    await Sync.flush()
    expect(saved.supa_queue).toHaveLength(0)
})

test('queue keeps items while offline', async () => {
    client.mockRejectedValue({status: 0, code: 'network'})
    Sync.enqueue('bookmarks', {type: 'upsert', row: {card_id: '2'}, tries: 9})
    await Sync.flush()
    expect(saved.supa_queue).toHaveLength(1)
})

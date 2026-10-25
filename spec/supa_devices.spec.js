import {expect, test, vi, beforeEach} from 'vitest'

let saved = {}
vi.mock('../src/core/storage/storage.js', () => ({default: {
    get: (n, e) => (n in saved ? saved[n] : e),
    set: (n, v) => { saved[n] = v }
}}))

let next = () => ({})
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (path, opts) => next(path, opts))}))
vi.mock('../src/core/platform.js', () => ({default: {tv: () => false}}))
vi.mock('../src/core/supa/auth.js', () => ({default: {session: () => ({user_id: 'u1', token: 't'})}}))

import Devices from '../src/core/supa/devices.js'

beforeEach(() => { saved = {}; next = () => ({}) })

test('deviceId is created once and reused', () => {
    const a = Devices.deviceId()
    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(Devices.deviceId()).toBe(a)
})

test('register on an existing device does not raise device_limit', async () => {
    next = () => ([{device_id: 'd1'}])
    await expect(Devices.register()).resolves.toBeUndefined()
})

test('register surfaces device_limit from the trigger', async () => {
    next = () => { throw {status: 400, code: 'device_limit'} }
    await expect(Devices.register()).rejects.toMatchObject({code: 'device_limit'})
})

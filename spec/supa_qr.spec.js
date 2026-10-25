import {expect, test, vi} from 'vitest'

let next = async () => []
vi.mock('../src/core/supa/client.js', () => ({default: vi.fn(async (path, opts) => next(path, opts))}))

import QR from '../src/core/supa/qr.js'

test('poll stops and reports expiry after 5 minutes', () => {
    vi.useFakeTimers()
    next = async () => []
    let expired = false
    const p = QR.poll({id: 't1', secret: 's', expires_at: Date.now() + 5 * 60 * 1000}, ()=>{}, ()=>{ expired = true })
    vi.advanceTimersByTime(5 * 60 * 1000 + 2000)
    expect(expired).toBe(true)
    p.stop()
    vi.useRealTimers()
})

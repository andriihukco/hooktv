import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'

describe('TorrCluster plugin', () => {
    let storage = {}
    let noty = []
    let torrentStart = vi.fn()
    let origWindow = global.window
    let origDoc = global.document
    let origFetch = global.fetch

    beforeEach(() => {
        storage = {}
        noty = []
        torrentStart = vi.fn()

        global.window = {
            Lampa: {
                Storage: {
                    get: (key) => storage[key] || '',
                    set: (key, val) => { storage[key] = val }
                },
                Noty: {
                    show: (msg) => { noty.push(msg) }
                },
                Torrent: {
                    start: torrentStart
                }
            }
        }
        global.document = {
            addEventListener: vi.fn()
        }

        // Load plugin
        vi.resetModules()
    })

    afterEach(() => {
        global.window = origWindow
        global.document = origDoc
        global.fetch = origFetch
    })

    it('registers window.TorrCluster and binds Lampa.Torrserver.stream shim', async () => {
        await import('../plugins/torr_cluster.js')

        expect(global.window.TorrCluster).toBeDefined()
        expect(Array.isArray(global.window.TorrCluster.nodes)).toBe(true)
        expect(typeof global.window.TorrCluster.findNode).toBe('function')
        expect(typeof global.window.TorrCluster.stream).toBe('function')
        expect(global.window.Lampa.Torrserver.stream).toBe(global.window.TorrCluster.stream)
    })

    it('finds the fastest alive node via Promise.any', async () => {
        await import('../plugins/torr_cluster.js')

        global.fetch = vi.fn(async (url) => {
            if (url.includes('fast-node')) {
                return { ok: true, status: 200 }
            }
            throw new Error('network down')
        })

        const winner = await global.window.TorrCluster.findNode(['http://dead-node:8090', 'http://fast-node:8090'])
        expect(winner).toBe('http://fast-node:8090')
    })

    it('updates Lampa.Storage and invokes Lampa.Torrent.start on stream', async () => {
        await import('../plugins/torr_cluster.js')

        global.fetch = vi.fn(async (url) => {
            if (url.includes('winner.node')) {
                return { ok: true, status: 200 }
            }
            throw new Error('fail')
        })

        const movie = { id: 100, title: 'Inception' }
        const magnet = 'magnet:?xt=urn:btih:abc123'

        // Override nodes for test
        global.window.TorrCluster.nodes = ['http://winner.node:8090']

        await global.window.TorrCluster.stream(magnet, movie)

        expect(storage['torrserver_url']).toBe('http://winner.node:8090')
        expect(storage['torrserver_use_link']).toBe('one')
        expect(torrentStart).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Inception',
                MagnetUri: magnet
            }),
            movie
        )
    })
})

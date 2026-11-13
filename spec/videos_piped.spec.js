import {describe, expect, it} from 'vitest'

import {channelId, formatDuration, normalize, normalizeList, pipedGet, videoId} from '../supabase/functions/youtube-proxy/piped.ts'

describe('piped parser', () => {
    it('formats seconds as m:ss or h:mm:ss', () => {
        expect(formatDuration(185)).toBe('3:05')
        expect(formatDuration(3725)).toBe('1:02:05')
        expect(formatDuration(0)).toBe('')
    })

    it('reads the video id and channel id from Piped urls', () => {
        expect(videoId('/watch?v=sF80I-TQiW0')).toBe('sF80I-TQiW0')
        expect(videoId('/channel/UCuS_-bvOCh4W5Sy11Uf4H5A')).toBe('')
        expect(channelId('/channel/UCuS_-bvOCh4W5Sy11Uf4H5A')).toBe('UCuS_-bvOCh4W5Sy11Uf4H5A')
    })

    it('maps a stream item to the app shape', () => {
        const video = normalize({
            url: '/watch?v=abc123XYZ',
            type: 'stream',
            title: 'Title',
            thumbnail: 'https://img/x.jpg',
            uploaderName: 'Channel',
            uploaderUrl: '/channel/UC1234567890',
            duration: 3725,
            views: 1500,
            uploaded: 1730505600000
        })

        expect(video).toMatchObject({id: 'abc123XYZ', title: 'Title', channel: 'Channel', channel_id: 'UC1234567890', duration: '1:02:05', views: 1500})
        expect(video.published).toBe('2024-11-02T00:00:00.000Z')
    })

    it('leaves the date empty when Piped has none (live and trending items)', () => {
        expect(normalize({url: '/watch?v=abc123XYZ', type: 'stream', uploaded: -1}).published).toBe('')
    })

    it('skips channels, playlists and shorts', () => {
        expect(normalize({url: '/channel/UC1', type: 'channel'})).toBeNull()
        expect(normalize({url: '/watch?v=abc123XYZ', type: 'stream', isShort: true})).toBeNull()
    })

    it('reads both the trending array and the search object', () => {
        const item = {url: '/watch?v=abc123XYZ', type: 'stream', title: 'A', duration: 60, views: 1}

        expect(normalizeList([item]).map(v => v.id)).toEqual(['abc123XYZ'])
        expect(normalizeList({items: [item]}).map(v => v.id)).toEqual(['abc123XYZ'])
    })

    it('moves on to the next instance when one fails', async () => {
        const calls = []
        const fetcher = async url => {
            calls.push(url)
            if (url.startsWith('https://bad')) return {ok: false, status: 502}
            return {ok: true, json: async () => [{url: '/watch?v=abc123XYZ', type: 'stream'}]}
        }

        const json = await pipedGet(['https://bad.example', 'https://good.example'], '/trending?region=US', fetcher)

        expect(calls).toEqual(['https://bad.example/trending?region=US', 'https://good.example/trending?region=US'])
        expect(json).toHaveLength(1)
    })
})

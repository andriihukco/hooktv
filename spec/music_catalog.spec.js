import {afterEach, describe, expect, it, vi} from 'vitest'

import {albumTracks, isOpenLicense, queryFor, searchAlbums} from '../src/music/catalog'

afterEach(()=>{
    vi.unstubAllGlobals()
})

describe('free music catalog', () => {
    it('only treats CC BY and CC0 as free-use licenses', () => {
        expect(isOpenLicense('http://creativecommons.org/licenses/by/3.0/')).toBe(true)
        expect(isOpenLicense('http://creativecommons.org/licenses/by/4.0/')).toBe(true)
        expect(isOpenLicense('http://creativecommons.org/publicdomain/zero/1.0/')).toBe(true)
        expect(isOpenLicense('http://creativecommons.org/licenses/by-nc/4.0/')).toBe(false)
        expect(isOpenLicense('http://creativecommons.org/licenses/by-nd/4.0/')).toBe(false)
    })

    it('limits searches to the Free Music Archive and escapes user search text', () => {
        let query = queryFor('jazz', 'Miles "test"')

        expect(query).toContain('collection:freemusicarchive')
        expect(query).toContain('subject:Jazz')
        expect(query).toContain('Miles \\"test\\"')
        expect(query).toContain('publicdomain')
    })

    it('requests albums with approved licenses and metadata fields', async () => {
        let fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async()=>({
                response: {
                    docs: [
                        {
                            identifier: 'open-release',
                            title: 'Open release',
                            creator: 'A. Artist',
                            licenseurl: 'http://creativecommons.org/licenses/by/4.0/',
                            subject: ['Jazz']
                        },
                        {
                            identifier: 'restricted-release',
                            title: 'Restricted release',
                            licenseurl: 'http://creativecommons.org/licenses/by-nc/4.0/'
                        }
                    ]
                }
            })
        })

        vi.stubGlobal('fetch', fetch)

        let results = await searchAlbums('jazz')
        let url = new URL(fetch.mock.calls[0][0])

        expect(url.searchParams.getAll('fl[]')).toEqual(['identifier', 'title', 'creator', 'licenseurl', 'subject'])
        expect(results).toHaveLength(1)
        expect(results[0].identifier).toBe('open-release')
        expect(results[0].artist).toBe('A. Artist')
    })

    it('returns only playable MP3 files and preserves attribution', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async()=>({
                metadata: {
                    title: 'Quiet album',
                    creator: 'A. Artist',
                    licenseurl: 'http://creativecommons.org/licenses/by/3.0/'
                },
                files: [
                    {name: 'Artist - First song.mp3', format: 'VBR MP3', length: '93.8'},
                    {name: 'cover.jpg', format: 'JPEG'},
                    {name: 'Artist - First song.lrc', format: 'Text'}
                ]
            })
        }))

        let tracks = await albumTracks({
            identifier: 'quiet-album',
            title: 'Quiet album',
            artist: 'A. Artist',
            licenseUrl: 'http://creativecommons.org/licenses/by/3.0/',
            archiveUrl: 'https://archive.org/details/quiet-album'
        })

        expect(tracks).toHaveLength(1)
        expect(tracks[0].title).toBe('Artist - First song')
        expect(tracks[0].license).toBe('CC BY 3.0')
        expect(tracks[0].duration).toBe(94)
        expect(tracks[0].lyricsUrl).toContain('.lrc')
        expect(tracks[0].stream).toBe('https://archive.org/download/quiet-album/Artist%20-%20First%20song.mp3')
    })
})

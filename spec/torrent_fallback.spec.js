import {describe, it, expect, vi, beforeEach} from 'vitest'

const mocks = vi.hoisted(()=>({
    platform: {android: false},
    torserver: {url: ''},
    parser: {get: vi.fn()},
    torrent: {back: vi.fn(), start: vi.fn()}
}))

vi.mock('../src/core/api/sources/parser', ()=>({default: {get: (...args)=>mocks.parser.get(...args)}}))
vi.mock('../src/interaction/torrent', ()=>({default: mocks.torrent}))
vi.mock('../src/interaction/torserver', ()=>({default: {url: ()=>mocks.torserver.url}}))
vi.mock('../src/interaction/select', ()=>({default: {}}))
vi.mock('../src/core/controller', ()=>({default: {}}))
vi.mock('../src/core/lang', ()=>({default: {translate: (k)=>k}}))
vi.mock('../src/core/platform', ()=>({default: {is: (name)=>name == 'android' && mocks.platform.android}}))
vi.mock('../src/utils/utils', ()=>({default: {shortText: (s)=>s, bytesToSize: ()=>'1 GB'}}))
vi.mock('../src/core/storage/storage', ()=>({default: {field: ()=>1080}}))

import TorrentFallback from '../src/interaction/torrent_fallback'

let movie = {id: 1, title: 'Початок', original_title: 'Inception', release_date: '2010-07-16'}

function run(movie, quality){
    let out
    TorrentFallback.search(movie, (items)=>{ out = items }, quality)
    return out
}

describe('TorrentFallback.search', () => {
    beforeEach(() => {
        mocks.platform = {android: false}
        mocks.torserver = {url: 'http://torr.local'}
        mocks.parser.get = vi.fn((params, ok)=>ok({Results: []}))
        mocks.torrent.back.mockClear()
        mocks.torrent.start.mockClear()
    })

    it('searches by original title and year, from the search endpoint', () => {
        run(movie)

        expect(mocks.parser.get).toHaveBeenCalledWith({search: 'Inception 2010', from_search: true, public_indexer: true}, expect.any(Function), expect.any(Function))
    })

    it('keeps only playable results, best seeded first, at most 20', () => {
        let results = [{Title: 'none', Seeders: 99}]

        for(let i = 0; i < 25; i++) results.push({Title: 't' + i, Seeders: i, MagnetUri: 'magnet:' + i})
        results.push({Title: 'link', Seeders: 3, Link: 'http://dl'})

        mocks.parser.get = vi.fn((params, ok)=>ok({Results: results}))

        let items = run(movie)

        expect(items).toHaveLength(20)
        expect(items[0].Title).toBe('t24')
        expect(items.some(i=>i.Title == 'none')).toBe(false)
    })

    it('puts the selected quality first and recognizes UHD title tags', () => {
        mocks.parser.get = vi.fn((params, ok)=>ok({Results: [
            {Title: 'Film 1080p', Seeders: 90, MagnetUri: 'magnet:1080'},
            {Title: 'Film UHD', Seeders: 3, MagnetUri: 'magnet:4k'},
            {Title: 'Film 720p', Seeders: 40, MagnetUri: 'magnet:720'}
        ]}))

        expect(run(movie, 2160).map(item=>item.Title)).toEqual(['Film UHD', 'Film 1080p', 'Film 720p'])
        expect(TorrentFallback.preferred(run(movie, 2160), 2160).MagnetUri).toBe('magnet:4k')
    })

    it('starts a selected torrent without opening the result picker', () => {
        TorrentFallback.play({Title: 'Film 2160p', MagnetUri: 'magnet:4k'}, movie, 'content')

        expect(mocks.torrent.back).toHaveBeenCalledWith(expect.any(Function))
        expect(mocks.torrent.start).toHaveBeenCalledWith({
            title: 'Film 2160p',
            MagnetUri: 'magnet:4k',
            Link: undefined,
            poster: undefined
        }, movie)
    })

    it('is empty when the indexer fails', () => {
        mocks.parser.get = vi.fn((params, ok, fail)=>fail('down'))

        expect(run(movie)).toEqual([])
    })

    it('does not search without a torrent player', () => {
        mocks.torserver = {url: ''}

        expect(run(movie)).toEqual([])
        expect(mocks.parser.get).not.toHaveBeenCalled()
    })

    it('plays through the Android player without TorrServer', () => {
        mocks.torserver = {url: ''}
        mocks.platform = {android: true}
        mocks.parser.get = vi.fn((params, ok)=>ok({Results: [{Title: 'a', MagnetUri: 'magnet:a'}]}))

        expect(run(movie)).toHaveLength(1)
    })

    it('does not search a card without an id', () => {
        expect(run({title: 'x'})).toEqual([])
        expect(mocks.parser.get).not.toHaveBeenCalled()
    })
})

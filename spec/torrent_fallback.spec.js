import {describe, it, expect, vi, beforeEach} from 'vitest'

let platform = {android: false}
let torserver = {url: ''}
let parser = {get: vi.fn()}

vi.mock('../src/core/api/sources/parser', ()=>({default: {get: (...args)=>parser.get(...args)}}))
vi.mock('../src/interaction/torrent', ()=>({default: {}}))
vi.mock('../src/interaction/torserver', ()=>({default: {url: ()=>torserver.url}}))
vi.mock('../src/interaction/select', ()=>({default: {}}))
vi.mock('../src/core/controller', ()=>({default: {}}))
vi.mock('../src/core/lang', ()=>({default: {translate: (k)=>k}}))
vi.mock('../src/core/platform', ()=>({default: {is: (name)=>name == 'android' && platform.android}}))
vi.mock('../src/utils/utils', ()=>({default: {shortText: (s)=>s, bytesToSize: ()=>'1 GB'}}))

import TorrentFallback from '../src/interaction/torrent_fallback'

let movie = {id: 1, title: 'Початок', original_title: 'Inception', release_date: '2010-07-16'}

function run(movie){
    let out
    TorrentFallback.search(movie, (items)=>{ out = items })
    return out
}

describe('TorrentFallback.search', () => {
    beforeEach(() => {
        platform = {android: false}
        torserver = {url: 'http://torr.local'}
        parser.get = vi.fn((params, ok)=>ok({Results: []}))
    })

    it('searches by original title and year, from the search endpoint', () => {
        run(movie)

        expect(parser.get).toHaveBeenCalledWith({search: 'Inception 2010', from_search: true, public_indexer: true}, expect.any(Function), expect.any(Function))
    })

    it('keeps only playable results, best seeded first, at most 20', () => {
        let results = [{Title: 'none', Seeders: 99}]

        for(let i = 0; i < 25; i++) results.push({Title: 't' + i, Seeders: i, MagnetUri: 'magnet:' + i})
        results.push({Title: 'link', Seeders: 3, Link: 'http://dl'})

        parser.get = vi.fn((params, ok)=>ok({Results: results}))

        let items = run(movie)

        expect(items).toHaveLength(20)
        expect(items[0].Title).toBe('t24')
        expect(items.some(i=>i.Title == 'none')).toBe(false)
    })

    it('is empty when the indexer fails', () => {
        parser.get = vi.fn((params, ok, fail)=>fail('down'))

        expect(run(movie)).toEqual([])
    })

    it('does not search without a torrent player', () => {
        torserver = {url: ''}

        expect(run(movie)).toEqual([])
        expect(parser.get).not.toHaveBeenCalled()
    })

    it('plays through the Android player without TorrServer', () => {
        torserver = {url: ''}
        platform = {android: true}
        parser.get = vi.fn((params, ok)=>ok({Results: [{Title: 'a', MagnetUri: 'magnet:a'}]}))

        expect(run(movie)).toHaveLength(1)
    })

    it('does not search a card without an id', () => {
        expect(run({title: 'x'})).toEqual([])
        expect(parser.get).not.toHaveBeenCalled()
    })
})

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
vi.mock('../src/core/tmdb/tmdb', ()=>({default: {api: (url)=>url, key: ()=>'k'}}))
vi.mock('../src/utils/reguest', ()=>({default: class { silent(url, ok, fail){ alternatives.silent(url, ok, fail) } }}))

let alternatives = {silent: (url, ok)=>ok({titles: []})}

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
        alternatives.silent = (url, ok)=>ok({titles: []})
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

    it('also searches the alternative titles TMDB lists, with the year', () => {
        alternatives.silent = (url, ok)=>ok({titles: [{iso_3166_1: 'UA', title: 'Початок'}, {iso_3166_1: 'US', title: 'Inception'}]})

        run(movie)

        let searched = parser.get.mock.calls.map(call=>call[0].search)

        expect(searched).toContain('Початок 2010')
        expect(searched).toContain('Inception 2010')
        expect(searched.filter(s=>s == 'Inception 2010')).toHaveLength(1)
    })

    it('searches the English main title, fetched in English', () => {
        let ukrainianOnly = {id: 3, title: 'Початок', original_title: 'Початок', release_date: '2010-07-16'}
        alternatives.silent = (url, ok)=>ok(url.includes('language=en-US') ? {title: 'Inception'} : {titles: []})

        run(ukrainianOnly)

        expect(parser.get.mock.calls.map(call=>call[0].search)).toContain('Inception 2010')
    })

    it('finds a Ukrainian-titled release through the alternative title', () => {
        alternatives.silent = (url, ok)=>ok({titles: [{title: 'Початок'}]})
        parser.get = vi.fn((params, ok)=>ok({Results: params.search == 'Початок 2010'
            ? [{Title: 'Початок (2010) BDRip 1080p Ukr/Eng', Seeders: 2, MagnetUri: 'magnet:uk'}]
            : []}))

        expect(run(movie).map(i=>i.Title)).toEqual(['Початок (2010) BDRip 1080p Ukr/Eng'])
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

describe('TorrentFallback.rank', () => {
    const card = {id: 1, title: 'Початок', original_title: 'Inception', release_date: '2010-07-16'}

    it('puts the matching title and year first, then Ukrainian audio, then seeders', () => {
        let items = [
            {Title: 'Other Movie 2010 1080p', Seeders: 99},
            {Title: 'Inception (2010) BDRip 1080p Eng', Seeders: 5},
            {Title: 'Inception (2010) BDRip 1080p Ukr/Eng | Sub Eng', Seeders: 1}
        ]

        let ranked = TorrentFallback.rank(items, card).map(i=>i.Title)

        expect(ranked[0]).toBe('Inception (2010) BDRip 1080p Ukr/Eng | Sub Eng')
        expect(ranked[1]).toBe('Inception (2010) BDRip 1080p Eng')
    })

    it('drops a remake from another year', () => {
        let items = [{Title: 'Inception (2024) WEB-DL 1080p Ukr', Seeders: 50}]

        expect(TorrentFallback.rank(items, card)).toEqual([])
    })

    it('keeps releases with no year, ranked lower', () => {
        let items = [
            {Title: 'Inception Ukr 1080p', Seeders: 1},
            {Title: 'Inception (2010) 1080p', Seeders: 1}
        ]

        expect(TorrentFallback.rank(items, card).map(i=>i.Title)).toEqual(['Inception (2010) 1080p', 'Inception Ukr 1080p'])
    })

    it('matches whole words only, with accents and punctuation ignored', () => {
        let amelie = {id: 2, original_title: 'Amélie', release_date: '2001-04-25'}
        let items = [
            {Title: 'Amelie 2001 BDRip Ukr', Seeders: 1},
            {Title: 'Amelies 2001 BDRip Ukr', Seeders: 9}
        ]

        expect(TorrentFallback.rank(items, amelie)[0].Title).toBe('Amelie 2001 BDRip Ukr')
    })

    it('does not treat Ukrainian subtitles as Ukrainian audio', () => {
        let items = [
            {Title: 'Inception (2010) BDRip Eng | Sub Ukr', Seeders: 9},
            {Title: 'Inception (2010) BDRip Ukr/Eng | Sub Eng', Seeders: 1}
        ]

        expect(TorrentFallback.rank(items, card)[0].Title).toBe('Inception (2010) BDRip Ukr/Eng | Sub Eng')
    })
})

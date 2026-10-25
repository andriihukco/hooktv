import {expect, suite, test} from 'vitest'
import Sources from '../src/core/sources.js'

suite('sources', ()=>{
    test('merges providers, skips failures, puts Ukrainian audio first', async ()=>{
        Sources.register({
            name: 'a',
            search: async ()=>[{id: 1, title: 'Film', year: '2024', rating: '7.5'}],
            streams: async ()=>[
                {url: 'http://a/en.m3u8', audio: [{label: 'English'}]},
                {url: 'http://a/uk.m3u8', audio: [{label: 'Українська', language: 'ukr'}], subtitles: [{url: 'http://a/uk.srt'}, {label: 'no url'}]}
            ]
        })
        Sources.register({name: 'broken', search: ()=>Promise.reject(new Error('down')), streams: async ()=>[]})

        let items = await Sources.search('film')

        expect(items).toEqual([{provider: 'a', id: '1', title: 'Film', original_title: '', year: 2024, poster: '', rating: 7.5}])

        let streams = await Sources.streams(items[0])

        expect(streams.map(s=>s.url)).toEqual(['http://a/uk.m3u8', 'http://a/en.m3u8'])
        expect(streams[0].uk).toBe(true)
        expect(Sources.playData(streams[0], items[0])).toMatchObject({
            url: 'http://a/uk.m3u8',
            title: 'Film',
            subtitles: [{label: 'uk.srt', url: 'http://a/uk.srt'}],
            hooktv: 'uk'
        })

        Sources.remove('a')
        Sources.remove('broken')
    })

    test('rejects malformed providers', ()=>{
        expect(()=>Sources.register({name: 'x'})).toThrow()
    })
})

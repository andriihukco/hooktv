import {expect, suite, test} from 'vitest'
import {parseMediaMetadata} from '../tools/indexer/dubbing-parser.js'
import {selectReleases, withoutApiKey} from '../tools/indexer/run.js'

suite('release titles', ()=>{
    test('scene titles give a clean name, quality and Ukrainian flag', ()=>{
        const meta = parseMediaMetadata('Dune.Part.Two.2024.UKR.1080p.WEB-DL.x264')
        expect(meta.isUkrainian).toBe(true)
        expect(meta.quality).toBe('1080P')
        expect(meta.cleanTitle).toBe('Dune Part Two 2024')
        expect(meta.dubbingStudio).toBe('Standard UA')
    })

    test('words that merely contain "ua" are not Ukrainian', ()=>{
        expect(parseMediaMetadata('Equal.2002.1080p.BluRay.x264').isUkrainian).toBe(false)
        expect(parseMediaMetadata('Aqua.Man.2018.720p').isUkrainian).toBe(false)
        expect(parseMediaMetadata('Equal.2002.1080p.BluRay.x264').cleanTitle).toBe('Equal 2002')
    })

    test('studio names are detected in Latin and Cyrillic', ()=>{
        expect(parseMediaMetadata('Мавка Лісова пісня 2023 1080p Українською Postmodern').dubbingStudio).toBe('Postmodern')
        expect(parseMediaMetadata('Shchodennyk.Tak.Treba.Production.2020.720p').dubbingStudio).toBe('Tak Treba Production')
        expect(parseMediaMetadata('Movie 2020 Омікрон 720p').dubbingStudio).toBe('Omikron')
        expect(parseMediaMetadata('Movie 2020 Unidub 720p').dubbingStudio).toBe('Unidub')
        expect(parseMediaMetadata('Фільм 2020 Цікава ідея 720p').dubbingStudio).toBe('Cikava Ideya')
    })

    test('a studio tag alone counts as Ukrainian dubbing', ()=>{
        expect(parseMediaMetadata('Movie 2020 Postmodern 720p').isUkrainian).toBe(true)
    })

    test('4k and missing quality are normalised', ()=>{
        expect(parseMediaMetadata('Movie 2020 UA 4k HEVC').quality).toBe('4K')
        expect(parseMediaMetadata('Movie 2020 UA').quality).toBe('UNKNOWN')
    })

    test('tracker titles count Ukrainian audio only, not Ukrainian subtitles', ()=>{
        expect(parseMediaMetadata('Bad Apples (2025) WEB-DL 1080p Ukr/Eng | Sub Eng').isUkrainian).toBe(true)
        expect(parseMediaMetadata('Movie (2020) BDRip 1080p Eng | Sub Ukr').isUkrainian).toBe(false)
    })

    test('tracker titles lose language, subtitle and codec tags in the clean title', ()=>{
        const meta = parseMediaMetadata('Todo sobre mi madre (1999) BDRip 1080p Ukr/Spa | Sub Ukr/Eng/Spa')
        expect(meta.cleanTitle).toBe('Todo sobre mi madre')
        expect(parseMediaMetadata('Ao no Hako (S2) (2026) WEB-DL 1080p H.265 Ukr/Jap | sub Ukr').cleanTitle).toBe('Ao no Hako')
    })

    test('English-only titles are not Ukrainian', ()=>{
        expect(parseMediaMetadata('Movie 2020 ENG 1080p').isUkrainian).toBe(false)
    })

    test('brackets and codec tags are removed from the clean title', ()=>{
        expect(parseMediaMetadata('Movie Name [RG] (2020) UA DDP5.1 AAC 1080p').cleanTitle).toBe('Movie Name')
    })

    test('download links lose the Prowlarr API key', ()=>{
        expect(withoutApiKey('http://127.0.0.1:9696/1/download?file=abc&apikey=secret')).toBe('http://127.0.0.1:9696/1/download?file=abc')
        expect(withoutApiKey('magnet:?xt=urn:btih:abc')).toBe('magnet:?xt=urn:btih:abc')
    })

    test('selectReleases keeps seeded Ukrainian releases only', ()=>{
        const results = [
            {title: 'Movie.2020.UKR.1080p', seeders: 5},
            {title: 'Movie.2020.UKR.1080p', seeders: 2},
            {title: 'Movie.2020.ENG.1080p', seeders: 50}
        ]
        const kept = selectReleases(results)
        expect(kept).toHaveLength(1)
        expect(kept[0].metadata.isUkrainian).toBe(true)
    })
})

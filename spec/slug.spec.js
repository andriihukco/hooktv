import {expect, suite, test} from 'vitest'
import {createRequire} from 'module'
import Slug from '../src/utils/slug.js'

const Server = createRequire(import.meta.url)('../api/_slug.js')

suite('title addresses', ()=>{
    test('slugs transliterate Ukrainian and stay short', ()=>{
        expect(Slug.slug('Мавка: Лісова пісня')).toBe('mavka-lisova-pisnya')
        expect(Slug.slug('Щоденник єнота, їжак')).toBe('shchodennyk-yenota-yizhak')
        expect(Slug.slug('Amélie & Co.')).toBe('amelie-co')
        expect(Slug.slug('???')).toBe('')
        expect(Slug.slug('слово '.repeat(30)).length).toBeLessThanOrEqual(60)
        expect(Slug.slug('слово '.repeat(30))).not.toMatch(/-$/)
    })

    test('paths carry the id first and read back by id only', ()=>{
        expect(Slug.cardPath('movie', 1101412, 'Dune: Part Two')).toBe('/movie/1101412-dune-part-two')
        expect(Slug.cardPath('tv', 5, '')).toBe('/tv/5')
        expect(Slug.cardPath('tv', 5, 'Пес Патрон', 'cub')).toBe('/tv/5-pes-patron?source=cub')
        expect(Slug.parseCardPath('/movie/1101412-dune-part-two')).toEqual({media: 'movie', id: '1101412'})
        expect(Slug.parseCardPath('/tv/5/')).toEqual({media: 'tv', id: '5'})
        expect(Slug.parseCardPath('/movie/abc')).toBeNull()
        expect(Slug.parseCardPath('/api/title')).toBeNull()
        expect(Slug.parseCardPath('/')).toBeNull()
    })

    test('the app and the server build the same address', ()=>{
        for(let name of ['Мавка: Лісова пісня', 'Dune', 'Ґрати ь', '', '日本語 x']){
            expect(Slug.slug(name)).toBe(Server.slug(name))
            expect(Slug.cardPath('tv', 9, name, 'cub')).toBe(Server.cardPath('tv', 9, name, 'cub'))
        }
    })
})

import {describe, it, expect} from 'vitest'
import fs from 'fs'
import path from 'path'
import games, {categories} from '../src/games/catalog'
import {rows, featuredGame} from '../src/games/home'

const DAY = 864e5
const MODULE = 'module'

describe('games home rows', ()=>{
    const list = rows(0, MODULE)
    const types = list.map(r => r.params.type)

    it('starts with the heroes, then the ranked list, then one shelf per folder and a shelf of all games', ()=>{
        expect(types.slice(0, 2)).toEqual(['feature', 'list'])
        expect(types.slice(2)).toEqual([...categories.map(() => 'shelf'), 'shelf'])
        expect(types).not.toContain('folders')
    })

    it('the heroes are four different featured games, shown as feature tiles', ()=>{
        const heroes = list[0].results

        expect(heroes.length).toBe(4)
        expect(new Set(heroes.map(h => h.game)).size).toBe(4)
        heroes.forEach(h => expect(h.params.style.name).toBe('feature'))
        expect(heroes[0].game).toBe(featuredGame(0).id)
    })

    it('the ranked list numbers its games from 1 with their best score', ()=>{
        const top = list[1].results

        expect(top.length).toBe(10)
        top.forEach((g, i) => {
            expect(g.rank).toBe(i + 1)
            expect(g.params.style.name).toBe('list')
            expect(typeof g.best).toBe('number')
        })
    })

    it('every tile carries the card module it was built with', ()=>{
        list.forEach(r => r.results.forEach(t => expect(t.params.module).toBe(MODULE)))
    })

    it('a shelf lists the games of its folder in order', ()=>{
        categories.forEach((c, i) => {
            expect(list[2 + i].results.map(t => t.game)).toEqual(c.games.map(g => g.id))
        })
    })

    it('the last shelf holds every game', ()=>{
        expect(list[list.length - 1].results.length).toBe(games.length)
    })
})

describe('featured game', ()=>{
    it('stays the same for a day and changes the next', ()=>{
        const day = 1000 * DAY

        expect(featuredGame(day + 1)).toBe(featuredGame(day + DAY - 1))
        expect(featuredGame(day + DAY)).not.toBe(featuredGame(day))
    })
})

describe('games home strings', ()=>{
    const dir = path.resolve(process.cwd(), 'src/lang')
    const codes = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'meta.js').map(f => f.slice(0, -3))
    const keys = ['hooktv_games_top', 'hooktv_games_categories', 'hooktv_games_all']

    it('every language pack has the home strings', async ()=>{
        for(const code of codes){
            const pack = (await import(path.join(dir, code + '.js'))).default

            keys.forEach(key => expect(pack[key], `${code}: ${key}`).toBeTruthy())
        }
    })

    it('no pack leaves a home string in English', async ()=>{
        const en = (await import(path.join(dir, 'en.js'))).default

        for(const code of codes.filter(c => c !== 'en')){
            const pack = (await import(path.join(dir, code + '.js'))).default

            keys.forEach(key => expect(pack[key], `${code}: ${key} is still English`).not.toBe(en[key]))
        }
    })
})

describe('game tiles keep their home layout', ()=>{
    it('a home tile keeps its style, a stored bookmark is drawn as a game', async ()=>{
        const {hydrate} = await import('../src/games/catalog')

        expect(hydrate({game: 'chess', params: {style: {name: 'list'}}}).params.style.name).toBe('list')
        expect(hydrate({game: 'chess', params: {style: {name: 'default'}}}).params.style.name).toBe('game')
        expect(hydrate({game: 'chess'}).params.style.name).toBe('game')
    })
})

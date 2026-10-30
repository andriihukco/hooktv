import {describe, it, expect} from 'vitest'
import fs from 'fs'
import path from 'path'
import {categories} from '../src/games/catalog'
import {rows, featuredGame} from '../src/games/home'

const DAY = 864e5
const MODULE = 'module'

describe('games home rows', ()=>{
    const list = rows(0, MODULE)
    const types = list.map(r => r.params.type)

    it('starts with the hero, then the ranked list, then the folders, then one shelf per folder', ()=>{
        expect(types.slice(0, 3)).toEqual(['feature', 'list', 'folders'])
        expect(types.slice(3)).toEqual(categories.map(() => 'shelf'))
    })

    it('the hero is one featured game, shown as a feature tile', ()=>{
        expect(list[0].results.length).toBe(1)
        expect(list[0].results[0].params.style.name).toBe('feature')
        expect(list[0].results[0].game).toBe(featuredGame(0).id)
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

    it('the folders row ends with All games, which opens every game', ()=>{
        const folders = list[2].results

        expect(folders.length).toBe(categories.length + 1)
        expect(folders[folders.length - 1].all).toBe(true)
        folders.slice(0, -1).forEach(f => expect(f.category).toBeTruthy())
    })

    it('every tile carries the card module it was built with', ()=>{
        list.forEach(r => r.results.forEach(t => expect(t.params.module).toBe(MODULE)))
    })

    it('a shelf lists the games of its folder in order', ()=>{
        categories.forEach((c, i) => {
            expect(list[3 + i].results.map(t => t.game)).toEqual(c.games.map(g => g.id))
        })
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

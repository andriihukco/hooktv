import {describe, it, expect} from 'vitest'
import fs from 'fs'
import path from 'path'
import catalog from '../src/games/catalog'
import categories from '../src/games/categories'
import meta from '../src/lang/meta'

const dir = path.resolve(process.cwd(), 'src/lang')
const codes = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'meta.js').map(f => f.slice(0, -3))

describe('games localisation', ()=>{
    it('every language pack has a title and a hint for every game', async ()=>{
        for(const code of codes){
            const pack = (await import(path.join(dir, code + '.js'))).default

            catalog.forEach(g=>{
                expect(pack[`game_${g.id}_title`], `${code}: ${g.id} title`).toBeTruthy()
                expect(pack[`game_${g.id}_hint`], `${code}: ${g.id} hint`).toBeTruthy()
            })
        }
    })

    it('every language pack has a name for every game folder', async ()=>{
        const folders = categories.map(c=>c.id).concat('more')

        for(const code of codes){
            const pack = (await import(path.join(dir, code + '.js'))).default

            folders.forEach(id=>{
                expect(pack[`games_cat_${id}_title`], `${code}: ${id} title`).toBeTruthy()
                expect(pack[`games_cat_${id}_overview`], `${code}: ${id} overview`).toBeTruthy()
            })
        }
    })

    it('every language pack is listed in the language picker', ()=>{
        codes.forEach(code=>{
            expect(meta.languages[code], code).toBeTruthy()
        })
    })
})

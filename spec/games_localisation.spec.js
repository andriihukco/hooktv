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

describe('games localisation rule', ()=>{
    it('no language pack leaves a game hint in English', async ()=>{
        const en = (await import(path.join(dir, 'en.js'))).default

        for(const code of codes.filter(c => c !== 'en')){
            const pack = (await import(path.join(dir, code + '.js'))).default

            catalog.forEach(g=>{
                const key = `game_${g.id}_hint`
                expect(pack[key], `${code}: ${key} is still English`).not.toBe(en[key])
            })
        }
    })
})

describe('games console strings', ()=>{
    const keys = ['hooktv_game_resume', 'hooktv_game_settings', 'hooktv_game_scores', 'hooktv_game_instructions', 'hooktv_game_rules', 'hooktv_game_leave', 'hooktv_game_exit', 'hooktv_game_back', 'hooktv_game_play', 'hooktv_game_played', 'hooktv_game_wins', 'hooktv_game_level', 'hooktv_level_easy', 'hooktv_level_normal', 'hooktv_level_hard']

    it('every language pack has the lobby and menu strings (English where a pack is still partial)', async ()=>{
        for(const code of codes){
            const pack = (await import(path.join(dir, code + '.js'))).default

            keys.forEach(key => expect(pack[key], `${code}: ${key}`).toBeTruthy())
        }
    })

    it('the Ukrainian pack has them translated, so the menu is not half English', async ()=>{
        const en = (await import(path.join(dir, 'en.js'))).default
        const uk = (await import(path.join(dir, 'uk.js'))).default

        keys.forEach(key => expect(uk[key], `uk: ${key} is still English`).not.toBe(en[key]))
    })
})

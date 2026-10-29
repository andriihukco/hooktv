import {describe, it, expect, vi} from 'vitest'

// each test imports all 40 language packs; under a full parallel run that can pass the 5 s default
vi.setConfig({testTimeout: 20000})
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

describe('games help and Settings → Controls strings', ()=>{
    it('every language pack has every help, controls and menu string the games and Settings use', async ()=>{
        const en = (await import(path.join(dir, 'en.js'))).default
        const keys = Object.keys(en).filter(k => /^(hooktv_help_|hooktv_controls_|hooktv_game_(arcade|puzzle|words|logic|board|cards)$|hooktv_(play_game|games_count|paused|score|best|play_again|game_over)$|(title|menu)_(games|music)$)/.test(k))

        expect(keys.length).toBeGreaterThan(30)

        for(const code of codes){
            const pack = (await import(path.join(dir, code + '.js'))).default

            keys.forEach(key => expect(pack[key], `${code}: ${key}`).toBeTruthy())
        }
    })
})

import {describe, it, expect} from 'vitest'
import fs from 'fs'
import path from 'path'

const dir = path.resolve(process.cwd(), 'src/lang')
const codes = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'meta.js').map(f => f.slice(0, -3))

describe('music localisation', ()=>{
    it('every language pack has every music string, and none is still the English text', async ()=>{
        const en = (await import(path.join(dir, 'en.js'))).default
        const keys = Object.keys(en).filter(k => k.startsWith('music_'))

        expect(keys.length).toBeGreaterThan(20)

        for(const code of codes.filter(c => c !== 'en')){
            const pack = (await import(path.join(dir, code + '.js'))).default

            keys.forEach(key=>{
                expect(pack[key], `${code}: ${key}`).toBeTruthy()
                // brand-free words like "Jazz" may match English; full sentences must not
                if(en[key].split(' ').length > 2) expect(pack[key], `${code}: ${key} is still English`).not.toBe(en[key])
            })
        }
    })
})

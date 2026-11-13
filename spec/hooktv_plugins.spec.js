import {describe, it, expect, vi} from 'vitest'
import fs from 'fs'
import path from 'path'
import {validateManifest, createRegistry, safe, createConfig, CATEGORIES} from '../plugins/hooktv_core/sdk'

const root = process.cwd()
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))

const good = {id: 'hooktv_demo', name: 'Demo', version: '1.2.3', category: 'utilities', licence: 'Proprietary (HOOK TV)'}

describe('HOOK TV manifest validation', ()=>{
    it('accepts a complete manifest', ()=>{
        expect(validateManifest(good)).toEqual([])
    })

    it('rejects a missing or non-object manifest', ()=>{
        expect(validateManifest(null)).toEqual(['manifest must be an object'])
        expect(validateManifest('x')).toEqual(['manifest must be an object'])
    })

    it('requires the hooktv_ id prefix, semver version, known category and licence', ()=>{
        const errors = validateManifest({...good, id: 'demo', version: '1.2', category: 'misc', licence: ''})

        expect(errors).toHaveLength(4)
        expect(errors.join(' ')).toContain('hooktv_')
        expect(errors.join(' ')).toContain('x.y.z')
        expect(errors.join(' ')).toContain('category')
        expect(errors.join(' ')).toContain('licence')
    })

    it('knows the seven folder categories from the architecture plan', ()=>{
        expect(CATEGORIES).toEqual(['core', 'online', 'catalog', 'parsers', 'utilities', 'community', 'integrations'])
    })
})

describe('HOOK TV plugin registry', ()=>{
    it('registers once and ignores a repeated id', ()=>{
        const registry = createRegistry()

        expect(registry.register(good)).toBe(true)
        expect(registry.register({...good, name: 'Other'})).toBe(false)
        expect(registry.get('hooktv_demo').name).toBe('Demo')
    })

    it('throws on an invalid manifest and stores nothing', ()=>{
        const registry = createRegistry()

        expect(()=>registry.register({...good, id: 'bad id'})).toThrow(/Invalid HOOK TV manifest/)
        expect(registry.has('bad id')).toBe(false)
    })

    it('lists plugins sorted by name and returns frozen copies', ()=>{
        const registry = createRegistry()

        registry.register({...good, id: 'hooktv_b', name: 'Beta'})
        registry.register({...good, id: 'hooktv_a', name: 'Alpha'})

        expect(registry.list().map(p=>p.name)).toEqual(['Alpha', 'Beta'])
        expect(Object.isFrozen(registry.get('hooktv_a'))).toBe(true)
        expect(registry.get('hooktv_missing')).toBeNull()
    })
})

describe('safe wrapper', ()=>{
    it('returns the value when the function works', ()=>{
        const fn = safe('add', (a, b)=>a + b)

        expect(fn(2, 3)).toBe(5)
    })

    it('reports and swallows an error, returning undefined', ()=>{
        const onError = vi.fn()
        const fn = safe('broken', ()=>{ throw new Error('boom') }, onError)

        expect(fn()).toBeUndefined()
        expect(onError).toHaveBeenCalledWith('broken', expect.any(Error))
    })
})

describe('config wrapper', ()=>{
    it('prefixes keys and returns the fallback for missing values', ()=>{
        const store = {}
        const config = createConfig({
            get: (k, d)=> k in store ? store[k] : d,
            set: (k, v)=>{ store[k] = v }
        })

        expect(config.get('theme', 'dark')).toBe('dark')
        config.set('theme', 'light')
        expect(store.hooktv_theme).toBe('light')
        expect(config.get('theme', 'dark')).toBe('light')
    })

    it('does not throw when the storage is broken', ()=>{
        const config = createConfig({
            get: ()=>{ throw new Error('no storage') },
            set: ()=>{ throw new Error('no storage') }
        })

        expect(config.get('x', 7)).toBe(7)
        expect(config.set('x', 1)).toBe(false)
    })
})

describe('plugins/registry.json', ()=>{
    const registry = read('plugins/registry.json')
    const sources = read('docs/plugins/sources.json')

    it('lists only valid HOOK TV manifests with unique ids', ()=>{
        const ids = registry.plugins.map(p=>p.id)

        registry.plugins.forEach(p=>{
            expect(validateManifest(p), p.id).toEqual([])
        })
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('points each shipped plugin at a file that declares the same id and version', ()=>{
        registry.plugins.forEach(p=>{
            const file = path.join(root, p.file)

            expect(fs.existsSync(file), p.file).toBe(true)

            // The version may come from the shared constant in sdk.js (core does this).
            const src = fs.readFileSync(file, 'utf8') + fs.readFileSync(path.join(root, 'plugins/hooktv_core/sdk.js'), 'utf8')

            expect(src).toContain(`id: '${p.id}'`)
            expect(src).toContain(`'${p.version}'`)
        })
    })

    it('records every third-party source from the audit list as not bundled, with a reason', ()=>{
        expect(registry.excluded).toHaveLength(sources.length)

        sources.forEach(s=>{
            const entry = registry.excluded.find(e=>e.url === s.url)

            expect(entry, s.name).toBeTruthy()
            expect(entry.decision, s.name).toBe('not_bundled')
            expect(entry.reason.length, s.name).toBeGreaterThan(10)
        })
    })

    it('does not ship any file for an excluded third-party source', ()=>{
        const shipped = registry.plugins.map(p=>p.file).join('\n')

        registry.excluded.forEach(e=>{
            expect(shipped).not.toContain(e.name.replace(/\s+/g, '_'))
        })
    })
})

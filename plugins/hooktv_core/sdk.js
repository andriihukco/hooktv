// HOOK TV plugin SDK: pure logic (no DOM, no Lampa globals), so it can be unit-tested.
// Shared by every hooktv_* plugin through window.HookTV (see hooktv_core.js).

export const HOOKTV_VERSION = '1.0.0'

export const CATEGORIES = ['core', 'online', 'catalog', 'parsers', 'utilities', 'community', 'integrations']

const ID_RE = /^hooktv_[a-z0-9_]+$/
const SEMVER_RE = /^\d+\.\d+\.\d+$/

/**
 * Checks a plugin manifest and returns a list of problems (empty when valid).
 */
export function validateManifest(manifest){
    if(!manifest || typeof manifest !== 'object') return ['manifest must be an object']

    const errors = []

    if(!ID_RE.test(manifest.id || '')) errors.push('id must match hooktv_<name>')
    if(!manifest.name) errors.push('name is required')
    if(!SEMVER_RE.test(manifest.version || '')) errors.push('version must be x.y.z')
    if(!CATEGORIES.includes(manifest.category)) errors.push('category must be one of: ' + CATEGORIES.join(', '))
    if(!manifest.licence) errors.push('licence is required')

    return errors
}

/**
 * Registry of HOOK TV plugins loaded in this page. Registering the same id twice is a no-op.
 */
export function createRegistry(){
    const plugins = new Map()

    return {
        register(manifest){
            const errors = validateManifest(manifest)

            if(errors.length) throw new Error('Invalid HOOK TV manifest: ' + errors.join('; '))
            if(plugins.has(manifest.id)) return false

            plugins.set(manifest.id, Object.freeze({...manifest}))

            return true
        },
        has(id){
            return plugins.has(id)
        },
        get(id){
            return plugins.get(id) || null
        },
        list(){
            return [...plugins.values()].sort((a, b) => a.name.localeCompare(b.name))
        }
    }
}

/**
 * Wraps a function so that a thrown error is reported instead of breaking the caller.
 * Returns undefined when the wrapped function throws.
 */
export function safe(name, fn, onError = () => {}){
    return function(...args){
        try{
            return fn.apply(this, args)
        }
        catch(e){
            onError(name, e)

            return undefined
        }
    }
}

/**
 * Reads and writes plugin settings through a storage object (Lampa.Storage shape: get/set).
 * Every call is guarded: a broken or unavailable storage returns the default value.
 */
export function createConfig(storage, prefix = 'hooktv_'){
    const key = name => prefix + name

    return {
        get(name, fallback){
            try{
                const value = storage.get(key(name), fallback)

                return value === undefined || value === null ? fallback : value
            }
            catch(e){
                return fallback
            }
        },
        set(name, value){
            try{
                storage.set(key(name), value)

                return true
            }
            catch(e){
                return false
            }
        }
    }
}

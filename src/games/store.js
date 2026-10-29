// Everything the games remember on this device: each game's settings, the best score, and a history of runs.
// All of it lives in localStorage, so it never leaves the device; every read and write tolerates a blocked store.
import {SKINS} from './cinema'

const KEY = {
    cfg: id => 'hooktv_game_cfg_' + id,
    best: id => 'hooktv_game_' + id,
    history: 'hooktv_game_history',
    muted: 'hooktv_game_muted'
}
const KEEP = 200

function read(key, fallback){
    try {
        let raw = localStorage.getItem(key)

        return raw === null ? fallback : JSON.parse(raw)
    }
    catch(e){ return fallback }
}

function write(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)) } catch(e){}
}

export const best = {
    get: id => { try { return +localStorage.getItem(KEY.best(id)) || 0 } catch(e){ return 0 } },
    set: (id, n) => { try { localStorage.setItem(KEY.best(id), n) } catch(e){} }
}

export const sound = {
    get: () => { try { return localStorage.getItem(KEY.muted) == '1' } catch(e){ return false } },
    set: muted => { try { localStorage.setItem(KEY.muted, muted ? '1' : '0') } catch(e){} }
}

/** the settings the player chose for a game, filled in with the defaults the game declares */
export const config = {
    get(game){
        let saved = read(KEY.cfg(game.id), {})
        let out = {level: 1, skin: 'classic', intro: 'on'}

        if(game.modes) out.mode = game.modes[0].id
        ;(game.options || []).forEach(o => out[o.id] = o.values[o.def || 0].id)

        // a saved value that the game no longer offers falls back to the default
        Object.keys(out).forEach(k => {
            if(saved[k] === undefined) return
            if(k == 'level' ? [0, 1, 2].includes(saved[k]) : valid(game, k, saved[k])) out[k] = saved[k]
        })

        return out
    },
    set(game, cfg){
        write(KEY.cfg(game.id), cfg)
    }
}

function valid(game, key, value){
    if(key == 'skin') return SKINS.some(s => s.id == value)
    if(key == 'intro') return value == 'on' || value == 'off'
    if(key == 'mode') return !!game.modes && game.modes.some(m => m.id == value)

    let option = (game.options || []).find(o => o.id == key)

    return !!option && option.values.some(v => v.id == value)
}

/**
 * Score history. A run is {game, score, level, mode, win, ms, at}.
 */
export const history = {
    all: () => read(KEY.history, []),
    add(run){
        let list = history.all()

        list.push(Object.assign({at: Date.now()}, run))
        write(KEY.history, list.slice(-KEEP))
    },
    of: (id, count = 5) => history.all().filter(r => r.game == id).slice(-count).reverse(),
    clear(id){
        write(KEY.history, id ? history.all().filter(r => r.game != id) : [])
    },
    stats(id){
        let runs = history.all().filter(r => r.game == id)

        return {
            plays: runs.length,
            wins: runs.filter(r => r.win).length,
            ms: runs.reduce((sum, r) => sum + (r.ms || 0), 0),
            best: best.get(id)
        }
    }
}

/** "1h 5m", "12m", "40s" */
export function duration(ms){
    let s = Math.round(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60)

    if(h) return h + 'h ' + (m % 60) + 'm'
    if(m) return m + 'm'

    return s + 's'
}

/** "just now", "5m ago", "3h ago", "2d ago" */
export function ago(at, now = Date.now()){
    let m = Math.floor((now - at) / 60000)

    if(m < 1) return 'now'
    if(m < 60) return m + 'm'
    if(m < 1440) return Math.floor(m / 60) + 'h'

    return Math.floor(m / 1440) + 'd'
}

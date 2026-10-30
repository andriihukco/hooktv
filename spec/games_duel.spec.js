import {describe, it, expect} from 'vitest'
import catalog from '../src/games/catalog'
import categories from '../src/games/categories'
import {glyph, tint} from '../src/games/icons'
import {MOVES, inReach, strike} from '../src/games/duel'

describe('duel', ()=>{
    const game = catalog.find(g => g.id == 'duel')

    it('is an arcade game listed in the Arcade folder', ()=>{
        const arcade = categories.find(c => c.id == 'arcade')
        expect(game.kind).toBe('arcade')
        expect(arcade.games).toContain('duel')
    })

    it('has its own glyph and a tile', ()=>{
        expect(glyph('duel')).toBeTruthy()
        expect(tint('duel')).toHaveLength(2)
    })
})

describe('duel rules', ()=>{
    it('a hit lands only in front, within reach, and not over a jumping fighter', ()=>{
        expect(inReach('punch', 10, 0)).toBe(true)
        expect(inReach('punch', MOVES.punch.reach + 1, 0)).toBe(false)
        expect(inReach('punch', -4, 0)).toBe(false)
        expect(inReach('punch', 10, 20)).toBe(false)
        expect(inReach('kick', MOVES.punch.reach + 2, 0)).toBe(true)
    })

    it('a kick does more damage than a punch', ()=>{
        expect(strike('kick', false).dmg).toBeGreaterThan(strike('punch', false).dmg)
    })

    it('a block takes a quarter of the damage and no stun', ()=>{
        expect(strike('punch', true).dmg).toBe(MOVES.punch.dmg / 4)
        expect(strike('kick', true).dmg).toBe(MOVES.kick.dmg / 4)
        expect(strike('kick', true).stun).toBe(0)
        expect(strike('kick', false).stun).toBe(MOVES.kick.stun)
    })
})

// runs the game's own frame loop with a stub canvas: the computer fights an idle player and the duel ends
describe('duel frame loop', ()=>{
    const game = catalog.find(g => g.id == 'duel')

    function play(mode){
        let frame = null, over = null, score = 0
        const ctx = new Proxy({}, {
            get: (o, k) => k in o ? o[k] : () => ({addColorStop(){}}),
            set: (o, k, v) => (o[k] = v, true)
        })
        const env = {
            level: 0, mode, mult: 1, held: {},
            canvas: () => ({cv: {addEventListener(){}}, ctx, w: 120, h: 70}),
            on(){}, sfx(){}, score: n => { score = n },
            pick: a => a[Math.floor(Math.random() * a.length)],
            loop: fn => { frame = fn },
            over: (text, win) => { over = {text, win} }
        }

        game.start(env)
        return {
            step(seconds){ for(let i = 0; i < seconds * 60 && !over; i++) frame(1 / 60) },
            get over(){ return over }
        }
    }

    it('ends the duel once one fighter is beaten (the computer wins against an idle player)', ()=>{
        const run = play('cpu')
        run.step(600)
        expect(run.over).not.toBeNull()
        expect(run.over.win).toBe(false)
    })
})

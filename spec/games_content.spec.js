import {describe, it, expect, beforeEach} from 'vitest'
import catalog from '../src/games/catalog'
import {TRIVIA, STATEMENTS, flagQuestions, capitalQuestions} from '../src/games/data/questions'
import {ALIAS, ACT} from '../src/games/data/words'
import {SETS} from '../src/games/data/facts'
import {config, history, best, duration, ago} from '../src/games/store'

const memory = () => {
    let data = {}

    globalThis.localStorage = {
        getItem: k => k in data ? data[k] : null,
        setItem: (k, v) => { data[k] = String(v) },
        removeItem: k => { delete data[k] }
    }
}

function checkBank(name, bank){
    bank.forEach(([prompt, right, ...wrong]) => {
        expect(prompt, name).toBeTruthy()
        expect(wrong.length, name + ': ' + prompt).toBeGreaterThanOrEqual(1)
        expect(new Set([right, ...wrong]).size, name + ': ' + prompt).toBe(wrong.length + 1)
    })
}

describe('question library', ()=>{
    it('has a real size per category and clean answers', ()=>{
        TRIVIA.forEach(c => {
            expect(c.items.length, c.id).toBeGreaterThanOrEqual(20)
            checkBank(c.id, c.items)
        })

        checkBank('true/false', STATEMENTS)
        checkBank('flags', flagQuestions())
        checkBank('capitals', capitalQuestions())
    })

    it('holds well over two hundred trivia questions', ()=>{
        expect(TRIVIA.reduce((n, c) => n + c.items.length, 0)).toBeGreaterThan(200)
    })

    it('has no two identical prompts in a category', ()=>{
        TRIVIA.forEach(c => expect(new Set(c.items.map(i => i[0])).size, c.id).toBe(c.items.length))
    })

    it('keeps word lists unique and big enough for a game', ()=>{
        ;[...ALIAS, ...ACT].forEach(s => {
            expect(s.words.length, s.id).toBeGreaterThanOrEqual(20)
            expect(new Set(s.words).size, s.id).toBe(s.words.length)
        })
    })

    it('gives every fact set distinct values to compare', ()=>{
        SETS.forEach(s => {
            expect(s.items.length, s.id).toBeGreaterThanOrEqual(15)
            expect(new Set(s.items.map(i => i[0])).size, s.id).toBe(s.items.length)
        })
    })
})

describe('game settings', ()=>{
    it('only offers options whose default exists', ()=>{
        catalog.forEach(g => {
            ;(g.options || []).forEach(o => {
                expect(o.values[o.def || 0], g.id + ':' + o.id).toBeTruthy()
                expect(new Set(o.values.map(v => v.id)).size, g.id + ':' + o.id).toBe(o.values.length)
            })

            if(g.modes) g.modes.forEach(m => expect(m.id, g.id).toBeTruthy())
        })
    })

    it('removes the retired games', ()=>{
        ;['mastermind', 'mahjong', 'simon', 'lightsout', 'nonogram', 'invaders', 'asteroids', 'frogger', 'archery', 'insects', 'emoji', 'shapes', 'maze', 'connect4', 'dice', 'numspeak']
            .forEach(id => expect(catalog.find(g => g.id == id), id).toBeUndefined())
    })

    it('lets the party games play solo, as a duo and in teams', ()=>{
        ;['alias', 'charades', 'quiz'].forEach(id => expect(catalog.find(g => g.id == id).modes.map(m => m.id)).toEqual(['solo', 'duo', 'teams']))
    })
})

describe('games store', ()=>{
    beforeEach(memory)

    it('starts from the defaults the game declares', ()=>{
        let game = catalog.find(g => g.id == 'alias')
        let cfg = config.get(game)

        expect(cfg.level).toBe(1)
        expect(cfg.mode).toBe('solo')
        expect(cfg.rounds).toBe(3)
    })

    it('remembers a choice and drops one the game no longer offers', ()=>{
        let game = catalog.find(g => g.id == 'alias')

        config.set(game, {level: 2, mode: 'teams', rounds: 5, theme: 'zzz'})

        let cfg = config.get(game)

        expect(cfg.level).toBe(2)
        expect(cfg.mode).toBe('teams')
        expect(cfg.rounds).toBe(5)
        expect(cfg.theme).toBe('all')
    })

    it('keeps the history per game and counts stats', ()=>{
        history.add({game: 'snake', score: 10, win: false, ms: 4000})
        history.add({game: 'snake', score: 30, win: true, ms: 6000})
        history.add({game: 'pong', score: 7, win: true, ms: 1000})

        expect(history.of('snake').map(r => r.score)).toEqual([30, 10])
        expect(history.stats('snake')).toMatchObject({plays: 2, wins: 1, ms: 10000})

        history.clear('snake')

        expect(history.of('snake')).toEqual([])
        expect(history.of('pong')).toHaveLength(1)
    })

    it('trims the history to the latest runs', ()=>{
        for(let i = 0; i < 230; i++) history.add({game: 'x', score: i})

        expect(history.all()).toHaveLength(200)
        expect(history.all()[199].score).toBe(229)
    })

    it('keeps the best score', ()=>{
        best.set('snake', 120)

        expect(best.get('snake')).toBe(120)
    })

    it('formats time', ()=>{
        expect(duration(40000)).toBe('40s')
        expect(duration(12 * 60000)).toBe('12m')
        expect(duration(65 * 60000)).toBe('1h 5m')
        expect(ago(1000, 1000 + 5 * 60000)).toBe('5m')
        expect(ago(0, 3 * 3600000)).toBe('3h')
    })
})

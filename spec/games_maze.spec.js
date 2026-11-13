import {describe, it, expect} from 'vitest'
import {maze} from '../src/games/packs/arcade3'
import catalog from '../src/games/catalog'

describe('Astray maze', ()=>{
    it('is walled all round and every room can be reached', ()=>{
        const n = 6, g = maze(n), size = n * 2 + 1, seen = new Set(['1,1']), todo = [[1, 1]]

        expect(g.length).toBe(size)
        g.forEach((r, i) => { expect(r[0]).toBe(1); expect(r[size - 1]).toBe(1); if(!i || i == size - 1) r.forEach(c => expect(c).toBe(1)) })

        while(todo.length){
            const [x, y] = todo.pop()

            ;[[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                const k = `${x + dx},${y + dy}`

                if(g[y + dy][x + dx] === 0 && !seen.has(k)){ seen.add(k); todo.push([x + dx, y + dy]) }
            })
        }

        expect(seen.has(`${n * 2 - 1},${n * 2 - 1}`)).toBe(true)
        expect(seen.size).toBe(g.flat().filter(c => c === 0).length)
    })
})

describe('new arcade games', ()=>{
    it('are in the catalogue as arcade games with a start function', ()=>{
        ;['astray', 'racer', 'duel'].forEach(id => {
            const g = catalog.find(x => x.id == id)

            expect(g, id).toBeTruthy()
            expect(g.kind).toBe('arcade')
            expect(typeof g.start).toBe('function')
        })
    })
})

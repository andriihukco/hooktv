import {describe, it, expect} from 'vitest'
import {createRequire} from 'module'

const require = createRequire(import.meta.url)
const {groupByTeam} = require('../scripts/agent-admin/roster.js')

const roster = {
    teams: [{id: 'engineering', name: 'Engineering'}, {id: 'design', name: 'Design'}],
    agents: [
        {id: 'a', name: 'A', team: 'design', column: 'review'},
        {id: 'b', name: 'B', team: 'engineering', column: 'ready'},
        {id: 'c', name: 'C', team: 'nowhere', column: 'ready'}
    ]
}

describe('agent teams', ()=>{
    it('keeps the roster team order and shows empty teams too', ()=>{
        const teams = groupByTeam({teams: roster.teams, agents: []}, [])

        expect(teams.map(t => t.name)).toEqual(['Engineering', 'Design'])
        expect(teams[0].columns.every(c => c.cards.length == 0)).toBe(true)
    })

    it('puts each agent under its own team and column', ()=>{
        const teams = groupByTeam(roster, [])
        const cardsIn = (teamId, colId) => teams.find(t => t.id == teamId).columns.find(c => c.id == colId).cards.map(c => c.id)

        expect(cardsIn('engineering', 'ready')).toEqual(['b'])
        expect(cardsIn('design', 'review')).toEqual(['a'])
    })

    it('collects agents with an unknown team under Unassigned', ()=>{
        const teams = groupByTeam(roster, [])
        const last = teams[teams.length - 1]

        expect(last.id).toBe('unassigned')
        expect(last.columns.find(c => c.id == 'ready').cards.map(c => c.id)).toEqual(['c'])
    })
})

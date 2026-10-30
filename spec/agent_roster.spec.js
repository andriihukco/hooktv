import {describe, it, expect} from 'vitest'
import {createRequire} from 'module'

const require = createRequire(import.meta.url)
const {columnFor} = require('../scripts/agent-admin/roster.js')

describe('agent board column', ()=>{
    it('uses the hand-set column when the agent has no ledger', ()=>{
        expect(columnFor({column: 'review'}, [])).toBe('review')
        expect(columnFor({}, [])).toBe('ready')
        expect(columnFor({column: 'nonsense'}, [])).toBe('ready')
    })

    it('follows the ledger status over the hand-set column', ()=>{
        const ledgers = [{name: 'plan-a', status: 'paused'}, {name: 'plan-b', status: 'active'}, {name: 'plan-c', status: 'done'}]

        expect(columnFor({ledger: 'plan-a', column: 'ready'}, ledgers)).toBe('blocked')
        expect(columnFor({ledger: 'plan-b', column: 'ready'}, ledgers)).toBe('working')
        expect(columnFor({ledger: 'plan-c', column: 'review'}, ledgers)).toBe('done')
    })

    it('keeps the hand-set column when the named ledger is not found', ()=>{
        expect(columnFor({ledger: 'missing', column: 'review'}, [])).toBe('review')
    })
})

import {describe, it, expect} from 'vitest'
import {createRequire} from 'module'

const require = createRequire(import.meta.url)
const {passwordFrom, samePassword} = require('../api/admin/agents.js')

const basic = (user, pass) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')

describe('admin password from the Basic auth header', ()=>{
    it('takes the part after the first colon, so passwords may contain colons', ()=>{
        expect(passwordFrom(basic('admin', 'a:b:c'))).toBe('a:b:c')
    })

    it('is null without a Basic header or without a colon', ()=>{
        expect(passwordFrom(undefined)).toBeNull()
        expect(passwordFrom('Bearer abc')).toBeNull()
        expect(passwordFrom('Basic ' + Buffer.from('nocolon').toString('base64'))).toBeNull()
    })
})

describe('admin password check', ()=>{
    it('accepts only the exact password', ()=>{
        expect(samePassword('secret', 'secret')).toBe(true)
        expect(samePassword('secret ', 'secret')).toBe(false)
        expect(samePassword('', 'secret')).toBe(false)
    })
})

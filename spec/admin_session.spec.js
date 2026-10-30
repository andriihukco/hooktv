import {describe, it, expect} from 'vitest'
import {createRequire} from 'module'

const require = createRequire(import.meta.url)
const {issue, cookie, verify} = require('../api/admin/session.js')

const requestWith = (value)=> ({headers: {cookie: value}})
const SECRET = 'correct horse'

describe('admin session cookie', ()=>{
    it('accepts the cookie it issued', ()=>{
        const s = issue(SECRET)
        const header = cookie(s.value, s.maxAge)

        expect(header).toContain('HttpOnly')
        expect(header).toContain('SameSite=Strict')
        expect(verify(requestWith(header.split(';')[0]), SECRET)).toBe(true)
    })

    it('rejects a cookie signed with another password', ()=>{
        const s = issue('other')

        expect(verify(requestWith(`admin_session=${encodeURIComponent(s.value)}`), SECRET)).toBe(false)
    })

    it('rejects a tampered expiry and a missing cookie', ()=>{
        const s = issue(SECRET)
        const [, sig] = s.value.split('.')

        expect(verify(requestWith(`admin_session=${encodeURIComponent(`${Date.now() + 1e9}.${sig}`)}`), SECRET)).toBe(false)
        expect(verify(requestWith(undefined), SECRET)).toBe(false)
        expect(verify(requestWith('admin_session=x'), SECRET)).toBe(false)
    })

    it('rejects an expired session', ()=>{
        const past = Date.now() - 1000
        const sig = require('crypto').createHmac('sha256', SECRET).update(String(past)).digest('base64url')

        expect(verify(requestWith(`admin_session=${past}.${sig}`), SECRET)).toBe(false)
    })
})

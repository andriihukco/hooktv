import {describe, expect, it} from 'vitest'
import canStart from '../plugins/online_prestige/bootstrap'

describe('Online Prestige bootstrap compatibility', ()=>{
    it('starts with the HOOK TV API even when its semantic version is below the Lampa threshold', ()=>{
        const api = {
            Manifest: {app_digital: 100, plugins: []},
            Component: {add: ()=>{}},
            Activity: {push: ()=>{}}
        }

        expect(canStart(api, false)).toBe(true)
    })

    it('does not start when required Lampa APIs are unavailable', ()=>{
        expect(canStart({Manifest: {plugins: []}}, false)).toBe(false)
    })

    it('does not register twice', ()=>{
        expect(canStart({Manifest: {plugins: []}, Component: {add: ()=>{}}, Activity: {push: ()=>{}}}, true)).toBe(false)
    })
})

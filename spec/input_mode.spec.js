import {describe, expect, it, beforeEach} from 'vitest'

import InputMode from '../src/core/input_mode'

describe('input mode flag', () => {
    let listeners, classes

    beforeEach(() => {
        listeners = {}
        classes = new Set()

        globalThis.document = {
            body: {classList: {add: c=>classes.add(c), remove: c=>classes.delete(c)}},
            addEventListener: (type, fn)=>{ listeners[type] = fn }
        }
    })

    it('marks pointer input and clears it on a key press', () => {
        InputMode.init()

        listeners.pointermove()
        expect(classes.has(InputMode.CLASS)).toBe(true)

        listeners.keydown()
        expect(classes.has(InputMode.CLASS)).toBe(false)
    })
})

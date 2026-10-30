import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// the Apple TV player block forces the panel with !important, so it must stay
// scoped to Apple or it overrides the Android and web player skins
const scss = fs.readFileSync(path.resolve(__dirname, '../src/sass/_hooktv.scss'), 'utf8')

describe('Apple player block scope', () => {
    it('wraps the player rules in body.platform--apple', () => {
        let start = scss.indexOf('body.platform--apple{', scss.indexOf('Player: Apple TV'))
        let next = scss.indexOf('/* ----', start)

        expect(start).toBeGreaterThan(-1)
        expect(next).toBeGreaterThan(start)
    })

    it('keeps the forced panel rules inside that scope', () => {
        let start = scss.indexOf('body.platform--apple{', scss.indexOf('Player: Apple TV'))
        let next = scss.indexOf('/* ----', start)
        let block = scss.slice(start, next)

        expect(block).toContain('left: 0 !important')
        expect(block).toContain('&.true--mobile .player-panel')
    })
})

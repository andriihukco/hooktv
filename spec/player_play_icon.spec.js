import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// the play glyph must sit in the middle of its circle, so the circle is sized
// with border-box (padding used to push it 2em right) and the glyph is centred
const scss = fs.readFileSync(path.resolve(__dirname, '../src/sass/components/player/video.scss'), 'utf8')

describe('player play icon', () => {
    it('sizes the paused circle with border-box so it is centred', () => {
        let start = scss.indexOf('&__paused,')
        let block = scss.slice(start, scss.indexOf('\n    }', start))

        expect(block).toContain('box-sizing: border-box')
    })

    it('centres the glyph inside the circle', () => {
        let block = scss.slice(scss.indexOf('.player-video__paused{'), scss.indexOf('.player.player--panel-visible'))

        expect(block).toMatch(/svg\{[^}]*left: 50%/)
        expect(block).toContain('translate(-50%, -50%)')
    })
})

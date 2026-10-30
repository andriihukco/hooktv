import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// the Android panel is scoped to Android, keeps 48dp touch targets, shows a
// visible focus ring and respects reduced motion (WCAG 2.2 AA rules from CLAUDE.md)
const scss = fs.readFileSync(path.resolve(__dirname, '../src/sass/components/player/android.scss'), 'utf8')

describe('Android player panel', () => {
    it('is scoped to Android only', () => {
        expect(scss).toContain('body.platform--android{')
    })

    it('keeps 48dp minimum targets', () => {
        expect(scss).toContain('min-width: 3em')
        expect(scss).toContain('min-width: 48px')
        expect(scss).toContain('min-height: 48px')
    })

    it('does not blur the surface, to keep it cheap on Android GPUs', () => {
        expect(scss).not.toContain('backdrop-filter')
    })

    it('shows a primary-coloured focus ring', () => {
        expect(scss).toMatch(/outline: 0\.15em solid var\(--brand-primary\)/)
    })

    it('turns off transitions for reduced motion', () => {
        expect(scss).toContain('@media (prefers-reduced-motion: reduce)')
    })
})

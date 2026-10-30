import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// the Apple bar is scoped to Apple platforms, keeps 44px touch targets and
// respects reduced motion (WCAG 2.2 AA rules from CLAUDE.md)
const scss = fs.readFileSync(path.resolve(__dirname, '../src/sass/components/player/apple.scss'), 'utf8')

describe('Apple player bar', () => {
    it('is scoped to Apple platforms only', () => {
        expect(scss.trim().startsWith('//')).toBe(true)
        expect(scss).toContain('body.platform--apple{')
    })

    it('keeps 44px minimum targets for round buttons', () => {
        expect(scss).toContain('min-width: 2.75em')
        expect(scss).toContain('min-height: 2.75em')
        expect(scss).toContain('min-width: 44px')
    })

    it('shows a visible focus ring for remote and keyboard', () => {
        expect(scss).toMatch(/:focus-visible,[\s\S]*outline: 0\.15em solid #fff/)
    })

    it('turns off transitions for reduced motion', () => {
        expect(scss).toContain('@media (prefers-reduced-motion: reduce)')
    })
})

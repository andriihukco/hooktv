import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// the desktop web bar is scoped to desktop browsers, keeps 44px targets, shows
// a visible focus ring and respects reduced motion (WCAG 2.2 AA rules from CLAUDE.md)
const scss = fs.readFileSync(path.resolve(__dirname, '../src/sass/components/player/web.scss'), 'utf8')

describe('Web player bar', () => {
    it('is scoped to desktop browsers only', () => {
        expect(scss).toContain('body.platform--browser{')
    })

    it('keeps 44px minimum targets', () => {
        expect(scss).toContain('min-width: 44px')
        expect(scss).toContain('min-height: 44px')
    })

    it('shows a visible focus ring for keyboard', () => {
        expect(scss).toMatch(/outline: 0\.15em solid var\(--brand-primary\)/)
    })

    it('turns off transitions for reduced motion', () => {
        expect(scss).toContain('@media (prefers-reduced-motion: reduce)')
    })
})

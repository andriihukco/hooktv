import Material from '../src/utils/material'

import {expect, suite, test} from 'vitest'

suite('material icons', () => {
    test('known glyph renders rounded inline svg', () => {
        const svg = Material.icon('tv')

        expect(svg.startsWith('<svg class="material-icon"')).toBe(true)
        expect(svg).toContain('viewBox="0 0 24 24"')
        expect(svg).toContain('<path fill="currentColor"')
    })

    test('unknown glyph renders nothing', () => {
        expect(Material.icon('does_not_exist')).toBe('')
    })

    test('every inlined glyph has a path', () => {
        Material.names.forEach(name => {
            expect(Material.icon(name)).toContain('<path')
        })
    })
})

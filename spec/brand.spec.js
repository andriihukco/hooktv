import {expect, suite, test} from 'vitest'
import fs from 'fs'
import path from 'path'
import Brand from '../src/core/brand.js'

const root = path.resolve(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

function files(dir){
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => {
        const p = path.join(dir, e.name)
        return e.isDirectory() ? files(p) : [p]
    })
}

function luminance(hex){
    const [r, g, b] = hex.match(/\w\w/g).map(h => {
        const c = parseInt(h, 16) / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b){
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

suite('brand', () => {
    test('brand.js exposes the lime palette', () => {
        expect(Brand.getColor('primary')).toBe('#C8F542')
        expect(Brand.getColor('background')).toBe('#000000')
    })

    test('brand.scss defines the core tokens', () => {
        const scss = read('src/sass/brand.scss')
        expect(scss).toContain('--brand-primary: #C8F542')
        expect(scss).toContain('--brand-on-primary: #0B0F00')
    })

    test('no Netflix red is left in src or index.html', () => {
        const targets = files(path.join(root, 'src')).concat(path.join(root, 'public/index.html'))
        const hits = targets.filter(f => /#E50914|netflix-red/i.test(fs.readFileSync(f, 'utf8')))
        expect(hits.map(f => path.relative(root, f))).toEqual([])
    })

    test('brand colours meet WCAG AA contrast', () => {
        expect(contrast('#0B0F00', '#C8F542')).toBeGreaterThanOrEqual(4.5)
        expect(contrast('#C8F542', '#000000')).toBeGreaterThanOrEqual(4.5)
    })
})

import {describe, it, expect} from 'vitest'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const page = fs.readFileSync(path.join(root, 'public/design.html'), 'utf8')
const brand = fs.readFileSync(path.join(root, 'src/sass/brand.scss'), 'utf8')
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))

// the token value as written in brand.scss (:root block), e.g. --brand-primary: #C8F542;
const token = name => {
    const m = brand.match(new RegExp('--' + name + ':\\s*([^;]+);'))
    return m ? m[1].trim() : null
}
const hex = c => [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16))
const lum = rgb => {
    const a = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}
const ratio = (a, b) => {
    const x = lum(a), y = lum(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe('design page', ()=>{
    it('declares its language and a unique title and description', ()=>{
        expect(page).toMatch(/<html lang="en"/)
        const title = page.match(/<title>([^<]+)<\/title>/)[1]
        expect(title.length).toBeGreaterThanOrEqual(10)
        expect(title.length).toBeLessThanOrEqual(70)
        const desc = page.match(/<meta name="description" content="([^"]+)"/)[1]
        expect(desc.length).toBeGreaterThanOrEqual(50)
        expect(desc.length).toBeLessThanOrEqual(160)
    })

    it('has a canonical URL, Open Graph tags and structured data', ()=>{
        expect(page).toMatch(/<link rel="canonical" href="https:\/\/www\.hooktv\.online\/design">/)
        expect(page).toMatch(/property="og:title"/)
        expect(page).toMatch(/property="og:description"/)
        expect(page).toMatch(/application\/ld\+json/)
    })

    it('has exactly one h1 and never skips a heading level', ()=>{
        const levels = [...page.matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1])
        expect(levels.filter(l => l === 1)).toHaveLength(1)
        levels.reduce((prev, cur) => {
            expect(cur - prev, 'heading jump').toBeLessThanOrEqual(1)
            return cur
        }, 0)
    })

    it('links to a skip target that exists', ()=>{
        expect(page).toMatch(/href="#main"/)
        expect(page).toMatch(/<main id="main">/)
    })

    it('every image has alt text', ()=>{
        [...page.matchAll(/<img\b[^>]*>/g)].forEach(m => expect(m[0]).toMatch(/\salt="/))
    })

    it('quotes the same token values as src/sass/brand.scss', ()=>{
        const pairs = {'brand-primary': '#C8F542', 'brand-on-primary': '#0B0F00', 'brand-background': '#000', 'surface-1': '#121214', 'surface-2': '#1C1C1F'}
        Object.keys(pairs).forEach(name => {
            expect(token(name), name).toBe(pairs[name])
            expect(page, name).toContain(`--${name}: ${pairs[name]}`)
        })
    })

    it('meets WCAG AA contrast for each text pair it documents', ()=>{
        const black = hex('000000'), primary = hex('C8F542'), onPrimary = hex('0B0F00'), surface2 = hex('1C1C1F')
        const secondary = [158, 158, 158] // rgba(255,255,255,.62) over black
        const muted = hex('98989D')
        expect(ratio(hex('FFFFFF'), black)).toBeGreaterThanOrEqual(4.5)
        expect(ratio(secondary, black)).toBeGreaterThanOrEqual(4.5)
        expect(ratio(muted, black)).toBeGreaterThanOrEqual(4.5)
        expect(ratio(muted, surface2)).toBeGreaterThanOrEqual(4.5)
        expect(ratio(onPrimary, primary)).toBeGreaterThanOrEqual(4.5)
        expect(ratio(primary, black)).toBeGreaterThanOrEqual(3)  // focus ring: non-text contrast
    })

    it('is routed by vercel.json', ()=>{
        expect(vercel.rewrites.some(r => r.source === '/design' && r.destination === '/design.html')).toBe(true)
    })
})

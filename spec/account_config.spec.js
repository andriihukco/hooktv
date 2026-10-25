import {expect, test} from 'vitest'
import fs from 'node:fs'

test('Supabase keys are declared with no default values', () => {
    const src = fs.readFileSync('src/app.js', 'utf8')
    expect(src).toMatch(/supabase_url:\s*undefined/)
    expect(src).toMatch(/supabase_anon_key:\s*undefined/)
})

test('accounts and sync turn on only when the Supabase project is configured', () => {
    const src = fs.readFileSync('src/app.js', 'utf8')
    expect(src).toMatch(/const supa_ready = Boolean\(window\.lampa_settings\.supabase_url && window\.lampa_settings\.supabase_anon_key\)/)
    expect(src).toMatch(/window\.lampa_settings\.account_use\s*=\s*supa_ready/)
    expect(src).toMatch(/window\.lampa_settings\.account_sync\s*=\s*supa_ready/)
})

import {expect, test} from 'vitest'
import fs from 'node:fs'

test('no CUB account endpoints remain in src/core/account', () => {
    const files = ['api.js', 'account.js', 'bookmarks.js', 'timeline.js', 'profile.js', 'panel.js'].map(f => fs.readFileSync('src/core/account/' + f, 'utf8'))

    for (const src of files) {
        expect(src).not.toMatch(/Api\.load\('(bookmarks|timeline|profiles|users|device)\//)
        expect(src).not.toMatch(/\$\.ajax\(/)
    }
})

test('backup module is removed', () => {
    expect(fs.existsSync('src/core/account/backup.js')).toBe(false)
})

test('watch progress is pushed to watch_history, not the CUB socket', () => {
    const src = fs.readFileSync('src/interaction/timeline.js', 'utf8')
    expect(src).not.toMatch(/Socket\.send\('timeline'/)
    expect(src).toMatch(/Account\.Timeline\.push\(params\)/)
})

// Reads the agent state from this repo: the task ledgers (.superpowers/sdd) and the git worktrees.
// Shared by the local server (server.js) and the publisher (push.js). Read-only.
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.resolve(__dirname, '../..')
const TAIL = 6

/**
 * Runs git and returns its trimmed stdout, or '' when it fails (a worktree may be gone)
 * @param {string[]} args - git arguments
 * @param {string} cwd - directory to run in
 * @returns {string}
 */
function git(args, cwd = ROOT){
    try {
        return execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim()
    } catch(e){
        return ''
    }
}

/**
 * One ledger per plan folder: its last progress lines and a status read from them.
 * A ledger that says PAUSED is waiting on a human; otherwise the last line decides.
 * @returns {Array<{name: string, status: string, tail: string[]}>}
 */
function ledgers(){
    const dir = path.join(ROOT, '.superpowers/sdd')

    if(!fs.existsSync(dir)) return []

    return fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, 'progress.md'))).sort().map(name => {
        const lines = fs.readFileSync(path.join(dir, name, 'progress.md'), 'utf8').split('\n').filter(Boolean)
        const tail = lines.slice(-TAIL)
        const last = tail[tail.length - 1] || ''

        let status = 'active'
        if(/PAUSED/.test(lines.join('\n'))) status = 'paused'
        else if(/DONE|PASS|complete/i.test(last)) status = 'done'

        return {name, status, tail}
    })
}

/**
 * Every git worktree: where it is, which branch, how many files are changed, and its last commit.
 * @returns {Array<{path: string, branch: string, changed: number, last: string}>}
 */
function worktrees(){
    const blocks = git(['worktree', 'list', '--porcelain']).split('\n\n').filter(Boolean)

    return blocks.map(block => {
        const field = key => (block.split('\n').find(l => l.startsWith(key + ' ')) || '').slice(key.length + 1)
        const dir = field('worktree')
        const branch = field('branch').replace('refs/heads/', '') || '(detached)'
        const changed = git(['status', '--porcelain'], dir).split('\n').filter(Boolean).length
        const last = git(['log', '-1', '--format=%h %s'], dir)

        return {path: path.relative(ROOT, dir) || '.', branch, changed, last}
    })
}

/**
 * The whole snapshot the admin page shows
 * @returns {{ledgers: Array, worktrees: Array, at: string}}
 */
function snapshot(){
    return {ledgers: ledgers(), worktrees: worktrees(), at: new Date().toISOString()}
}

module.exports = {snapshot}

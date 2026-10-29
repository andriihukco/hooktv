// Builds releases.json for the web release: the commits on this branch that an open tab
// shows as "what's new" when it is older than the deploy. Every push to main is a deploy,
// so every commit there is one release.
const { execFileSync } = require('child_process')
const fs = require('fs')

const LIMIT = 30
const SEP = '\x1f'

// commits that nobody needs to read about in an update
const HIDDEN = /^(wip|merge|chore|ci|build|test|tests|docs?|style|refactor)(\(.*?\))?(:|\s|$)/i

/**
 * "Watch: torrent fallback when no online source plays" -> area "Watch", title "Torrent fallback when…"
 * @param {string} subject - commit subject
 * @returns {{area: string, title: string}}
 */
function parse(subject){
    let text = subject.trim()
    let match = /^([^:]{1,24}):\s+(.+)$/.exec(text)

    let area = match ? match[1] : ''
    let title = match ? match[2] : text

    return {
        area,
        title: title.charAt(0).toUpperCase() + title.slice(1)
    }
}

/**
 * @param {string[]} args - git arguments
 * @returns {string} trimmed stdout
 */
function git(args){
    return execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim()
}

/**
 * The newest user-facing commits, newest first.
 * @returns {Array<{id: string, date: string, area: string, title: string}>}
 */
function commits(){
    let out = git(['log', '--no-merges', '-n' + LIMIT, '--format=%H' + SEP + '%cI' + SEP + '%s'])

    return out.split('\n').filter(Boolean).map(line=>{
        let [id, date, subject] = line.split(SEP)

        return Object.assign({id: id.slice(0, 12), date}, parse(subject))
    }).filter(item=>!HIDDEN.test(item.title) && !HIDDEN.test(item.area + ': ' + item.title))
}

/**
 * Writes releases.json. Without git (for example a source archive) the file is empty
 * and the app shows nothing.
 * @param {string} folder - the built web folder
 */
function write(folder){
    let releases = []

    try{
        releases = commits()
    }
    catch(e){
        console.warn('releases.json: no git history, writing an empty list')
    }

    fs.writeFileSync(folder + '/releases.json', JSON.stringify({releases}, null, 2))

    return releases
}

module.exports = {parse, commits, write}

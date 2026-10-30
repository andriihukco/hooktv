// Publishes the agent snapshot to Supabase so /admin on hooktv.online can show it.
// Run: node scripts/agent-admin/push.js        (writes the snapshot)
//      node scripts/agent-admin/push.js --dry  (prints a summary, sends nothing)
// Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local. The key is never printed.
const fs = require('fs')
const path = require('path')
const {snapshot} = require('./collect.js')

const ROW = 'main'

/**
 * Reads KEY=VALUE pairs from .env.local without printing them
 * @returns {object}
 */
function env(){
    const file = path.resolve(__dirname, '../../.env.local')

    if(!fs.existsSync(file)) return {}

    return Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
}

async function main(){
    const data = {...snapshot(), roster: JSON.parse(fs.readFileSync(path.join(__dirname, 'roster.json'), 'utf8'))}
    const summary = `${data.ledgers.length} ledgers, ${data.worktrees.length} worktrees`

    if(process.argv.includes('--dry')){
        console.log(`Dry run: ${summary}. Nothing sent.`)
        return
    }

    const {SUPABASE_URL: base, SUPABASE_SERVICE_KEY: key} = {...env(), ...process.env}

    if(!base || !key){
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
        process.exit(1)
    }

    const res = await fetch(`${base}/rest/v1/agent_snapshots?on_conflict=id`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify([{id: ROW, payload: data, updated_at: new Date().toISOString()}])
    })

    if(!res.ok){
        console.error(`Publish failed: HTTP ${res.status}`)
        process.exit(1)
    }

    console.log(`Published: ${summary}`)
}

main()

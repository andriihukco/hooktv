/**
 * GET /api/admin/board: the agent board (teams, columns, skills) for a signed-in admin.
 * Reads the roster and ledgers that scripts/agent-admin/push.js stored in the snapshot row.
 * Needs a session cookie from /api/admin/login. It does not send WWW-Authenticate, so no browser dialog pops up.
 */

const {verify} = require('./session.js')
const {groupByTeam} = require('../../scripts/agent-admin/roster.js')

const ROW = 'main'

module.exports = async function handler(req, res){
    if(!verify(req, process.env.ADMIN_PASSWORD)){
        res.status(401).json({error: 'Unauthorized'})
        return
    }

    const base = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    if(!base || !key){
        res.status(503).json({error: 'Supabase is not configured'})
        return
    }

    let row

    try {
        const r = await fetch(`${base}/rest/v1/agent_snapshots?id=eq.${ROW}&select=payload,updated_at`, {
            headers: {apikey: key, Authorization: `Bearer ${key}`},
            cache: 'no-store'
        })

        if(!r.ok) throw new Error('HTTP ' + r.status)

        ;[row] = await r.json()
    } catch(e){
        res.status(502).json({error: 'Snapshot read failed'})
        return
    }

    const payload = row ? row.payload : {}

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({
        teams: groupByTeam(payload.roster || {}, payload.ledgers || []),
        pushed_at: row ? row.updated_at : null
    })
}

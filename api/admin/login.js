/**
 * POST /api/admin/login with JSON {password}: sets the admin session cookie.
 * Five wrong passwords lock login for 15 minutes. The counter is a row in agent_snapshots (id admin_login),
 * so it holds across serverless instances. Needs SUPABASE_URL, SUPABASE_SERVICE_KEY and ADMIN_PASSWORD.
 */

const {samePassword} = require('./agents.js')
const {issue, cookie} = require('./session.js')

const ROW = 'admin_login'
const MAX_FAILS = 5
const LOCK_MS = 15 * 60 * 1000

/**
 * Reads the failed-attempt counter from Supabase
 * @param {string} base - SUPABASE_URL
 * @param {string} key - service key
 * @returns {Promise<{fails: number, until: number}>}
 */
async function readState(base, key){
    const r = await fetch(`${base}/rest/v1/agent_snapshots?id=eq.${ROW}&select=payload`, {
        headers: {apikey: key, Authorization: `Bearer ${key}`},
        cache: 'no-store'
    })

    if(!r.ok) throw new Error('HTTP ' + r.status)

    const [row] = await r.json()

    return row ? row.payload : {fails: 0, until: 0}
}

/**
 * Stores the failed-attempt counter in Supabase
 * @param {string} base - SUPABASE_URL
 * @param {string} key - service key
 * @param {{fails: number, until: number}} payload
 * @returns {Promise<void>}
 */
async function writeState(base, key, payload){
    const r = await fetch(`${base}/rest/v1/agent_snapshots?on_conflict=id`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify([{id: ROW, payload, updated_at: new Date().toISOString()}]),
        cache: 'no-store'
    })

    if(!r.ok) throw new Error('HTTP ' + r.status)
}

module.exports = async function handler(req, res){
    if(req.method != 'POST'){
        res.setHeader('Allow', 'POST')
        res.status(405).json({error: 'Method not allowed'})
        return
    }

    const expected = process.env.ADMIN_PASSWORD
    const base = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    // Without Supabase the lockout cannot be kept, so login stays closed
    if(!expected || !base || !key){
        res.status(503).json({error: 'Admin login is not configured'})
        return
    }

    const body = typeof req.body == 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const given = typeof body.password == 'string' ? body.password : ''

    let state

    try {
        state = await readState(base, key)
    } catch(e){
        res.status(502).json({error: 'Login check failed'})
        return
    }

    if(state.until > Date.now()){
        res.status(429).json({error: 'Locked'})
        return
    }

    if(!samePassword(given, expected)){
        const fails = state.fails + 1
        const locked = fails >= MAX_FAILS

        // The failure must be recorded, or the lockout is not real: fail closed if the write breaks
        try {
            await writeState(base, key, {fails: locked ? 0 : fails, until: locked ? Date.now() + LOCK_MS : 0})
        } catch(e){
            res.status(503).json({error: 'Login check failed'})
            return
        }

        res.status(locked ? 429 : 401).json({error: locked ? 'Locked' : 'Wrong password'})
        return
    }

    try {
        await writeState(base, key, {fails: 0, until: 0})
    } catch(e){
        // A successful login still goes through; only the counter reset failed
    }

    const session = issue(expected)

    res.setHeader('Set-Cookie', cookie(session.value, session.maxAge))
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ok: true})
}

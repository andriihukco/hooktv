/**
 * GET /api/admin/agents: the agent snapshot pushed from the owner's machine (scripts/agent-admin/push.js).
 * Requires HTTP Basic auth: any username, password = ADMIN_PASSWORD (Vercel project settings).
 * Needs SUPABASE_URL and SUPABASE_SERVICE_KEY (server only, never sent to the browser).
 */

const crypto = require('crypto')

const ROW = 'main'

/**
 * Compares two strings in constant time, so the password cannot be guessed by timing
 * @param {string} given - what the client sent
 * @param {string} expected - the configured password
 * @returns {boolean}
 */
function samePassword(given, expected){
    const a = crypto.createHash('sha256').update(String(given)).digest()
    const b = crypto.createHash('sha256').update(String(expected)).digest()

    return crypto.timingSafeEqual(a, b) && given === expected
}

/**
 * Reads the password from a Basic auth header ("Basic base64(user:password)")
 * @param {string} header - the Authorization header
 * @returns {string|null}
 */
function passwordFrom(header){
    const m = /^Basic\s+(.+)$/i.exec(header || '')

    if(!m) return null

    const decoded = Buffer.from(m[1], 'base64').toString('utf8')
    const at = decoded.indexOf(':')

    return at < 0 ? null : decoded.slice(at + 1)
}

module.exports = async function handler(req, res){
    const expected = process.env.ADMIN_PASSWORD

    if(!expected){
        res.status(503).json({error: 'ADMIN_PASSWORD is not set'})
        return
    }

    const given = passwordFrom(req.headers.authorization)

    if(given === null || !samePassword(given, expected)){
        res.setHeader('WWW-Authenticate', 'Basic realm="HOOK TV admin", charset="UTF-8"')
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

    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(row ? {...row.payload, pushed_at: row.updated_at} : {ledgers: [], worktrees: [], at: null, pushed_at: null})
}

module.exports.passwordFrom = passwordFrom
module.exports.samePassword = samePassword

const {verify} = require('./session')
const {adminCatalog, parseSystemConfig, publicConfig, readStoredConfig, saveStoredConfig} = require('../_system-config')

function rejectOrigin(req, res){
    const origin = req.headers.origin
    const host = req.headers['x-forwarded-host'] || req.headers.host

    if(!origin) return false

    let originHost

    try {
        originHost = new URL(origin).host
    } catch(error){
        res.status(403).json({error: 'Invalid request origin'})
        return true
    }

    if(originHost !== host){
        res.status(403).json({error: 'Cross-origin request rejected'})
        return true
    }

    return false
}

function sendUnavailable(res){
    res.setHeader('Cache-Control', 'no-store')
    res.status(503).json({error: 'Admin storage is not configured'})
}

module.exports = async function handler(req, res){
    res.setHeader('Cache-Control', 'no-store')

    if(!verify(req, process.env.ADMIN_PASSWORD)){
        res.status(401).json({error: 'Unauthorized'})
        return
    }

    const base = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    if(!base || !key){
        sendUnavailable(res)
        return
    }

    if(req.method === 'GET'){
        try {
            const stored = await readStoredConfig(base, key)

            res.status(200).json({
                config: publicConfig(stored.config, stored.revision, stored.updatedAt),
                catalog: adminCatalog()
            })
        } catch(error){
            console.error('Admin system config read failed:', error.message)
            res.status(502).json({error: 'Could not load system configuration'})
        }
        return
    }

    if(req.method !== 'PUT'){
        res.setHeader('Allow', 'GET, PUT')
        res.status(405).json({error: 'Method not allowed'})
        return
    }

    if(rejectOrigin(req, res)) return

    let body

    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
    } catch(error){
        res.status(400).json({error: 'Request body must be valid JSON'})
        return
    }

    if(!body || !Number.isInteger(body.expectedRevision) || body.expectedRevision < 0){
        res.status(400).json({error: 'expectedRevision must be a non-negative integer'})
        return
    }

    let config

    try {
        config = parseSystemConfig(body.config)
    } catch(error){
        res.status(400).json({error: error.message})
        return
    }

    try {
        const stored = await saveStoredConfig(base, key, body.expectedRevision, config)

        if(!stored){
            res.status(409).json({error: 'System configuration changed. Reload before saving again.'})
            return
        }

        res.status(200).json({config: publicConfig(stored.config, stored.revision, stored.updatedAt)})
    } catch(error){
        console.error('Admin system config save failed:', error.message)
        res.status(502).json({error: 'Could not save system configuration. Apply the system config migration and retry.'})
    }
}

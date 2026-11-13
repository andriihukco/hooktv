const {DEFAULT_CONFIG, parseSystemConfig, publicConfig, readStoredConfig} = require('./_system-config')

module.exports = async function handler(req, res){
    if(req.method !== 'GET'){
        res.setHeader('Allow', 'GET')
        res.status(405).json({error: 'Method not allowed'})
        return
    }

    const base = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY

    try {
        const stored = base && key
            ? await readStoredConfig(base, key)
            : {config: parseSystemConfig(DEFAULT_CONFIG), revision: 0, updatedAt: null}

        res.setHeader('Cache-Control', 'no-store')
        res.status(200).json(publicConfig(stored.config, stored.revision, stored.updatedAt))
    } catch(error){
        console.error('System config read failed:', error.message)
        res.setHeader('Cache-Control', 'no-store')
        res.status(502).json({error: 'System configuration is temporarily unavailable'})
    }
}

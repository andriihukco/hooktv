const BASE_CONFIG = require('../config/hooktv-system.json')
const PLUGIN_CATALOG = require('../config/plugin-catalog.json')
const EXTERNAL_PLUGIN_CATALOG = require('../config/external-plugin-catalog.json')
const ONLINE_SOURCES = require('../config/online-sources.json')
const THIRD_PARTY_SOURCES = require('../docs/plugins/sources.json')
const SOURCE_AUDIT = require('../docs/plugins/audit-results.json')
const SOURCE_FUNCTIONALITY = require('../docs/plugins/functionality.json')
const PLUGIN_REGISTRY = require('../plugins/registry.json')
const DEFAULT_CONFIG = {
    ...BASE_CONFIG,
    externalPlugins: Object.fromEntries(EXTERNAL_PLUGIN_CATALOG.map(plugin=>[plugin.url, false]))
}

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const pluginIds = new Set(PLUGIN_CATALOG.map(plugin => plugin.id))
const externalPluginUrls = new Set(EXTERNAL_PLUGIN_CATALOG.map(plugin => plugin.url))
const sourceKeys = new Set(ONLINE_SOURCES.map(source => source.key))
const featureKeys = new Set(Object.keys(DEFAULT_CONFIG.flags))

function parseSystemConfig(value){
    if(!isRecord(value) || value.schema !== DEFAULT_CONFIG.schema) throw new Error('Unsupported system config')

    const config = {
        schema: DEFAULT_CONFIG.schema,
        flags: {...DEFAULT_CONFIG.flags},
        plugins: {...DEFAULT_CONFIG.plugins},
        onlineSourceOverrides: {},
        externalPlugins: {...DEFAULT_CONFIG.externalPlugins}
    }

    for(const [key, enabled] of Object.entries(value.flags || {})){
        if(!featureKeys.has(key) || typeof enabled !== 'boolean') throw new Error('Invalid system flag: ' + key)
        config.flags[key] = enabled
    }

    for(const [id, enabled] of Object.entries(value.plugins || {})){
        if(!pluginIds.has(id) || typeof enabled !== 'boolean') throw new Error('Invalid system plugin: ' + id)
        config.plugins[id] = enabled
    }

    for(const [key, enabled] of Object.entries(value.onlineSourceOverrides || {})){
        if(!sourceKeys.has(key) || typeof enabled !== 'boolean') throw new Error('Invalid online source: ' + key)
        config.onlineSourceOverrides[key] = enabled
    }

    if(value.externalPlugins !== undefined && !isRecord(value.externalPlugins)) throw new Error('Invalid external plugins')

    for(const [url, enabled] of Object.entries(value.externalPlugins || {})){
        if(!externalPluginUrls.has(url) || typeof enabled !== 'boolean') throw new Error('Invalid external plugin: ' + url)
        config.externalPlugins[url] = enabled
    }

    PLUGIN_CATALOG.forEach(plugin=>{
        if(plugin.requiresFlag && config.plugins[plugin.id] && !config.flags[plugin.requiresFlag]){
            throw new Error(plugin.name + ' requires the ' + plugin.requiresFlag + ' feature')
        }
    })

    return config
}

function adminCatalog(){
    const auditByUrl = new Map(SOURCE_AUDIT.rows.map(row=>[row.url, row]))
    const excludedByUrl = new Map(PLUGIN_REGISTRY.excluded.map(row=>[row.url, row]))
    const analysisByUrl = new Map(SOURCE_FUNCTIONALITY.map(row=>[row.url, row]))
    const attachReview = source=>({
        ...source,
        audit: auditByUrl.get(source.url) || null,
        assessment: excludedByUrl.get(source.url) || null,
        functionality: analysisByUrl.get(source.url) || null
    })

    return {
        plugins: PLUGIN_CATALOG,
        onlineSources: ONLINE_SOURCES,
        externalPlugins: EXTERNAL_PLUGIN_CATALOG.map(attachReview),
        thirdPartySources: THIRD_PARTY_SOURCES.map(attachReview)
    }
}

function publicConfig(config, revision, updatedAt){
    return {
        schema: config.schema,
        revision,
        flags: config.flags,
        plugins: config.plugins,
        externalPlugins: config.externalPlugins,
        onlineSourceOverrides: config.onlineSourceOverrides,
        updatedAt
    }
}

async function readStoredConfig(base, key){
    const response = await fetch(`${base}/rest/v1/system_config?id=eq.current&select=revision,config,updated_at`, {
        headers: {apikey: key, Authorization: `Bearer ${key}`},
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
    })

    if(!response.ok) throw new Error('System config read failed: HTTP ' + response.status)

    const [row] = await response.json()

    if(!row) return {config: parseSystemConfig(DEFAULT_CONFIG), revision: 0, updatedAt: null}

    return {
        config: parseSystemConfig(row.config),
        revision: Number(row.revision),
        updatedAt: row.updated_at
    }
}

async function saveStoredConfig(base, key, expectedRevision, config){
    const response = await fetch(`${base}/rest/v1/rpc/save_hooktv_system_config`, {
        method: 'POST',
        headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({p_expected_revision: expectedRevision, p_config: config}),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
    })

    if(!response.ok) throw new Error('System config save failed: HTTP ' + response.status)

    const rows = await response.json()
    const row = Array.isArray(rows) ? rows[0] : rows

    if(!row) return null

    return {
        config: parseSystemConfig(row.config),
        revision: Number(row.revision),
        updatedAt: row.updated_at
    }
}

module.exports = {
    DEFAULT_CONFIG,
    adminCatalog,
    parseSystemConfig,
    publicConfig,
    readStoredConfig,
    saveStoredConfig
}

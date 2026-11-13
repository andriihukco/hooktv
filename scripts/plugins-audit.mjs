// Static audit of third-party Lampa plugin URLs.
// Fetches each script as DATA, checks it compiles (vm.Script never runs it),
// and records licence markers, Lampa API usage, hosts and obfuscation signals.
// Usage: node scripts/plugins-audit.mjs [sources.json] [out.json]
import fs from 'fs'
import vm from 'vm'
import crypto from 'crypto'

const input = process.argv[2] || 'docs/plugins/sources.json'
const output = process.argv[3] || 'docs/plugins/audit-results.json'
const sources = JSON.parse(fs.readFileSync(input, 'utf8'))

const count = (re, text) => (text.match(re) || []).length
const UI_APIS = ['SettingsApi.addComponent', 'SettingsApi.addParam', 'Activity.push', 'Router.call', 'Modal.open', 'Select.show', 'Component.add', 'ContentRows.add', 'Player.play']
const SCRIPT_EXECUTION = /\beval\s*\(|\bnew\s+Function\s*\(|createElement\s*\(\s*['"]script|putScriptAsync|importScripts\s*\(|\.getScript\s*\(|document\.write\s*\(/gi
const STORAGE_KEY = /(?:Lampa\.)?Storage\.(?:get|set|field)\s*\(\s*['"]([^'"]+)['"]/g
const LIFECYCLE = /(?:Lampa\.)?(?:Listener|Settings\.listener)\.follow\s*\(\s*['"]([^'"]+)['"]/g

function values(re, body){
    return [...body.matchAll(re)].map(match=>match[1]).filter(Boolean)
}

async function fetchWithRetry(url) {
    for (let attempt = 1; ; attempt++) {
        try { return await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) }) }
        catch (e) { if (attempt >= 2) throw e }
    }
}

async function auditOne({ name, url }) {
    const row = {
        name, url, http: url.startsWith('http://'), status: null, contentType: null,
        bytes: 0, sha256: null, looksLikeJavaScript: false, hasLampaIntegration: false, compiles: false,
        validPluginResponse: false, compileError: null, lampaApi: {}, uiApis: {}, failureSignals: {},
        lifecycleHooks: [], storageKeys: [], externalScriptExecution: 0,
        licenceMarkers: [], hosts: [], obfuscationHexIds: 0, avgLineLength: 0, error: null
    }

    try {
        const res = await fetchWithRetry(url)
        row.status = res.status
        row.contentType = res.headers.get('content-type')
        const body = await res.text()
        row.bytes = Buffer.byteLength(body)
        row.sha256 = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16)
        const lines = body.split('\n')
        row.avgLineLength = Math.round(body.length / Math.max(lines.length, 1))
        const contentType = (row.contentType || '').toLowerCase()
        const html = /^\s*(?:<!doctype\s+html|<html\b)/i.test(body)
        row.looksLikeJavaScript = !html && body.trim().length > 0 && (
            /javascript|ecmascript/.test(contentType) || /\.js(?:$|[?#])/.test(url) || contentType === 'text/plain'
        )

        try { new vm.Script(body, { filename: name }); row.compiles = true }
        catch (e) { row.compileError = e.message.slice(0, 120) }

        row.hasLampaIntegration = /\bLampa\s*\.|\bwindow\s*\.\s*Lampa\b/.test(body)
        row.validPluginResponse = res.ok && row.looksLikeJavaScript && row.compiles && row.hasLampaIntegration
        row.failureSignals = {
            tryBlocks: count(/\btry\s*\{/g, body),
            catchBlocks: count(/\bcatch\s*\(/g, body),
            promiseCatchHandlers: count(/\.catch\s*\(/g, body),
            errorCallbacks: count(/\bon(?:error|fail)\s*[:=(]/gi, body)
        }
        for (const m of body.matchAll(/Lampa\.([A-Za-z_]+)/g)) row.lampaApi[m[1]] = (row.lampaApi[m[1]] || 0) + 1
        UI_APIS.forEach(api=>{
            const name = api.slice(api.indexOf('.') + 1)
            const amount = count(new RegExp('Lampa\\.' + api.replace('.', '\\.') + '\\s*\\(', 'g'), body)
            if(amount) row.uiApis[api] = amount
        })
        row.lifecycleHooks = [...new Set(values(LIFECYCLE, body))]
        row.storageKeys = [...new Set(values(STORAGE_KEY, body))].slice(0, 80)
        row.externalScriptExecution = count(SCRIPT_EXECUTION, body)
        row.licenceMarkers = [...new Set([...body.matchAll(/(licen[cs]e|copyright|©|\bMIT\b|\bGPL\b|apache)/gi)].map(m => m[0].toLowerCase()))]
        row.hosts = [...new Set([...body.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map(m => m[1].toLowerCase()))].filter(h => h !== 'www.w3.org').slice(0, 12)
        row.obfuscationHexIds = count(/_0x[a-f0-9]{4,}/g, body)
    } catch (e) {
        row.error = e.name === 'TimeoutError' ? 'timeout' : e.message
    }

    return row
}

if(!Array.isArray(sources) || sources.some(source=>!source || typeof source.name !== 'string' || typeof source.url !== 'string')){
    throw new Error('Source registry must be an array of {name, url} records')
}

const rows = []
for(let i = 0; i < sources.length; i += 4){
    rows.push(...await Promise.all(sources.slice(i, i + 4).map(auditOne)))
}

fs.writeFileSync(output, JSON.stringify({ generated: new Date().toISOString(), rows }, null, 2))
for (const r of rows) {
    console.log([r.name, r.status ?? r.error, r.bytes, r.validPluginResponse ? 'valid JS' : 'INVALID RESPONSE', r.http ? 'http' : 'https', `hexIds=${r.obfuscationHexIds}`].join(' | '))
}

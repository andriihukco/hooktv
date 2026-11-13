import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createRequire} from 'node:module'

const require = createRequire(import.meta.url)
const adminConfig = require('../api/admin/system-config.js')
const {issue} = require('../api/admin/session.js')
const ENV_KEYS = ['ADMIN_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
let originalEnv

function response(){
    return {
        headers: {},
        statusCode: null,
        body: null,
        setHeader(name, value){ this.headers[name] = value },
        status(code){ this.statusCode = code; return this },
        json(body){ this.body = body; return this }
    }
}

function authorizedRequest(overrides = {}){
    const session = issue('system-test-password')

    return {
        method: 'GET',
        headers: {cookie: 'admin_session=' + encodeURIComponent(session.value), host: 'hooktv.test'},
        ...overrides
    }
}

beforeEach(()=>{
    originalEnv = Object.fromEntries(ENV_KEYS.map(key=>[key, process.env[key]]))
    process.env.ADMIN_PASSWORD = 'system-test-password'
    process.env.SUPABASE_URL = 'https://database.example'
    process.env.SUPABASE_SERVICE_KEY = 'service-role-test-key'
})

afterEach(()=>{
    ENV_KEYS.forEach(key=>{
        if(originalEnv[key] === undefined) delete process.env[key]
        else process.env[key] = originalEnv[key]
    })
    vi.unstubAllGlobals()
})

it('requires an authenticated admin session', async ()=>{
    const res = response()

    await adminConfig({method: 'GET', headers: {}}, res)

    expect(res.statusCode).toBe(401)
})

it('rejects cross-origin writes before calling Supabase', async ()=>{
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const req = authorizedRequest({
        method: 'PUT',
        headers: {...authorizedRequest().headers, origin: 'https://other.example'},
        body: {expectedRevision: 0, config: {schema: 1}}
    })
    const res = response()

    await adminConfig(req, res)

    expect(res.statusCode).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
})

it('returns the admin catalog and persists a valid revisioned update', async ()=>{
    const savedConfig = {
        schema: 1,
        flags: {movies: false},
        plugins: {collections: true},
        onlineSourceOverrides: {}
    }
    const fetchMock = vi.fn()
        .mockResolvedValueOnce({ok: true, json: async()=>[]})
        .mockResolvedValueOnce({ok: true, json: async()=>[{
            config: {...savedConfig, flags: {...require('../config/hooktv-system.json').flags, movies: false}},
            revision: 1,
            updated_at: '2026-11-13T00:00:00Z'
        }]})
    vi.stubGlobal('fetch', fetchMock)

    const getResponse = response()
    await adminConfig(authorizedRequest(), getResponse)

    expect(getResponse.statusCode).toBe(200)
    expect(getResponse.body.catalog.plugins).toHaveLength(19)
    expect(getResponse.body.catalog.thirdPartySources).toHaveLength(24)

    const req = authorizedRequest({
        method: 'PUT',
        headers: {...authorizedRequest().headers, origin: 'https://hooktv.test'},
        body: {expectedRevision: 0, config: savedConfig}
    })
    const putResponse = response()
    await adminConfig(req, putResponse)

    expect(putResponse.statusCode).toBe(200)
    expect(putResponse.body.config.revision).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).p_expected_revision).toBe(0)
})

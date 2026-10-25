import config from './config.js'

function url(path, query){
    let base = config.url().replace(/\/$/, '')
    let full = path.indexOf('auth/') === 0 ? base + '/' + path : base + '/rest/v1/' + path
    let qs   = query ? new URLSearchParams(query).toString() : ''

    if(qs) full += (full.indexOf('?') > -1 ? '&' : '?') + qs

    return full
}

function fail(res){
    return res.json().catch(()=>({})).then(body=>{
        throw {
            status: res.status,
            code: body.error_code || body.error || body.msg || body.message || 'http_' + res.status,
            message: body.msg || body.error_description || body.message || ''
        }
    })
}

/**
 * Запрос к Supabase REST или Auth
 * @param {string} path - 'bookmarks' для таблицы, 'auth/v1/...' для авторизации
 * @param {object} opts - method, query, body, token, headers
 * @returns {Promise<any>}
 */
export default function request(path, opts = {}){
    let headers = Object.assign({
        apikey: config.anonKey(),
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (opts.token || config.anonKey())
    }, opts.headers)

    return fetch(url(path, opts.query), {
        method: opts.method || 'GET',
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).catch(e=>{
        throw {status: 0, code: 'network', message: e.message}
    }).then(res=> res.ok ? res.json().catch(()=>null) : fail(res))
}

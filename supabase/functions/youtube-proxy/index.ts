// YouTube proxy for the Videos tab. Keeps the Google API key and the OAuth
// client secret on the server, caches public lists to save quota, and forwards
// account calls with the user's own access token.
//
// Secrets (supabase secrets set): YOUTUBE_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

const API = 'https://www.googleapis.com/youtube/v3'
const DEVICE_URL = 'https://oauth2.googleapis.com/device/code'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
const TTL_MS = 15 * 60 * 1000

const KEY = Deno.env.get('YOUTUBE_API_KEY') ?? ''
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-yt-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

const cache = new Map<string, { at: number; data: unknown }>()

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS, 'content-type': 'application/json' }
    })
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.data as T)

    return load().then(data => {
        cache.set(key, { at: Date.now(), data })
        return data
    })
}

// Calls the Data API with the server key, or with the user's token for account data
async function yt(path: string, params: Record<string, string>, token = '') {
    const query = new URLSearchParams(params)
    const headers: Record<string, string> = {}

    if (token) headers.authorization = 'Bearer ' + token
    else query.set('key', KEY)

    const res = await fetch(`${API}/${path}?${query}`, { headers })
    const body = await res.json()

    if (!res.ok) throw new Error(body?.error?.message || 'youtube ' + res.status)

    return body
}

// PT1H2M3S -> 1:02:03
function duration(iso = '') {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso)
    if (!m) return ''

    const pad = (n: number) => String(n).padStart(2, '0')
    const h = Number(m[1] || 0), min = Number(m[2] || 0), sec = Number(m[3] || 0)

    return h ? `${h}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`
}

function normalize(item: any) {
    const snippet = item.snippet || {}
    const thumbs = snippet.thumbnails || {}

    return {
        id: typeof item.id === 'string' ? item.id : item.id?.videoId || '',
        title: snippet.title || '',
        channel: snippet.channelTitle || '',
        channel_id: snippet.channelId || '',
        published: snippet.publishedAt || '',
        thumb: (thumbs.medium || thumbs.high || thumbs.default || {}).url || '',
        duration: duration(item.contentDetails?.duration),
        views: Number(item.statistics?.viewCount || 0)
    }
}

// Fills duration and views for video ids, 50 per request
async function details(ids: string[]) {
    const map = new Map<string, any>()

    for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50).join(',')
        const body = await yt('videos', { part: 'snippet,contentDetails,statistics', id: chunk, maxResults: '50' })

        body.items.forEach((item: any) => map.set(item.id, normalize(item)))
    }

    return map
}

function trending(region: string, category: string) {
    return cached(`trending:${region}:${category}`, async () => {
        const params: Record<string, string> = {
            part: 'snippet,contentDetails,statistics',
            chart: 'mostPopular',
            regionCode: region,
            maxResults: '24'
        }
        if (category) params.videoCategoryId = category

        const body = await yt('videos', params)

        return { items: body.items.map(normalize) }
    })
}

function search(query: string, region: string) {
    return cached(`search:${region}:${query}`, async () => {
        const body = await yt('search', {
            part: 'snippet',
            type: 'video',
            q: query,
            regionCode: region,
            maxResults: '24',
            safeSearch: 'moderate'
        })

        const ids = body.items.map((item: any) => item.id?.videoId).filter(Boolean)
        const map = await details(ids)

        return { items: ids.map((id: string) => map.get(id)).filter(Boolean) }
    })
}

// Latest uploads from subscribed channels, newest first (one playlist call per channel)
async function feed(token: string) {
    const subs = await yt('subscriptions', { part: 'snippet', mine: 'true', maxResults: '30' }, token)
    const ids: string[] = []

    await Promise.all(subs.items.map(async (sub: any) => {
        const channel = sub.snippet?.resourceId?.channelId
        if (!channel) return

        // The uploads playlist id is the channel id with UC replaced by UU
        const list = await yt('playlistItems', {
            part: 'snippet',
            playlistId: 'UU' + channel.slice(2),
            maxResults: '4'
        }, token)

        list.items.forEach((item: any) => ids.push(item.snippet.resourceId.videoId))
    }))

    const map = await details([...new Set(ids)])
    const items = [...map.values()].sort((a, b) => b.published.localeCompare(a.published))

    return { items: items.slice(0, 48) }
}

async function me(token: string) {
    const body = await yt('channels', { part: 'snippet', mine: 'true' }, token)
    const channel = body.items?.[0]?.snippet || {}

    return {
        name: channel.title || '',
        avatar: (channel.thumbnails?.default || {}).url || ''
    }
}

async function form(url: string, fields: Record<string, string>) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields)
    })

    return res.json()
}

async function handle(req: Request) {
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.json() : {}
    const params: Record<string, string> = { ...Object.fromEntries(url.searchParams), ...body }
    const action = params.action || ''
    const token = req.headers.get('x-yt-token') || ''
    const region = /^[A-Z]{2}$/.test(params.region || '') ? params.region : 'US'

    if (action === 'trending') {
        const category = /^\d{1,3}$/.test(params.category || '') ? params.category : ''
        return json({ ok: true, ...(await trending(region, category)) })
    }

    if (action === 'search') {
        const query = (params.q || '').trim().slice(0, 100)
        if (!query) return json({ ok: true, items: [] })
        return json({ ok: true, ...(await search(query, region)) })
    }

    if (action === 'feed') return json({ ok: true, ...(await feed(token)) })
    if (action === 'me') return json({ ok: true, ...(await me(token)) })

    if (action === 'device_start') {
        const data = await form(DEVICE_URL, { client_id: CLIENT_ID, scope: SCOPE })
        if (data.error) return json({ ok: false, error: data.error_description || data.error }, 400)

        return json({ ok: true, ...data })
    }

    if (action === 'device_poll') {
        const data = await form(TOKEN_URL, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            device_code: params.device_code || '',
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })

        // Waiting for the user to approve is not an error; slow_down asks for a longer interval
        if (data.error === 'authorization_pending' || data.error === 'slow_down') {
            return json({ ok: true, pending: true, slow: data.error === 'slow_down' })
        }
        if (data.error) return json({ ok: false, error: data.error_description || data.error }, 400)

        return json({ ok: true, access_token: data.access_token, refresh_token: data.refresh_token, expires_in: data.expires_in })
    }

    if (action === 'refresh') {
        const data = await form(TOKEN_URL, {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: params.refresh_token || '',
            grant_type: 'refresh_token'
        })
        if (data.error) return json({ ok: false, error: data.error_description || data.error }, 400)

        return json({ ok: true, access_token: data.access_token, expires_in: data.expires_in })
    }

    return json({ ok: false, error: 'unknown action' }, 400)
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

    try {
        return await handle(req)
    } catch (e) {
        return json({ ok: false, error: (e as Error).message || 'server error' }, 500)
    }
})

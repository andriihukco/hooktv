// YouTube proxy for the Video tab. Trending and search come from public Piped instances,
// so no API key is needed. Account data (subscriptions, profile) uses the user's own
// Google token, and the server keeps the OAuth client secret.
//
// Secrets (supabase secrets set): GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Optional: PIPED_INSTANCES (comma-separated base URLs, tried in order)

import {normalize, normalizeList, pipedGet, Video} from './piped.ts'

const API = 'https://www.googleapis.com/youtube/v3'
const DEVICE_URL = 'https://oauth2.googleapis.com/device/code'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
const TTL_MS = 15 * 60 * 1000

const PIPED = (Deno.env.get('PIPED_INSTANCES') ?? 'https://api.piped.private.coffee,https://pipedapi.adminforge.de')
    .split(',').map(s => s.trim()).filter(Boolean)
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

function trending(region: string) {
    return cached(`trending:${region}`, async () => {
        const list = await pipedGet(PIPED, `/trending?region=${region}`)
        return { items: normalizeList(list).slice(0, 24) }
    })
}

function search(query: string, region: string) {
    return cached(`search:${region}:${query}`, async () => {
        const body = await pipedGet(PIPED, `/search?q=${encodeURIComponent(query)}&filter=videos&region=${region}`)
        return { items: normalizeList(body).slice(0, 24) }
    })
}

// Account calls go to the YouTube Data API with the user's token; no API key is sent
async function yt(path: string, params: Record<string, string>, token: string) {
    const res = await fetch(`${API}/${path}?${new URLSearchParams(params)}`, {
        headers: { authorization: 'Bearer ' + token }
    })
    const body = await res.json()

    if (!res.ok) throw new Error(body?.error?.message || 'youtube ' + res.status)

    return body
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

    const items: Video[] = []
    for (let i = 0; i < ids.length; i += 50) {
        const body = await yt('videos', { part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(',') }, token)
        items.push(...body.items.map(videoFromYouTube))
    }

    items.sort((a, b) => b.published.localeCompare(a.published))

    return { items: items.slice(0, 48) }
}

// Maps a videos.list item from the Data API to the app shape
function videoFromYouTube(item: any): Video {
    const snippet = item.snippet || {}
    const thumbs = snippet.thumbnails || {}
    const iso = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(item.contentDetails?.duration || '')
    const seconds = iso ? Number(iso[1] || 0) * 3600 + Number(iso[2] || 0) * 60 + Number(iso[3] || 0) : 0

    return normalize({
        url: '/watch?v=' + item.id,
        type: 'stream',
        title: snippet.title,
        uploaderName: snippet.channelTitle,
        uploaderUrl: '/channel/' + snippet.channelId,
        uploaded: Date.parse(snippet.publishedAt || '') || undefined,
        thumbnail: (thumbs.medium || thumbs.high || thumbs.default || {}).url || '',
        duration: seconds,
        views: Number(item.statistics?.viewCount || 0)
    }) as Video
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

    if (action === 'trending') return json({ ok: true, ...(await trending(region)) })

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

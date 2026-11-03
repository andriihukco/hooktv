// Keyless source: public Piped instances. Their JSON carries everything the app shows,
// so no Google API key is needed for trending and search.

export interface Video {
    id: string
    title: string
    channel: string
    channel_id: string
    published: string
    thumb: string
    duration: string
    views: number
}

/** 3725 → "1:02:05", 185 → "3:05" */
export function formatDuration(seconds: number): string {
    if (!seconds || seconds < 0) return ''

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const pad = (n: number) => String(n).padStart(2, '0')

    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** "/watch?v=abc" → "abc"; anything else → "" */
export function videoId(url: string): string {
    const match = /[?&]v=([\w-]{6,20})/.exec(url || '')

    return match ? match[1] : ''
}

/** "/channel/UC…" → "UC…" */
export function channelId(url: string): string {
    const match = /\/channel\/([\w-]+)/.exec(url || '')

    return match ? match[1] : ''
}

/**
 * One Piped item → app video. Returns null for channels, playlists and shorts
 */
export function normalize(item: any): Video | null {
    if (!item || item.type !== 'stream' || item.isShort) return null

    const id = videoId(item.url)
    if (!id) return null

    return {
        id,
        title: item.title || '',
        channel: item.uploaderName || '',
        channel_id: channelId(item.uploaderUrl),
        published: item.uploaded > 0 ? new Date(item.uploaded).toISOString() : '',
        thumb: item.thumbnail || '',
        duration: formatDuration(Number(item.duration) || 0),
        views: Number(item.views) || 0
    }
}

/** Piped trending is a plain array; search returns { items }. Both become a list of videos. */
export function normalizeList(json: any): Video[] {
    const list = Array.isArray(json) ? json : (json && json.items) || []

    return list.map(normalize).filter((item: Video | null): item is Video => Boolean(item))
}

/**
 * GET a path from the first instance that answers, trying the next one on error or timeout
 */
export async function pipedGet(bases: string[], path: string, fetcher: typeof fetch = fetch): Promise<any> {
    let lastError: unknown = new Error('no piped instance answered')

    for (const base of bases) {
        try {
            const res = await fetcher(base + path, { signal: AbortSignal.timeout(6000) })
            if (!res.ok) throw new Error(`${base} ${res.status}`)

            return await res.json()
        } catch (e) {
            lastError = e
        }
    }

    throw lastError
}

// Torznab client for a local Prowlarr instance. Each indexer has its own
// Torznab endpoint, /{id}/api, which answers with RSS/XML.
const TIMEOUT_MS = 30000
const ITEM = /<item\b[^>]*>([\s\S]*?)<\/item>/g

function decodeXml(text) {
    return text
        .trim()
        .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
}

function field(block, tag) {
    const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`))
    return match ? decodeXml(match[1]) : ''
}

function attribute(tag, name) {
    const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`))
    return match ? decodeXml(match[1]) : ''
}

function torznabAttr(block, name) {
    const match = block.match(new RegExp(`<torznab:attr\\s+name="${name}"\\s+value="([^"]*)"`))
    return match ? decodeXml(match[1]) : ''
}

function isoDate(text) {
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export function parseTorznabXml(xml) {
    return [...xml.matchAll(ITEM)].map(([, block]) => {
        const enclosure = block.match(/<enclosure\b[^>]*\/?>/)?.[0] ?? ''
        const link = field(block, 'link')
        const size = field(block, 'size') || attribute(enclosure, 'length')

        return {
            title: field(block, 'title'),
            downloadUrl: attribute(enclosure, 'url') || link,
            seeders: Number(torznabAttr(block, 'seeders')) || 0,
            publishDate: isoDate(field(block, 'pubDate')),
            size: Number(size) || 0,
            indexer: field(block, 'jackettindexer') || 'Unknown'
        }
    })
}

export async function listEnabledIndexerIds(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
    const response = await fetchImpl(new URL('/api/v1/indexer', baseUrl), {
        headers: {'X-Api-Key': apiKey},
        signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!response.ok) {
        throw new Error(`Prowlarr indexer list failed: HTTP ${response.status}`)
    }

    return (await response.json()).filter(indexer => indexer.enable).map(indexer => indexer.id)
}

export async function queryTorznabIndexer(baseUrl, apiKey, indexerId, query, fetchImpl = globalThis.fetch) {
    const url = new URL(`/${indexerId}/api`, baseUrl)
    url.searchParams.set('t', 'search')
    url.searchParams.set('q', query)
    url.searchParams.set('apikey', apiKey)

    const response = await fetchImpl(url, {
        headers: {Accept: 'application/xml'},
        signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!response.ok) {
        throw new Error(`Torznab query failed: HTTP ${response.status}`)
    }

    return parseTorznabXml(await response.text())
}

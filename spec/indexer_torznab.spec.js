import {expect, suite, test} from 'vitest'
import {listEnabledIndexerIds, parseTorznabXml, queryTorznabIndexer} from '../tools/indexer/torznab-client.js'

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:torznab="http://torznab.com/schemas/2015/feed" version="2.0"><channel>
<item>
<title><![CDATA[Movie.2020.UKR.1080p & more]]></title>
<link>https://example.test/dl?id=1&amp;x=2</link>
<pubDate>Mon, 01 Jan 2024 00:00:00 +0000</pubDate>
<size>1500000000</size>
<jackettindexer id="tracker">Tracker &amp; Co</jackettindexer>
<enclosure url="https://example.test/dl?id=1&amp;x=2" length="1500000000" type="application/x-bittorrent"/>
<torznab:attr name="seeders" value="12"/>
</item>
<item>
<title>Bare.Item</title>
<link>magnet:?xt=urn:btih:abc</link>
<pubDate>not a date</pubDate>
</item>
</channel></rss>`

suite('torznab feed', ()=>{
    test('items map to the release shape with decoded fields', ()=>{
        const [first, second] = parseTorznabXml(FEED)
        expect(first).toEqual({
            title: 'Movie.2020.UKR.1080p & more',
            downloadUrl: 'https://example.test/dl?id=1&x=2',
            seeders: 12,
            publishDate: '2024-01-01T00:00:00.000Z',
            size: 1500000000,
            indexer: 'Tracker & Co'
        })
        expect(second.downloadUrl).toBe('magnet:?xt=urn:btih:abc')
        expect(second.seeders).toBe(0)
        expect(second.size).toBe(0)
        expect(second.indexer).toBe('Unknown')
        expect(Number.isNaN(Date.parse(second.publishDate))).toBe(false)
    })

    test('query sends t=search, q and apikey to the indexer endpoint', async ()=>{
        let requested
        const fetchImpl = async (url, init)=>{
            requested = {url: new URL(url), init}
            return {ok: true, text: async ()=> '<rss><channel></channel></rss>'}
        }
        const results = await queryTorznabIndexer('http://127.0.0.1:9696', 'key123', 7, 'Українською', fetchImpl)
        expect(results).toEqual([])
        expect(requested.url.origin).toBe('http://127.0.0.1:9696')
        expect(requested.url.pathname).toBe('/7/api')
        expect(requested.url.searchParams.get('t')).toBe('search')
        expect(requested.url.searchParams.get('q')).toBe('Українською')
        expect(requested.url.searchParams.get('apikey')).toBe('key123')
        expect(requested.init.headers.Accept).toBe('application/xml')
    })

    test('HTTP errors surface the status code', async ()=>{
        const fetchImpl = async ()=> ({ok: false, status: 401})
        await expect(queryTorznabIndexer('http://127.0.0.1:9696', 'bad', 1, 'x', fetchImpl))
            .rejects.toThrow('Torznab query failed: HTTP 401')
    })

    test('only enabled indexers are queried', async ()=>{
        const fetchImpl = async ()=> ({ok: true, json: async ()=> [{id: 1, enable: true}, {id: 2, enable: false}]})
        expect(await listEnabledIndexerIds('http://127.0.0.1:9696', 'key', fetchImpl)).toEqual([1])
    })
})

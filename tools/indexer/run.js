// Manual indexer run: node tools/indexer/run.js "Українською" "Postmodern"
// Writes tools/indexer/out/releases.json. Nothing here reaches the public site.
import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {parseMediaMetadata} from './dubbing-parser.js'
import {listEnabledIndexerIds, queryTorznabIndexer} from './torznab-client.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_FILE = path.join(HERE, 'out', 'releases.json')
const MIN_SEEDERS = 3
const DEFAULT_QUERIES = ['Українською']

// Prowlarr's download links carry the API key in ?apikey=, so it is removed
// before anything is written to disk.
export function withoutApiKey(link) {
    if (!/^https?:/.test(link)) {
        return link
    }
    const url = new URL(link)
    url.searchParams.delete('apikey')
    return url.toString()
}

export function selectReleases(results, minSeeders = MIN_SEEDERS) {
    return results
        .filter(item => item.seeders >= minSeeders)
        .map(item => ({...item, downloadUrl: withoutApiKey(item.downloadUrl), metadata: parseMediaMetadata(item.title)}))
        .filter(item => item.metadata.isUkrainian)
}

async function main() {
    const baseUrl = process.env.PROWLARR_URL || 'http://127.0.0.1:9696'
    const apiKey = process.env.PROWLARR_API_KEY
    if (!apiKey) {
        throw new Error('PROWLARR_API_KEY is not set')
    }

    const queries = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_QUERIES
    const indexerIds = await listEnabledIndexerIds(baseUrl, apiKey)
    if (!indexerIds.length) {
        throw new Error('No enabled indexers in Prowlarr')
    }

    const seen = new Map()
    for (const indexerId of indexerIds) {
        for (const query of queries) {
            const results = await queryTorznabIndexer(baseUrl, apiKey, indexerId, query)
            for (const release of selectReleases(results)) {
                seen.set(release.downloadUrl || release.title, release)
            }
        }
    }

    const releases = [...seen.values()]
    await mkdir(path.dirname(OUT_FILE), {recursive: true})
    await writeFile(OUT_FILE, JSON.stringify({generatedAt: new Date().toISOString(), queries, count: releases.length, releases}, null, 2))
    console.log(`Wrote ${releases.length} Ukrainian releases to ${OUT_FILE}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error(error.message)
        process.exitCode = 1
    })
}

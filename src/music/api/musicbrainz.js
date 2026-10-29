// MusicBrainz is an open music database (CC0 data). Its public web service allows about one request per second.
const base = 'https://musicbrainz.org/ws/2'

// Artists from these countries are left out of every list, per product rule
export const excludedCountries = ['RU', 'IN']

const minGap = 1100
let chain = Promise.resolve()
let cache = new Map()

function wait(ms){
    return new Promise(resolve=>setTimeout(resolve, ms))
}

async function attempt(url, retry){
    let response = await fetch(url)

    if((response.status == 503 || response.status == 429) && retry < 2){
        await wait(minGap * (retry + 2))
        return attempt(url, retry + 1)
    }

    return response
}

function get(path, params){
    let url = new URL(`${base}/${path}`)

    Object.entries({...params, fmt: 'json'}).forEach(([key, value])=>url.searchParams.set(key, value))

    let key = url.toString()

    if(cache.has(key)) return cache.get(key)

    // 503 and 429 mean the shared rate limit is busy: retry with a longer pause before giving up
    let run = chain
        .then(()=>attempt(key, 0))
        .then(response=>{
            if(!response.ok) throw new Error(`MusicBrainz request failed (${response.status})`)

            return response.json()
        })

    chain = run.then(()=>wait(minGap), ()=>wait(minGap))
    cache.set(key, run)
    run.catch(()=>cache.delete(key))

    return run
}

// Lucene query text: quotes and backslashes escaped, length capped
export function phrase(value){
    let safe = String(value || '').replace(/[\u0000-\u001f]/g, '').slice(0, 80)

    return `"${safe.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function excludeCountries(){
    return excludedCountries.map(code=>`NOT country:${code}`).join(' AND ')
}

function mapArtist(item){
    return {
        id: item.id,
        name: item.name,
        country: item.country || '',
        type: item.type || '',
        disambiguation: item.disambiguation || '',
        tags: (item.tags || []).slice(0, 4).map(tag=>tag.name)
    }
}

export function artistQuery({name = '', tag = ''} = {}){
    let parts = []

    if(name) parts.push(`artist:${phrase(name)}`)
    if(tag) parts.push(`tag:${phrase(tag)}`)
    if(!parts.length) return ''

    parts.push(excludeCountries())

    return parts.join(' AND ')
}

export async function searchArtists({name = '', tag = '', limit = 20} = {}){
    let query = artistQuery({name, tag})

    if(!query) return []

    let data = await get('artist', {query, limit})

    return (data.artists || []).filter(artist=>artist.id && artist.score >= 60).map(mapArtist)
}

export async function artistProfile(id){
    let [artist, releases] = await Promise.all([
        get(`artist/${encodeURIComponent(id)}`, {inc: 'tags'}),
        get('release-group', {artist: id, type: 'album', limit: 60})
    ])

    if(excludedCountries.includes(artist.country)) throw new Error('Artist is not available in this catalog')

    let albums = (releases['release-groups'] || [])
        .filter(group=>!(group['secondary-types'] || []).length)
        .map(mapReleaseGroup)
        .sort((a, b)=>b.date.localeCompare(a.date))

    return {
        ...mapArtist(artist),
        lifeSpan: artist['life-span'] ? artist['life-span'].begin || '' : '',
        albums
    }
}

function mapReleaseGroup(group){
    let credit = (group['artist-credit'] || [])[0]

    return {
        id: group.id,
        title: group.title,
        artist: credit ? credit.name : '',
        artistId: credit && credit.artist ? credit.artist.id : '',
        date: group['first-release-date'] || '',
        year: (group['first-release-date'] || '').slice(0, 4)
    }
}

// Albums (release groups) carrying a community tag such as "happy" or "workout"
export async function albumsByTag(tag, limit = 20){
    let data = await get('release-group', {query: `tag:${phrase(tag)} AND primarytype:album`, limit})

    return (data['release-groups'] || []).filter(group=>group.id).map(mapReleaseGroup)
}

export function coverUrl(releaseGroupId, size = 500){
    return `https://coverartarchive.org/release-group/${encodeURIComponent(releaseGroupId)}/front-${size}`
}

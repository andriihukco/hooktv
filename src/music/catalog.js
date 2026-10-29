const archive = 'https://archive.org'
const licenses = [
    'http://creativecommons.org/licenses/by/3.0/',
    'http://creativecommons.org/licenses/by/4.0/',
    'http://creativecommons.org/publicdomain/zero/1.0/'
]

const categories = {
    all: '',
    focus: 'subject:Instrumental',
    chill: 'subject:Ambient',
    classical: 'subject:Classical',
    jazz: 'subject:Jazz',
    electronic: 'subject:Electronic'
}

function isOpenLicense(value){
    return licenses.includes(value)
}

function queryFor(category, search){
    let query = [
        'collection:freemusicarchive',
        'mediatype:audio',
        `licenseurl:(${licenses.map(license=>license.replace(/[:/]/g, '\\$&')).join(' OR ')})`
    ]

    let subject = categories[category] || ''

    if(subject) query.push(subject)

    let term = String(search || '').trim().replace(/[\u0000-\u001f]/g, '').slice(0, 80)

    if(term){
        let safe = term.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

        query.push(`(title:"${safe}" OR creator:"${safe}")`)
    }

    return query.join(' AND ')
}

async function request(url){
    let response = await fetch(url)

    if(!response.ok) throw new Error(`Free music catalog request failed (${response.status})`)

    return response.json()
}

function normalizeText(value){
    if(Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join(', ')

    return typeof value == 'string' ? value.trim() : ''
}

export async function searchAlbums(category = 'all', search = ''){
    let url = new URL('/advancedsearch.php', archive)
    url.searchParams.set('q', queryFor(category, search))
    url.searchParams.append('sort[]', 'downloads desc')
    url.searchParams.set('rows', '24')
    url.searchParams.set('output', 'json')
    url.searchParams.append('fl[]', 'identifier')
    url.searchParams.append('fl[]', 'title')
    url.searchParams.append('fl[]', 'creator')
    url.searchParams.append('fl[]', 'licenseurl')
    url.searchParams.append('fl[]', 'subject')

    let data = await request(url.toString())
    let docs = data.response && data.response.docs

    if(!Array.isArray(docs)) throw new Error('Free music catalog returned an invalid response')

    return docs.filter(item=>item.identifier && isOpenLicense(item.licenseurl)).map(item=>({
        identifier: item.identifier,
        title: normalizeText(item.title) || 'Untitled release',
        artist: normalizeText(item.creator) || 'Unknown artist',
        subjects: Array.isArray(item.subject) ? item.subject : item.subject ? [item.subject] : [],
        licenseUrl: item.licenseurl,
        archiveUrl: `${archive}/details/${encodeURIComponent(item.identifier)}`,
        cover: `${archive}/services/img/${encodeURIComponent(item.identifier)}`
    }))
}

function fileUrl(identifier, name){
    let path = name.split('/').map(part=>encodeURIComponent(part)).join('/')

    return `${archive}/download/${encodeURIComponent(identifier)}/${path}`
}

function cleanTrackTitle(file){
    let title = normalizeText(file.title) || file.name.split('/').pop().replace(/\.[^.]+$/, '')

    return title.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function licenseName(url){
    if(url.includes('/publicdomain/zero/')) return 'CC0'

    let version = url.match(/\/licenses\/by\/([^/]+)/)

    return version ? `CC BY ${version[1]}` : 'Creative Commons'
}

function lyricFor(file, files){
    let basename = file.name.split('/').pop().replace(/\.mp3$/i, '').toLowerCase()

    return files.find(candidate=>{
        let name = candidate.name || ''

        return /\.lrc$/i.test(name) && name.split('/').pop().replace(/\.lrc$/i, '').toLowerCase() == basename
    })
}

export async function albumTracks(album){
    let data = await request(`${archive}/metadata/${encodeURIComponent(album.identifier)}`)
    let metadata = data.metadata || {}
    let licenseUrl = metadata.licenseurl || album.licenseUrl

    if(!isOpenLicense(licenseUrl)) throw new Error('This release does not have a supported free-use license')

    let files = Array.isArray(data.files) ? data.files : []
    let mp3 = files.filter(file=>
        /\.mp3$/i.test(file.name || '') && /mp3/i.test(file.format || '') && !file.name.startsWith('__')
    )

    return mp3.map((file, index)=>{
        let lyrics = lyricFor(file, files)
        let length = Number.parseFloat(file.length)

        return {
            id: `${album.identifier}:${file.name}`,
            identifier: album.identifier,
            title: cleanTrackTitle(file),
            artist: normalizeText(metadata.creator) || album.artist,
            album: normalizeText(metadata.title) || album.title,
            licenseUrl,
            license: licenseName(licenseUrl),
            archiveUrl: album.archiveUrl,
            cover: `${archive}/services/img/${encodeURIComponent(album.identifier)}`,
            stream: fileUrl(album.identifier, file.name),
            lyricsUrl: lyrics ? fileUrl(album.identifier, lyrics.name) : '',
            duration: Number.isFinite(length) ? Math.round(length) : 0,
            index
        }
    })
}

export function lyricsUrl(track){
    return track.lyricsUrl || ''
}

export {categories, isOpenLicense, licenseName, queryFor}

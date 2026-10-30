// Wikidata (CC0) gives awards, a portrait and the English Wikipedia article for an artist, keyed by MusicBrainz ID (P434)
const endpoint = 'https://query.wikidata.org/sparql'

function sparql(mbid){
    let id = String(mbid).replace(/[^a-f0-9-]/gi, '')

    return `
SELECT ?image ?award ?awardLabel ?year ?title WHERE {
  ?item wdt:P434 "${id}".
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item p:P166 ?statement. ?statement ps:P166 ?award. OPTIONAL { ?statement pq:P585 ?year. } }
  OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200`
}

// Image sizes come from Wikimedia Commons; a 400 px width keeps portraits light
function thumb(url){
    return `${url}${url.includes('?') ? '&' : '?'}width=400`
}

export function imagesQuery(ids){
    let values = ids.map(id=>`"${String(id).replace(/[^a-f0-9-]/gi, '')}"`).join(' ')

    return `
SELECT ?mbid ?image WHERE {
  VALUES ?mbid { ${values} }
  ?item wdt:P434 ?mbid; wdt:P18 ?image.
}`
}

// Portraits for many artists in one request, keyed by MusicBrainz ID
export async function artistImages(ids){
    let list = [...new Set(ids.filter(Boolean))].slice(0, 50)
    let images = new Map()

    if(!list.length) return images

    let url = new URL(endpoint)

    url.searchParams.set('format', 'json')
    url.searchParams.set('query', imagesQuery(list))

    let response = await fetch(url.toString(), {headers: {Accept: 'application/sparql-results+json'}})

    if(!response.ok) throw new Error(`Wikidata request failed (${response.status})`)

    ;(((await response.json()).results || {}).bindings || []).forEach(row=>{
        if(!images.has(row.mbid.value)) images.set(row.mbid.value, thumb(row.image.value))
    })

    return images
}

async function summary(title){
    let response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`)

    if(!response.ok) return ''

    let data = await response.json()

    return data.extract || ''
}

export async function artistExtras(mbid){
    let url = new URL(endpoint)

    url.searchParams.set('format', 'json')
    url.searchParams.set('query', sparql(mbid))

    let response = await fetch(url.toString(), {headers: {Accept: 'application/sparql-results+json'}})

    if(!response.ok) throw new Error(`Wikidata request failed (${response.status})`)

    let rows = ((await response.json()).results || {}).bindings || []
    let awards = new Map()
    let image = ''
    let title = ''

    rows.forEach(row=>{
        if(row.image && !image) image = thumb(row.image.value)
        if(row.title && !title) title = row.title.value
        if(row.award){
            let key = row.award.value

            if(!awards.has(key)) awards.set(key, {name: row.awardLabel ? row.awardLabel.value : key, year: ''})
            if(row.year) awards.get(key).year = row.year.value.slice(0, 4)
        }
    })

    let bio = title ? await summary(title).catch(()=>'') : ''

    return {image, bio, awards: [...awards.values()]}
}

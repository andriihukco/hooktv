import {describe, expect, it} from 'vitest'

import {listenLinks} from '../src/music/platforms'
import {imagesQuery} from '../src/music/api/wikidata'

describe('music track search links', () => {
    it('offers search pages on the main services with the artist and title', () => {
        let links = listenLinks({artist: 'Kevin MacLeod', title: 'Amazing Grace 2011'})

        expect(links.map(link=>link.name)).toEqual(['Spotify', 'Apple Music', 'YouTube Music', 'Deezer', 'Bandcamp'])
        links.forEach(link=>expect(link.url).toContain('Kevin%20MacLeod%20Amazing%20Grace%202011'))
    })

    it('encodes characters that would break a URL', () => {
        let [spotify] = listenLinks({artist: 'AC/DC', title: 'Back & Forth?'})

        expect(spotify.url).toBe('https://open.spotify.com/search/AC%2FDC%20Back%20%26%20Forth%3F')
    })
})

describe('artist portraits lookup', () => {
    it('asks Wikidata for every MusicBrainz id in one query and drops anything that is not an id', () => {
        let query = imagesQuery(['5b11f4ce-a62d-471e-81fc-a69a8278c7da', 'a"b'])

        expect(query).toContain('VALUES ?mbid { "5b11f4ce-a62d-471e-81fc-a69a8278c7da" "ab" }')
        expect(query).toContain('wdt:P434 ?mbid; wdt:P18 ?image')
    })
})

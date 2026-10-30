// Search pages on the big streaming services: a track from a free archive is usually not on them, so the viewer searches
const services = [
    {name: 'Spotify', url: query=>`https://open.spotify.com/search/${query}`},
    {name: 'Apple Music', url: query=>`https://music.apple.com/search?term=${query}`},
    {name: 'YouTube Music', url: query=>`https://music.youtube.com/search?q=${query}`},
    {name: 'Deezer', url: query=>`https://www.deezer.com/search/${query}`},
    {name: 'Bandcamp', url: query=>`https://bandcamp.com/search?q=${query}`}
]

export function listenLinks(track){
    let query = encodeURIComponent([track.artist, track.title].filter(Boolean).join(' '))

    return services.map(service=>({name: service.name, url: service.url(query)}))
}

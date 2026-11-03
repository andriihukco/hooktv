import {art, archiveCover, icon} from './ui'

/**
 * Quick pick: a compact tile with a small cover, like the 2×3 grid at the top of Spotify's home
 * @param {{id:string,title:string,artist:string,identifier:string}} album
 * @param {(album:object)=>void} onOpen
 * @returns {jQuery}
 */
export function quickPick(album, onOpen){
    let tile = $('<button class="music-page__quick-item selector" type="button"></button>')

    tile.append(art(archiveCover(album.identifier), album.title.length % 5, album.title.slice(0, 1).toUpperCase()))
    tile.append($('<span class="music-page__quick-title"></span>').text(album.title))
    tile.on('hover:enter click', ()=>onOpen(album))

    return tile
}

/**
 * Album header: large cover, kind, title and artist, with the round Play button under it
 * @param {{title:string,artist:string,identifier:string,archiveUrl:string}} album
 * @param {{kind:string, play:string, archive:string, onPlay:()=>void}} text
 * @returns {jQuery}
 */
export function albumHeader(album, text){
    let head = $(`<div class="music-page__album-heading">
        <div class="music-page__album-cover"></div>
        <div class="music-page__album-info">
            <div class="music-page__eyebrow"></div>
            <h2 class="music-page__album-name"></h2>
            <div class="music-page__album-by"></div>
            <div class="music-page__album-actions">
                <button class="music-page__album-play selector" type="button" aria-label="${text.play}">${icon('play')}</button>
                <a class="music-page__archive-link selector" target="_blank" rel="noopener noreferrer"></a>
            </div>
        </div>
    </div>`)

    head.find('.music-page__album-cover').append(art(archiveCover(album.identifier), album.identifier.length % 5, album.title.slice(0, 2).toUpperCase()))
    head.find('.music-page__eyebrow').text(text.kind)
    head.find('.music-page__album-name').text(album.title)
    head.find('.music-page__album-by').text(album.artist)
    head.find('.music-page__archive-link').attr('href', album.archiveUrl).text(text.archive)
    head.find('.music-page__album-play').on('hover:enter click', text.onPlay)

    return head
}

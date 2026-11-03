// Shared pieces of the Music page: icons, time, artwork tiles and labels
export const group_labels = {
    mood: 'music_group_mood',
    occasion: 'music_group_occasion',
    activity: 'music_group_activity'
}

export const eqBars = 16

export function icon(name){
    let paths = {
        play: '<path d="m9 6 10 6-10 6z" fill="currentColor" stroke="none"/>',
        pause: '<path d="M8 6h3v12H8zM14 6h3v12h-3z" fill="currentColor" stroke="none"/>',
        next: '<path d="m6 6 9 6-9 6zM17 6h2v12h-2z" fill="currentColor" stroke="none"/>',
        previous: '<path d="m18 6-9 6 9 6zM5 6h2v12H5z" fill="currentColor" stroke="none"/>',
        heart: '<path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.4 4.4 0 0 1 8.8-1.1 4.4 4.4 0 0 1 8.8 1.1z"/>',
        search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/>',
        back: '<path d="m15 5-7 7 7 7"/>',
        lyrics: '<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>',
        up: '<path d="m6 15 6-6 6 6"/>',
        down: '<path d="m6 9 6 6 6-6"/>',
        listen: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>',
        back10: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/><text x="12" y="15.2" font-size="6.5" text-anchor="middle" fill="currentColor" stroke="none">10</text>',
        forward10: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/><text x="12" y="15.2" font-size="6.5" text-anchor="middle" fill="currentColor" stroke="none">10</text>'
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`
}

export function time(value){
    if(!Number.isFinite(value) || value < 0) return '0:00'

    let minutes = Math.floor(value / 60)
    let seconds = Math.floor(value % 60)

    return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Artwork falls back to a tone tile when an image is missing or fails to load
// Internet Archive item thumbnail, used for free-to-play releases
export function archiveCover(identifier){
    return `https://archive.org/services/img/${encodeURIComponent(identifier)}`
}

export function art(source, tone, label, round = false){
    let box = $(`<span class="music-page__art music-page__art--tone-${tone}${round ? ' music-page__art--artist' : ''}"><span class="music-page__art-label"></span></span>`)

    box.find('.music-page__art-label').text(label || '')

    if(source){
        let image = $('<img alt="" loading="lazy" decoding="async">').attr('src', source)

        image.on('error', ()=>image.remove())
        box.prepend(image)
    }

    return box
}

import Activity from '../interaction/activity/activity'
import Android from '../core/android'
import Controller from '../core/controller'
import Input from '../interaction/settings/input'
import Lang from '../core/lang'
import Noty from '../interaction/noty'
import Platform from '../core/platform'
import Scroll from '../interaction/scroll'
import Select from '../interaction/select'
import Storage from '../core/storage/storage'
import {albumTracks, searchAlbums} from '../music/catalog'
import {albumsByTag, artistProfile, coverUrl, searchArtists} from '../music/api/musicbrainz'
import {artistExtras, artistImages} from '../music/api/wikidata'
import {defaultMix, findMix, mixGroups} from '../music/hub'
import {listenLinks} from '../music/platforms'

const group_labels = {
    mood: 'music_group_mood',
    occasion: 'music_group_occasion',
    activity: 'music_group_activity'
}

const eqBars = 16

function icon(name){
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
        listen: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`
}

function time(value){
    if(!Number.isFinite(value) || value < 0) return '0:00'

    let minutes = Math.floor(value / 60)
    let seconds = Math.floor(value % 60)

    return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Artwork falls back to a tone tile when an image is missing or fails to load
// Internet Archive item thumbnail, used for free-to-play releases
function archiveCover(identifier){
    return `https://archive.org/services/img/${encodeURIComponent(identifier)}`
}

function art(source, tone, label, round = false){
    let box = $(`<span class="music-page__art music-page__art--tone-${tone}${round ? ' music-page__art--artist' : ''}"><span class="music-page__art-label"></span></span>`)

    box.find('.music-page__art-label').text(label || '')

    if(source){
        let image = $('<img alt="" loading="lazy" decoding="async">').attr('src', source)

        image.on('error', ()=>image.remove())
        box.prepend(image)
    }

    return box
}

function component(object){
    let scroll = new Scroll({mask: true, over: true, step: 280})
    let html = $('<div class="music-page"></div>')
    let instance = this
    let view = 'home'
    let currentMix = defaultMix
    let searchTerm = ''
    let albums = []
    let queue = []
    let queueIndex = -1
    let activeTrack = false
    let audio = new Audio()
    let requestId = 0
    let last
    let destroyed = false
    let lyricsRequest = 0
    let back = null
    let nowOpen = false
    let shell = $('<div class="music-root"></div>')

    audio.preload = 'none'

    function favorites(){
        let list = Storage.get('music_favorites', [])

        return Array.isArray(list) ? list : []
    }

    function isFavorite(track){
        return favorites().some(item=>item.id == track.id)
    }

    function setStatus(message){
        html.find('.music-page__status').text(message || '')
    }

    function refreshFocusable(){
        let active = Activity.active()

        if(!destroyed && instance.activity && active && active.activity === instance.activity){
            Controller.collectionSet(shell)

            if(!last || !last.isConnected) Controller.collectionFocus(false, shell)
        }
    }

    function content(){
        return html.find('.music-page__content').removeClass('music-page__content--detail').empty()
    }

    function message(text){
        return $('<div class="music-page__message"></div>').text(text)
    }

    function showError(error, retry){
        console.error('Music request failed:', error.message)

        let box = content()
        let button = $('<button class="music-page__retry selector" type="button"></button>').text(Lang.translate('music_retry'))

        button.on('hover:enter click', retry)
        box.append(message(Lang.translate('music_network_error')), button)
        instance.activity.loader(false)
        refreshFocusable()
    }

    // A horizontal shelf of cards. Each row loads on its own so one slow source does not hold up the page
    function shelf(title){
        let node = $(`<section class="music-page__shelf">
            <h3 class="music-page__shelf-title"></h3>
            <div class="music-page__shelf-items"></div>
            <div class="music-page__shelf-status"></div>
        </section>`)

        node.find('.music-page__shelf-title').text(Lang.translate(title))

        return node
    }

    function fill(node, load, render, token){
        let items = node.find('.music-page__shelf-items')
        let status = node.find('.music-page__shelf-status').text(Lang.translate('music_loading'))

        load.then(list=>{
            if(destroyed || token !== requestId) return

            status.text('')

            if(!list.length) status.text(Lang.translate('music_no_results'))
            else list.forEach(item=>items.append(render(item)))

            refreshFocusable()
        }).catch(error=>{
            if(destroyed || token !== requestId) return

            console.error('Music shelf failed:', error.message)
            status.text(Lang.translate('music_network_error'))
        })
    }

    // Portraits come from Wikidata; artists without one keep the initials tile
    function withPortraits(load){
        return load.then(list=>artistImages(list.map(artist=>artist.id))
            .catch(()=>new Map())
            .then(images=>list.map(artist=>({...artist, image: images.get(artist.id) || ''}))))
    }

    function artistCard(artist){
        let card = $('<button class="music-page__card music-page__card--artist selector" type="button"></button>')

        card.append(art(artist.image, artist.name.length % 5, initials(artist.name), true))
        card.append($('<span class="music-page__card-title"></span>').text(artist.name))
        card.append($('<span class="music-page__card-sub"></span>').text(artist.tags.slice(0, 2).join(' · ') || artist.country))
        card.on('hover:enter click', ()=>openArtist(artist.id, artist.name))

        return card
    }

    function albumCard(album){
        let card = $('<button class="music-page__card selector" type="button"></button>')

        card.append(art(coverUrl(album.id, 250), album.title.length % 5, initials(album.title)))
        card.append($('<span class="music-page__card-title"></span>').text(album.title))
        card.append($('<span class="music-page__card-sub"></span>').text([album.artist, album.year].filter(Boolean).join(' · ')))
        card.on('hover:enter click', ()=>{
            if(album.artistId) openArtist(album.artistId, album.artist)
        })

        return card
    }

    function releaseCard(album){
        let card = $('<button class="music-page__card selector" type="button"></button>')

        card.append(art(archiveCover(album.identifier), album.title.length % 5, initials(album.title)))
        card.append($('<span class="music-page__card-title"></span>').text(album.title))
        card.append($('<span class="music-page__card-sub"></span>').text(album.artist))
        card.on('hover:enter click', ()=>openAlbum(album))

        return card
    }

    function initials(text){
        return String(text || '').split(/\s+/).filter(Boolean).slice(0, 2).map(word=>word[0]).join('').toUpperCase()
    }

    function chips(){
        let box = $('<div class="music-page__chips"></div>')

        Object.keys(mixGroups).forEach(group=>{
            let row = $('<div class="music-page__chip-row"></div>')

            row.append($('<div class="music-page__chip-label"></div>').text(Lang.translate(group_labels[group])))

            let list = $('<div class="music-page__chip-list"></div>')

            mixGroups[group].forEach(mix=>{
                let chip = $('<button class="music-page__chip selector" type="button"></button>')
                    .text(Lang.translate('music_mix_' + mix.id))
                    .toggleClass('music-page__chip--active', currentMix == mix.id)

                chip.on('hover:enter click', ()=>{
                    currentMix = mix.id
                    renderHome()
                })

                list.append(chip)
            })

            row.append(list)
            box.append(row)
        })

        return box
    }

    function renderHome(){
        view = 'home'
        back = null

        let token = ++requestId
        let mix = findMix(currentMix)
        let box = content()

        box.append(chips())

        if(searchTerm){
            let artists = shelf('music_row_artists')
            let releases = shelf('music_row_releases')

            box.append(artists, releases)
            fill(artists, withPortraits(searchArtists({name: searchTerm, limit: 12})), artistCard, token)
            fill(releases, searchAlbums('all', searchTerm), releaseCard, token)
        }
        else {
            let artists = shelf('music_row_artists')
            let albumsRow = shelf('music_row_albums')
            let releases = shelf('music_row_releases')

            box.append(artists, albumsRow, releases)
            fill(artists, withPortraits(searchArtists({tag: mix.tag, limit: 12})), artistCard, token)
            fill(albumsRow, albumsByTag(mix.tag, 12), albumCard, token)
            fill(releases, searchAlbums('all', ''), releaseCard, token)
        }

        instance.activity.loader(false)
        refreshFocusable()
    }

    function renderFavorites(){
        view = 'favorites'
        back = null

        let box = content()
        let list = favorites()

        box.append($('<h2 class="music-page__shelf-title"></h2>').text(Lang.translate('music_category_favorites')))

        if(!list.length) box.append(message(Lang.translate('music_no_favorites')))
        else list.forEach((track, index)=>box.append(trackButton(track, list, index)))

        instance.activity.loader(false)
        refreshFocusable()
    }

    function trackButton(track, tracks, index){
        let row = $(`<div class="music-page__track">
            <button class="music-page__track-main selector" type="button">
                <span class="music-page__track-index"></span>
                <span class="music-page__track-name"><b></b><small></small></span>
                <span class="music-page__track-duration"></span>
            </button>
            <button class="music-page__track-find selector" type="button" aria-label="${Lang.translate('music_find_track')}" title="${Lang.translate('music_find_track')}">${icon('listen')}</button>
        </div>`)

        row.find('.music-page__track-index').text(String(index + 1).padStart(2, '0'))
        row.find('.music-page__track-name b').text(track.title)
        row.find('.music-page__track-name small').text(track.artist)
        row.find('.music-page__track-duration').text(track.duration ? time(track.duration) : '—')
        row.find('.music-page__track-main').on('hover:enter click', ()=>playTrack(track, tracks, index))
        row.find('.music-page__track-find').on('hover:enter click', ()=>listenOn(track))

        return row
    }

    // Free archive tracks are rarely on the big services, so offer a search there, as the movie sheet does
    function listenOn(track){
        Select.show({
            title: Lang.translate('music_find_track'),
            items: listenLinks(track).map(link=>({title: link.name, subtitle: Lang.translate('hooktv_where_search_on'), url: link.url})),
            onSelect: (item)=>{
                Controller.toggle('content')

                if(item.url) openLink(item.url)
            },
            onBack: ()=>Controller.toggle('content')
        })
    }

    function openLink(url){
        if(Platform.is('android')) Android.openBrowser(url)
        else window.open(url, '_blank')
    }

    function openArtist(id, name){
        view = 'artist'
        back = renderHome

        let token = ++requestId
        let box = content().addClass('music-page__content--detail')

        box.append(message(Lang.translate('music_loading')))
        instance.activity.loader(true)

        Promise.all([
            artistProfile(id),
            artistExtras(id).catch(()=>({image: '', bio: '', awards: []})),
            searchAlbums('all', name).catch(()=>[])
        ]).then(([profile, extras, releases])=>{
            if(destroyed || token !== requestId) return

            let own = releases.filter(item=>item.artist.toLowerCase().includes(profile.name.toLowerCase()))
            let page = $(`<div class="music-page__artist">
                <button class="music-page__back selector" type="button">${icon('back')}<span></span></button>
                <div class="music-page__artist-head">
                    <div class="music-page__artist-portrait"></div>
                    <div class="music-page__artist-copy">
                        <div class="music-page__eyebrow"></div>
                        <h2 class="music-page__artist-name"></h2>
                        <div class="music-page__artist-meta"></div>
                        <p class="music-page__artist-bio"></p>
                    </div>
                </div>
            </div>`)

            page.find('.music-page__back span').text(Lang.translate('music_back'))
            page.find('.music-page__back').on('hover:enter click', ()=>renderHome())
            page.find('.music-page__eyebrow').text(Lang.translate('music_artist'))
            page.find('.music-page__artist-name').text(profile.name)
            page.find('.music-page__artist-meta').text([profile.country, profile.type, profile.lifeSpan].filter(Boolean).join(' · '))
            page.find('.music-page__artist-bio').text(extras.bio || Lang.translate('music_bio_missing'))
            page.find('.music-page__artist-portrait').append(art(extras.image, profile.name.length % 5, initials(profile.name), true))

            page.append(awardsShelf(extras.awards), albumsShelf(profile.albums), freeShelf(own, id, name))
            box.empty().append(page)

            instance.activity.loader(false)
            refreshFocusable()
        }).catch(error=>{
            if(destroyed || token !== requestId) return

            showError(error, ()=>openArtist(id, name))
        })
    }

    function awardsShelf(awards){
        let node = shelf('music_awards')
        let list = node.find('.music-page__shelf-items')

        if(!awards.length) node.find('.music-page__shelf-status').text(Lang.translate('music_awards_missing'))

        awards.forEach(award=>{
            list.append($('<span class="music-page__award"></span>').text([award.name, award.year].filter(Boolean).join(' · ')))
        })

        return node
    }

    function albumsShelf(albumsList){
        let node = shelf('music_row_albums')
        let list = node.find('.music-page__shelf-items')

        if(!albumsList.length) node.find('.music-page__shelf-status').text(Lang.translate('music_no_results'))

        albumsList.forEach(album=>{
            let card = $(`<a class="music-page__card selector" target="_blank" rel="noopener noreferrer"></a>`)
                .attr('href', `https://musicbrainz.org/release-group/${encodeURIComponent(album.id)}`)

            card.append(art(coverUrl(album.id, 250), album.title.length % 5, initials(album.title)))
            card.append($('<span class="music-page__card-title"></span>').text(album.title))
            card.append($('<span class="music-page__card-sub"></span>').text(album.year))
            list.append(card)
        })

        return node
    }

    function freeShelf(releases, id, name){
        let node = shelf('music_row_releases')
        let list = node.find('.music-page__shelf-items')

        if(!releases.length) node.find('.music-page__shelf-status').text(Lang.translate('music_no_free_releases'))

        releases.forEach(album=>{
            let card = releaseCard(album)

            card.off('hover:enter click').on('hover:enter click', ()=>openAlbum(album, ()=>openArtist(id, name)))
            list.append(card)
        })

        return node
    }

    function openAlbum(album, previous = renderHome){
        view = 'album'
        back = previous

        let token = ++requestId
        let box = content().addClass('music-page__content--detail')

        box.append(message(Lang.translate('music_loading')))
        instance.activity.loader(true)

        albumTracks(album)
            .then(tracks=>{
                if(destroyed || token !== requestId) return

                albumDetail(album, tracks, previous)
                instance.activity.loader(false)
            })
            .catch(error=>{
                if(destroyed || token !== requestId) return

                box.removeClass('music-page__content--detail')
                showError(error, ()=>openAlbum(album, previous))
            })
    }

    function albumDetail(album, tracks, previous){
        let box = content()
        let detail = $(`<div class="music-page__album-detail">
            <button type="button" class="music-page__back selector">${icon('back')}<span></span></button>
            <div class="music-page__album-heading">
                <div class="music-page__album-cover"></div>
                <div>
                    <div class="music-page__eyebrow"></div>
                    <h2 class="music-page__album-name"></h2>
                    <div class="music-page__album-by"></div>
                    <a class="music-page__archive-link selector" target="_blank" rel="noopener noreferrer"></a>
                </div>
            </div>
            <div class="music-page__tracks"></div>
        </div>`)

        detail.find('.music-page__album-cover').append(art(archiveCover(album.identifier), album.identifier.length % 5, initials(album.title)))
        detail.find('.music-page__back span').text(Lang.translate('music_back'))
        detail.find('.music-page__eyebrow').text(Lang.translate('music_album'))
        detail.find('.music-page__album-name').text(album.title)
        detail.find('.music-page__album-by').text(album.artist)
        detail.find('.music-page__archive-link').attr('href', album.archiveUrl).text(Lang.translate('music_open_archive'))
        detail.find('.music-page__back').on('hover:enter click', ()=>{
            box.removeClass('music-page__content--detail')

            if(previous) previous()
            else renderHome()
        })

        let list = detail.find('.music-page__tracks')

        tracks.forEach((track, index)=>list.append(trackButton(track, tracks, index)))

        if(!tracks.length) list.append(message(Lang.translate('music_no_tracks')))

        box.empty().append(detail)
        refreshFocusable()
    }

    function updatePlayer(){
        let player = shell.find('.music-page__player')
        let now = shell.find('.music-page__now')

        if(!activeTrack){
            player.addClass('hide')
            now.addClass('hide')
            nowOpen = false
            return
        }

        player.removeClass('hide')
        now.toggleClass('hide', !nowOpen)

        let playing = !audio.paused

        ;[player, now].forEach(node=>{
            node.find('.music-page__title').text(activeTrack.title)
            node.find('.music-page__artist-line').text(activeTrack.artist)
            node.find('.music-page__play').html(icon(playing ? 'pause' : 'play'))
            node.find('.music-page__play').attr('aria-label', Lang.translate(playing ? 'music_pause' : 'music_play'))
            node.find('.music-page__eq').toggleClass('music-page__eq--playing', playing)
            node.find('.music-page__favorite').toggleClass('music-page__favorite--active', isFavorite(activeTrack)).html(icon('heart'))
            node.find('.music-page__lyrics-button').toggleClass('music-page__lyrics-button--active', Boolean(activeTrack.lyricsUrl))
        })

        player.find('.music-page__player-thumb').empty().append(art(archiveCover(activeTrack.identifier), activeTrack.identifier.length % 5, initials(activeTrack.album)))
        now.find('.music-page__now-album').text(activeTrack.album)
        now.find('.music-page__now-license').text(activeTrack.license)
        now.find('.music-page__now-art').empty().append(art(archiveCover(activeTrack.identifier), activeTrack.identifier.length % 5, initials(activeTrack.album)))
    }

    function playTrack(track, tracks, index){
        activeTrack = track
        queue = tracks
        queueIndex = index

        audio.pause()
        audio.src = track.stream
        audio.load()
        Storage.set('music_last_track', {
            title: track.title,
            artist: track.artist,
            album: track.album,
            license: track.license,
            licenseUrl: track.licenseUrl
        })
        updatePlayer()
        setStatus(Lang.translate('music_now_playing'))

        audio.play()
            .then(()=>{
                if(!destroyed) updatePlayer()
            })
            .catch(error=>{
                if(destroyed) return

                console.error('Music playback failed:', error.message)
                setStatus(Lang.translate('music_playback_error'))
                Noty.show(Lang.translate('music_playback_error'))
                updatePlayer()
            })
    }

    function stepTrack(step){
        if(!queue.length) return

        let index = (queueIndex + step + queue.length) % queue.length

        playTrack(queue[index], queue, index)
    }

    function togglePlay(){
        if(!activeTrack) return

        if(audio.paused){
            audio.play().catch(error=>{
                console.error('Music playback failed:', error.message)
                Noty.show(Lang.translate('music_playback_error'))
            })
        }
        else audio.pause()

        updatePlayer()
    }

    function openNow(open){
        nowOpen = open && Boolean(activeTrack)
        updatePlayer()
        refreshFocusable()
    }

    function toggleFavorite(){
        if(!activeTrack) return

        let list = favorites()
        let index = list.findIndex(item=>item.id == activeTrack.id)

        if(index >= 0) list.splice(index, 1)
        else list.unshift(activeTrack)

        Storage.set('music_favorites', list)
        updatePlayer()

        if(view == 'favorites') renderFavorites()
    }

    function showLyrics(){
        if(!activeTrack) return

        let panel = shell.find('.music-page__lyrics')
        let body = panel.find('.music-page__lyrics-body').empty()

        panel.removeClass('hide')
        panel.find('.music-page__lyrics-title').text(Lang.translate('music_lyrics_title'))

        if(!activeTrack.lyricsUrl){
            body.text(Lang.translate('music_lyrics_missing'))
            return
        }

        let token = ++lyricsRequest

        body.text(Lang.translate('music_loading'))

        fetch(activeTrack.lyricsUrl)
            .then(response=>{
                if(!response.ok) throw new Error(`Lyrics request failed (${response.status})`)

                return response.text()
            })
            .then(text=>{
                if(destroyed || token !== lyricsRequest) return

                let lines = text.split(/\r?\n/)
                    .map(line=>line.replace(/^\[[0-9:.]+\]\s*/, '').trim())
                    .filter(Boolean)

                body.empty()
                lines.forEach(line=>body.append($('<div></div>').text(line)))

                if(!lines.length) body.text(Lang.translate('music_lyrics_missing'))
            })
            .catch(error=>{
                if(destroyed || token !== lyricsRequest) return

                console.error('Music lyrics could not be loaded:', error.message)
                body.text(Lang.translate('music_lyrics_error'))
            })
    }

    function search(){
        Input.edit({
            title: Lang.translate('music_search_title'),
            value: searchTerm,
            free: true,
            nosave: true
        }, value=>{
            searchTerm = value.trim()
            renderHome()
        })
    }

    function seek(event){
        if(!Number.isFinite(audio.duration) || !audio.duration) return

        let rect = event.currentTarget.getBoundingClientRect()
        let position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))

        audio.currentTime = position * audio.duration
    }

    // Bottom bar pinned to the screen edge: track, transport controls, then actions
    function miniPlayer(){
        return $(`<div class="music-page__player hide" role="region" aria-label="${Lang.translate('music_now_playing')}">
            <div class="music-page__player-track">
                <button class="music-page__player-open selector" type="button" aria-label="${Lang.translate('music_open_player')}">
                    <span class="music-page__player-thumb"></span>
                    <span class="music-page__player-meta">
                        <b class="music-page__title"></b>
                        <span class="music-page__artist-line"></span>
                    </span>
                </button>
                <div class="music-page__eq" aria-hidden="true">${'<i></i>'.repeat(eqBars)}</div>
            </div>
            <div class="music-page__player-controls">
                <button class="music-page__previous selector" type="button" aria-label="${Lang.translate('music_previous')}">${icon('previous')}</button>
                <button class="music-page__play selector" type="button" aria-label="${Lang.translate('music_play')}"></button>
                <button class="music-page__next selector" type="button" aria-label="${Lang.translate('music_next')}">${icon('next')}</button>
            </div>
            <div class="music-page__player-actions">
                <button class="music-page__favorite selector" type="button" aria-label="${Lang.translate('music_favorite')}"></button>
                <button class="music-page__lyrics-button selector" type="button" aria-label="${Lang.translate('music_show_lyrics')}">${icon('lyrics')}</button>
            </div>
            <div class="music-page__trackline"><span></span></div>
        </div>`)
    }

    function fullPlayer(){
        return $(`<section class="music-page__now hide" role="dialog" aria-modal="true" aria-label="${Lang.translate('music_now_playing')}">
            <div class="music-page__now-top">
                <button class="music-page__now-close selector" type="button" aria-label="${Lang.translate('music_close_player')}">${icon('down')}</button>
                <button class="music-page__lyrics-button selector" type="button" aria-label="${Lang.translate('music_show_lyrics')}">${icon('lyrics')}</button>
            </div>
            <div class="music-page__now-art"></div>
            <div class="music-page__now-info">
                <b class="music-page__title"></b>
                <span class="music-page__artist-line"></span>
                <span class="music-page__now-album"></span>
            </div>
            <div class="music-page__eq music-page__eq--full" aria-hidden="true">${'<i></i>'.repeat(eqBars * 2)}</div>
            <div class="music-page__timeline selector" tabindex="0">
                <div class="music-page__trackline"><span></span></div>
                <div class="music-page__times"><span class="music-page__elapsed">0:00</span><span class="music-page__duration">0:00</span></div>
            </div>
            <div class="music-page__now-controls">
                <button class="music-page__previous selector" type="button" aria-label="${Lang.translate('music_previous')}">${icon('previous')}</button>
                <button class="music-page__play selector" type="button" aria-label="${Lang.translate('music_play')}"></button>
                <button class="music-page__next selector" type="button" aria-label="${Lang.translate('music_next')}">${icon('next')}</button>
            </div>
            <div class="music-page__now-foot">
                <span class="music-page__now-license"></span>
                <button class="music-page__favorite selector" type="button" aria-label="${Lang.translate('music_favorite')}"></button>
            </div>
        </section>`)
    }

    function build(){
        html.append(`<div class="music-page__section">
            <div class="music-page__section-head">
                <button class="music-page__search selector" type="button">${icon('search')}<span>${Lang.translate('music_search')}</span></button>
            </div>
            <div class="music-page__status"></div>
            <div class="music-page__content"></div>
        </div>`)

        // Player and lyrics sit outside the scrolling body: Scroll transforms its body, which would pin them to the content
        shell.append(miniPlayer(), fullPlayer())
        shell.append(`<aside class="music-page__lyrics hide">
            <div class="music-page__lyrics-head"><b class="music-page__lyrics-title"></b><button class="music-page__lyrics-close selector" type="button">×</button></div>
            <div class="music-page__lyrics-body"></div>
        </aside>`)

        html.find('.music-page__search').on('hover:enter click', search)
        shell.find('.music-page__play').on('hover:enter click', togglePlay)
        shell.find('.music-page__next').on('hover:enter click', ()=>stepTrack(1))
        shell.find('.music-page__previous').on('hover:enter click', ()=>stepTrack(-1))
        shell.find('.music-page__player-open').on('hover:enter click', ()=>openNow(true))
        shell.find('.music-page__now-close').on('hover:enter click', ()=>openNow(false))
        shell.find('.music-page__favorite').on('hover:enter click', toggleFavorite)
        shell.find('.music-page__lyrics-button').on('hover:enter click', showLyrics)
        shell.find('.music-page__lyrics-close').on('hover:enter click', ()=>shell.find('.music-page__lyrics').addClass('hide'))
        shell.find('.music-page__timeline').on('click', seek)

        html.on('hover:focus', '.selector', event=>{
            last = event.currentTarget
            scroll.update($(last), true)
        })

        audio.addEventListener('play', updatePlayer)
        audio.addEventListener('pause', updatePlayer)
        audio.addEventListener('ended', ()=>stepTrack(1))
        audio.addEventListener('error', ()=>{
            if(!activeTrack || destroyed) return

            console.error('Music audio source failed to load:', activeTrack.stream)
            setStatus(Lang.translate('music_playback_error'))
        })
        audio.addEventListener('timeupdate', ()=>{
            if(!Number.isFinite(audio.duration)) return

            shell.find('.music-page__elapsed').text(time(audio.currentTime))
            shell.find('.music-page__duration').text(time(audio.duration))
            shell.find('.music-page__trackline span').css('width', `${audio.currentTime / audio.duration * 100}%`)
        })

        scroll.minus()
        scroll.append(html)
        shell.prepend(scroll.render())

        if(object && object.favorites) renderFavorites()
        else renderHome()
    }

    this.create = function(){
        this.activity.loader(true)
        build()

        return this.render()
    }

    this.start = function(){
        Controller.add('content', {
            link: this,
            toggle: ()=>{
                Controller.collectionSet(shell)
                Controller.collectionFocus(last || false, shell)
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else Controller.toggle('menu')
            },
            right: ()=>Navigator.move('right'),
            up: ()=>{
                if(Navigator.canmove('up')) Navigator.move('up')
                else Controller.toggle('head')
            },
            down: ()=>Navigator.move('down'),
            back: ()=>{
                if(nowOpen) return openNow(false)
                if(back){
                    let previous = back

                    back = null
                    return previous()
                }

                Activity.backward()
            }
        })

        Controller.toggle('content')
    }

    this.pause = function(){}
    this.stop = function(){}
    this.render = function(){
        return shell
    }

    this.destroy = function(){
        destroyed = true
        requestId++
        lyricsRequest++

        audio.pause()
        audio.removeAttribute('src')
        audio.load()

        scroll.destroy()
        shell.remove()
    }
}

export default component

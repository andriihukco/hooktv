import Activity from '../interaction/activity/activity'
import Controller from '../core/controller'
import Input from '../interaction/settings/input'
import Lang from '../core/lang'
import Noty from '../interaction/noty'
import Scroll from '../interaction/scroll'
import Storage from '../core/storage/storage'
import {albumTracks, categories, searchAlbums} from '../music/catalog'

const category_labels = {
    all: 'music_category_all',
    focus: 'music_category_focus',
    chill: 'music_category_chill',
    uplifting: 'music_category_uplifting',
    classical: 'music_category_classical',
    jazz: 'music_category_jazz',
    electronic: 'music_category_electronic',
    favorites: 'music_category_favorites'
}

function icon(name){
    let paths = {
        play: '<path d="m9 6 10 6-10 6z" fill="currentColor" stroke="none"/>',
        pause: '<path d="M8 6h3v12H8zM14 6h3v12h-3z" fill="currentColor" stroke="none"/>',
        next: '<path d="m6 6 9 6-9 6zM17 6h2v12h-2z" fill="currentColor" stroke="none"/>',
        previous: '<path d="m18 6-9 6 9 6zM5 6h2v12H5z" fill="currentColor" stroke="none"/>',
        heart: '<path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.4 4.4 0 0 1 8.8-1.1 4.4 4.4 0 0 1 8.8 1.1z"/>',
        search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/>',
        back: '<path d="m15 5-7 7 7 7"/>',
        lyrics: '<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>'
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`
}

function time(value){
    if(!Number.isFinite(value) || value < 0) return '0:00'

    let minutes = Math.floor(value / 60)
    let seconds = Math.floor(value % 60)

    return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function component(object){
    let scroll = new Scroll({mask: true, over: true, step: 280})
    let html = $('<div class="music-page"></div>')
    let instance = this
    let currentCategory = 'all'
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
            Controller.collectionSet(scroll.render())

            if(!last || !last.isConnected) Controller.collectionFocus(false, scroll.render())
        }
    }

    function showLoading(){
        let content = html.find('.music-page__content')
        let status = $('<div class="music-page__message"></div>').text(Lang.translate('music_loading'))

        content.empty().append(status)
    }

    function showError(error){
        console.error('Music catalog request failed:', error.message)

        let content = html.find('.music-page__content')
        let message = $('<div class="music-page__message"></div>')
        let retry = $('<button class="music-page__retry selector" type="button"></button>')

        message.text(Lang.translate('music_network_error'))
        retry.text(Lang.translate('music_retry'))
        retry.on('hover:enter click', ()=>loadCategory())

        content.empty().append(message, retry)
    }

    function renderAlbumList(items){
        let content = html.find('.music-page__content').empty()

        if(!items.length){
            content.append($('<div class="music-page__message"></div>').text(
                currentCategory == 'favorites'
                    ? Lang.translate('music_no_favorites')
                    : Lang.translate('music_no_results')
            ))
            return
        }

        items.forEach((album, index)=>{
            let card = $(`<button class="music-page__album music-page__album--tone-${index % 5} selector" type="button">
                <span class="music-page__album-art"><span>${icon('play')}</span></span>
                <span class="music-page__album-copy">
                    <span class="music-page__album-title"></span>
                    <span class="music-page__album-artist"></span>
                    <span class="music-page__album-license"></span>
                </span>
                <span class="music-page__album-open">${icon('next')}</span>
            </button>`)

            card.find('.music-page__album-title').text(album.title)
            card.find('.music-page__album-artist').text(album.artist)
            card.find('.music-page__album-license').text(Lang.translate('music_free_license') + ' · ' + (album.license || licenseName(album.licenseUrl)))

            if(currentCategory == 'favorites'){
                card.find('.music-page__album-license').text(album.license)
                card.on('hover:enter click', ()=>playTrack(album, items, index))
            }
            else card.on('hover:enter click', ()=>openAlbum(album))

            content.append(card)
        })

        refreshFocusable()
    }

    function licenseName(url){
        if((url || '').includes('/publicdomain/zero/')) return 'CC0'

        let version = (url || '').match(/\/licenses\/by\/([^/]+)/)

        return version ? `CC BY ${version[1]}` : 'Creative Commons'
    }

    function loadCategory(){
        let token = ++requestId
        let content = html.find('.music-page__content')

        html.find('.music-page__album').remove()
        showLoading()
        setStatus('')

        if(currentCategory == 'favorites'){
            html.find('.music-page__section-title').text(Lang.translate('music_category_favorites'))
            renderAlbumList(favorites())
            instance.activity.loader(false)
            return
        }

        html.find('.music-page__section-title').text(Lang.translate(currentCategory == 'favorites' ? 'music_category_favorites' : 'music_playlist_results'))

        searchAlbums(currentCategory, searchTerm)
            .then(results=>{
                if(destroyed || token !== requestId) return

                albums = results
                renderAlbumList(albums)
                setStatus(Lang.translate('music_attribution_note'))
            })
            .catch(error=>{
                if(destroyed || token !== requestId) return

                content.empty()
                showError(error)
            })
            .finally(()=>{
                if(!destroyed && token === requestId) instance.activity.loader(false)
            })
    }

    function renderFilters(){
        let categoriesBox = html.find('.music-page__filters').empty()

        Object.keys(categories).forEach(key=>{
            let button = $('<button class="music-page__filter selector" type="button"></button>')
                .attr('data-category', key)
                .text(Lang.translate(category_labels[key] || key))
                .toggleClass('music-page__filter--active', currentCategory == key)

            button.on('hover:enter click', ()=>{
                currentCategory = key
                html.find('.music-page__filters .music-page__filter').removeClass('music-page__filter--active')
                button.addClass('music-page__filter--active')
                html.find('.music-page__album-detail').remove()
                html.find('.music-page__content').removeClass('music-page__content--album')
                loadCategory()
            })

            categoriesBox.append(button)
        })

        let saved = $('<button class="music-page__filter music-page__filter--saved selector" type="button"></button>')
            .text(Lang.translate(category_labels.favorites))
            .toggleClass('music-page__filter--active', currentCategory == 'favorites')
            .on('hover:enter click', ()=>{
                currentCategory = 'favorites'
                html.find('.music-page__filters .music-page__filter').removeClass('music-page__filter--active')
                saved.addClass('music-page__filter--active')
                html.find('.music-page__album-detail').remove()
                html.find('.music-page__content').removeClass('music-page__content--album')
                loadCategory()
            })

        categoriesBox.append(saved)
    }

    function albumDetail(album, tracks){
        let content = html.find('.music-page__content')
        let detail = $(`<div class="music-page__album-detail">
            <button type="button" class="music-page__back selector">${icon('back')}<span></span></button>
            <div class="music-page__album-heading">
                <div class="music-page__album-cover music-page__album-cover--tone-${Math.abs(album.identifier.length) % 5}">${icon('play')}</div>
                <div>
                    <div class="music-page__album-kicker">${Lang.translate('music_album')}</div>
                    <h2 class="music-page__album-name"></h2>
                    <div class="music-page__album-by"></div>
                    <a class="music-page__archive-link" target="_blank" rel="noopener noreferrer"></a>
                </div>
            </div>
            <div class="music-page__track-heading"><span>#</span><span>${Lang.translate('music_track')}</span><span>${Lang.translate('music_license')}</span><span>${Lang.translate('music_duration')}</span></div>
            <div class="music-page__tracks"></div>
        </div>`)

        detail.find('.music-page__back span').text(Lang.translate('music_back_to_albums'))
        detail.find('.music-page__album-name').text(album.title)
        detail.find('.music-page__album-by').text(album.artist)
        detail.find('.music-page__archive-link').attr('href', album.archiveUrl).text(Lang.translate('music_open_archive'))

        detail.find('.music-page__back').on('hover:enter click', ()=>{
            requestId++
            instance.activity.loader(false)
            detail.remove()
            content.removeClass('music-page__content--album')
            renderAlbumList(albums)
        })

        let list = detail.find('.music-page__tracks')

        tracks.forEach((track, index)=>{
            let row = $(`<button type="button" class="music-page__track selector">
                <span class="music-page__track-index">${String(index + 1).padStart(2, '0')}</span>
                <span class="music-page__track-name"><b></b><small></small></span>
                <span class="music-page__track-license"></span>
                <span class="music-page__track-duration"></span>
            </button>`)

            row.find('.music-page__track-name b').text(track.title)
            row.find('.music-page__track-name small').text(track.artist)
            row.find('.music-page__track-license').text(track.license)
            row.find('.music-page__track-duration').text(track.duration ? time(track.duration) : '—')
            row.on('hover:enter click', ()=>playTrack(track, tracks, index))
            list.append(row)
        })

        if(!tracks.length) list.append($('<div class="music-page__message"></div>').text(Lang.translate('music_no_tracks')))

        content.empty().addClass('music-page__content--album').append(detail)
        refreshFocusable()
    }

    function openAlbum(album){
        let content = html.find('.music-page__content').empty()
        let loading = $('<div class="music-page__message"></div>').text(Lang.translate('music_loading'))
        let token = ++requestId

        content.addClass('music-page__content--album').append(loading)
        instance.activity.loader(true)

        albumTracks(album)
            .then(tracks=>{
                if(destroyed || token !== requestId) return

                albumDetail(album, tracks)
                instance.activity.loader(false)
            })
            .catch(error=>{
                if(destroyed || token !== requestId) return

                console.error('Music album could not be loaded:', error.message)
                content.empty().removeClass('music-page__content--album')
                showError(error)
                instance.activity.loader(false)
            })
    }

    function updatePlayer(){
        let player = html.find('.music-page__player')

        if(!activeTrack){
            player.addClass('hide')
            return
        }

        player.removeClass('hide')
        player.find('.music-page__player-title').text(activeTrack.title)
        player.find('.music-page__player-artist').text(activeTrack.artist)
        player.find('.music-page__player-album').text(activeTrack.album)
        player.find('.music-page__player-license').text(activeTrack.license)
        player.find('.music-page__favorite').toggleClass('music-page__favorite--active', isFavorite(activeTrack))
        player.find('.music-page__favorite').html(icon('heart'))
        player.find('.music-page__play').html(icon(audio.paused ? 'play' : 'pause'))
        player.find('.music-page__play').attr('aria-label', Lang.translate(audio.paused ? 'music_play' : 'music_pause'))

        let lyricsButton = player.find('.music-page__lyrics-button')

        lyricsButton.toggleClass('music-page__lyrics-button--active', Boolean(activeTrack.lyricsUrl))
        lyricsButton.attr('aria-label', Lang.translate('music_show_lyrics'))
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

    function toggleFavorite(){
        if(!activeTrack) return

        let list = favorites()
        let index = list.findIndex(item=>item.id == activeTrack.id)

        if(index >= 0) list.splice(index, 1)
        else list.unshift(activeTrack)

        Storage.set('music_favorites', list)
        updatePlayer()

        if(currentCategory == 'favorites') renderAlbumList(list)
    }

    function showLyrics(){
        if(!activeTrack) return

        let panel = html.find('.music-page__lyrics')
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
            currentCategory = 'all'
            html.find('.music-page__filters .music-page__filter').removeClass('music-page__filter--active')
            html.find('.music-page__filters .music-page__filter[data-category="all"]').addClass('music-page__filter--active')
            loadCategory()
        })
    }

    function build(){
        html.append(`<div class="music-page__hero">
            <div class="music-page__hero-orb music-page__hero-orb--one"></div>
            <div class="music-page__hero-orb music-page__hero-orb--two"></div>
            <div class="music-page__hero-copy">
                <div class="music-page__eyebrow">${Lang.translate('music_eyebrow')}</div>
                <h1>${Lang.translate('music_title')}</h1>
                <p>${Lang.translate('music_intro')}</p>
            </div>
            <div class="music-page__hero-art" aria-hidden="true"><div class="music-page__equalizer"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
        </div>
        <div class="music-page__section music-page__moods">
            <div class="music-page__section-head">
                <div>
                    <div class="music-page__section-kicker">${Lang.translate('music_discover')}</div>
                    <h2>${Lang.translate('music_moods_genres')}</h2>
                </div>
                <button class="music-page__search selector" type="button">${icon('search')}<span>${Lang.translate('music_search')}</span></button>
            </div>
            <div class="music-page__filters"></div>
        </div>
        <div class="music-page__section">
            <div class="music-page__section-head music-page__section-head--list">
                <div>
                    <div class="music-page__section-kicker">${Lang.translate('music_playlists')}</div>
                    <h2 class="music-page__section-title"></h2>
                </div>
                <div class="music-page__status"></div>
            </div>
            <div class="music-page__content"></div>
        </div>
        <div class="music-page__player hide">
            <div class="music-page__player-art"><div class="music-page__player-bars"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>
            <div class="music-page__player-meta">
                <b class="music-page__player-title"></b>
                <span class="music-page__player-artist"></span>
                <span class="music-page__player-album"></span>
            </div>
            <div class="music-page__player-center">
                <div class="music-page__player-controls">
                    <button class="music-page__previous selector" type="button" aria-label="${Lang.translate('music_previous')}">${icon('previous')}</button>
                    <button class="music-page__play selector" type="button" aria-label="${Lang.translate('music_play')}">${icon('play')}</button>
                    <button class="music-page__next selector" type="button" aria-label="${Lang.translate('music_next')}">${icon('next')}</button>
                </div>
                <div class="music-page__timeline">
                    <span class="music-page__elapsed">0:00</span>
                    <div class="music-page__trackline"><span></span></div>
                    <span class="music-page__duration">0:00</span>
                </div>
            </div>
            <div class="music-page__player-actions">
                <span class="music-page__player-license"></span>
                <button class="music-page__lyrics-button selector" type="button">${icon('lyrics')}</button>
                <button class="music-page__favorite selector" type="button">${icon('heart')}</button>
            </div>
        </div>
        <aside class="music-page__lyrics hide">
            <div class="music-page__lyrics-head"><b class="music-page__lyrics-title"></b><button class="music-page__lyrics-close selector" type="button">×</button></div>
            <div class="music-page__lyrics-body"></div>
        </aside>`)

        renderFilters()
        html.find('.music-page__search').on('hover:enter click', search)
        html.find('.music-page__previous').on('hover:enter click', ()=>stepTrack(-1))
        html.find('.music-page__next').on('hover:enter click', ()=>stepTrack(1))
        html.find('.music-page__play').on('hover:enter click', ()=>{
            if(!activeTrack) return

            if(audio.paused){
                audio.play().catch(error=>{
                    console.error('Music playback failed:', error.message)
                    Noty.show(Lang.translate('music_playback_error'))
                })
            }
            else audio.pause()

            updatePlayer()
        })
        html.find('.music-page__favorite').on('hover:enter click', toggleFavorite)
        html.find('.music-page__lyrics-button').on('hover:enter click', showLyrics)
        html.find('.music-page__lyrics-close').on('hover:enter click', ()=>html.find('.music-page__lyrics').addClass('hide'))

        html.on('hover:focus', '.selector', event=>{
            last = event.currentTarget
            scroll.update($(last), true)
        })

        html.find('.music-page__timeline').on('click', event=>{
            if(!Number.isFinite(audio.duration) || !audio.duration) return

            let rect = event.currentTarget.getBoundingClientRect()
            let position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))

            audio.currentTime = position * audio.duration
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

            html.find('.music-page__elapsed').text(time(audio.currentTime))
            html.find('.music-page__duration').text(time(audio.duration))
            html.find('.music-page__trackline span').css('width', `${audio.currentTime / audio.duration * 100}%`)
        })

        scroll.minus()
        scroll.append(html)
        loadCategory()
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
                Controller.collectionSet(scroll.render())
                Controller.collectionFocus(last || false, scroll.render())
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
            back: ()=>Activity.backward()
        })

        Controller.toggle('content')
    }

    this.pause = function(){}
    this.stop = function(){}
    this.render = function(){
        return scroll.render()
    }

    this.destroy = function(){
        destroyed = true
        requestId++
        lyricsRequest++

        audio.pause()
        audio.removeAttribute('src')
        audio.load()

        scroll.destroy()
        html.remove()
    }
}

export default component

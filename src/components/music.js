import Activity from '../interaction/activity/activity'
import Controller from '../core/controller'
import Lang from '../core/lang'
import Noty from '../interaction/noty'
import Scroll from '../interaction/scroll'
import Search from '../interaction/search/global'
import Storage from '../core/storage/storage'
import {albumTracks, categories, searchAlbums} from '../music/catalog'

const category_labels = {
    all: 'music_category_all',
    focus: 'music_category_focus',
    chill: 'music_category_chill',
    classical: 'music_category_classical',
    jazz: 'music_category_jazz',
    electronic: 'music_category_electronic',
    favorites: 'music_category_favorites'
}

// remote and keyboard media keys: play/pause, play, pause, next, previous (webOS, Tizen and the standard codes)
const media_keys = {179: 'toggle', 10252: 'toggle', 415: 'play', 19: 'pause', 176: 'next', 177: 'previous', 417: 'next', 412: 'previous'}

function icon(name){
    let paths = {
        play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
        pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
        next: '<path d="m5 5 10 7-10 7zM16.5 5h2.5v14h-2.5z" fill="currentColor" stroke="none"/>',
        previous: '<path d="m19 5-10 7 10 7zM5 5h2.5v14H5z" fill="currentColor" stroke="none"/>',
        heart: '<path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.4 4.4 0 0 1 8.8-1.1 4.4 4.4 0 0 1 8.8 1.1z"/>',
        search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4.2 4.2"/>',
        back: '<path d="m15 5-7 7 7 7"/>',
        lyrics: '<path d="M5 6h14M5 11h14M5 16h9"/>',
        bars: '<path d="M6 18V10M10 18V6M14 18V12M18 18V8"/>',
        expand: '<path d="M14 5h5v5M10 19H5v-5M19 5l-6 6M5 19l6-6"/>',
        close: '<path d="m6 6 12 12M18 6 6 18"/>'
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ''}</svg>`
}

function time(value){
    if(!Number.isFinite(value) || value < 0) return '0:00'

    return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
}

function licenseName(url){
    if((url || '').includes('/publicdomain/zero/')) return 'CC0'

    let version = (url || '').match(/\/licenses\/by\/([^/]+)/)

    return version ? `CC BY ${version[1]}` : 'Creative Commons'
}

// a cover that fails to load leaves the tinted square behind it
function cover(url){
    return url ? `<img src="${url}" alt="" loading="lazy" onerror="this.remove()">` : ''
}

function component(object){
    let scroll = new Scroll({mask: true, over: true, step: 280})
    let root = $('<div class="music"></div>')
    let html = $('<div class="music-page"></div>')
    let bar = $('<div class="music-bar hide"></div>')
    let full = $('<div class="music-full"></div>')
    let instance = this
    let currentCategory = 'all'
    let albums = []
    let queue = []
    let queueIndex = -1
    let activeTrack = false
    let audio = new Audio()
    let requestId = 0
    let lyricsRequest = 0
    let last
    let destroyed = false

    audio.preload = 'none'

    function favorites(){
        let list = Storage.get('music_favorites', [])

        return Array.isArray(list) ? list : []
    }

    function isFavorite(track){
        return favorites().some(item=>item.id == track.id)
    }

    function onFocus(event){
        last = event.currentTarget

        if(html[0].contains(last)) scroll.update($(last), true)
    }

    function refreshFocusable(){
        let active = Activity.active()

        root.find('.selector').off('hover:focus', onFocus).on('hover:focus', onFocus)

        if(!destroyed && instance.activity && active && active.activity === instance.activity && Controller.enabled().name == 'content'){
            Controller.collectionSet(root)

            if(!last || !last.isConnected) Controller.collectionFocus(false, root)
        }
    }

    function message(text, retry){
        let content = html.find('.music-page__content').empty()

        content.append($('<div class="music-page__message"></div>').text(text))

        if(retry){
            content.append($('<button class="music-page__retry selector" type="button"></button>')
                .text(Lang.translate('music_retry'))
                .on('hover:enter', loadCategory))
        }

        refreshFocusable()
    }

    function renderReleases(items){
        let content = html.find('.music-page__content').empty().removeClass('music-page__content--album')

        if(!items.length){
            message(Lang.translate(currentCategory == 'favorites' ? 'music_no_favorites' : 'music_no_results'))
            return
        }

        let grid = $('<div class="music-page__grid"></div>')

        items.forEach((item, index)=>{
            let card = $(`<button class="music-page__release selector" type="button">
                <span class="music-page__cover music-page__cover--tone-${index % 5}">${cover(item.cover)}<span class="music-page__cover-play">${icon('play')}</span></span>
                <span class="music-page__release-title"></span>
                <span class="music-page__release-artist"></span>
            </button>`)

            card.find('.music-page__release-title').text(item.title)
            card.find('.music-page__release-artist').text(item.artist)

            // a saved track plays from the saved list; a release plays at once, and holding OK opens its tracks
            if(currentCategory == 'favorites') card.on('hover:enter', ()=>playTrack(item, items, index))
            else {
                card.on('hover:enter', ()=>playRelease(item))
                card.on('hover:long', ()=>openRelease(item))
            }

            grid.append(card)
        })

        content.append(grid)
        refreshFocusable()
    }

    function loadCategory(){
        let token = ++requestId

        message(Lang.translate('music_loading'))

        if(currentCategory == 'favorites'){
            renderReleases(favorites())
            instance.activity.loader(false)
            return
        }

        searchAlbums(currentCategory)
            .then(results=>{
                if(destroyed || token !== requestId) return

                albums = results
                renderReleases(albums)
            })
            .catch(error=>{
                if(destroyed || token !== requestId) return

                console.error('Music catalog request failed:', error.message)
                message(Lang.translate('music_network_error'), true)
            })
            .finally(()=>{
                if(!destroyed && token === requestId) instance.activity.loader(false)
            })
    }

    function renderFilters(){
        let box = html.find('.music-page__filters').empty()

        Object.keys(category_labels).filter(key=>key == 'favorites' || key in categories).forEach(key=>{
            let chip = $('<button class="music-page__filter selector" type="button"></button>')
                .text(Lang.translate(category_labels[key]))
                .attr('aria-pressed', currentCategory == key ? 'true' : 'false')

            chip.on('hover:enter', ()=>{
                currentCategory = key
                box.find('.music-page__filter').attr('aria-pressed', 'false')
                chip.attr('aria-pressed', 'true')
                loadCategory()
            })

            box.append(chip)
        })

        box.append($(`<button class="music-page__filter music-page__filter--search selector" type="button" aria-label="${Lang.translate('music_search')}">${icon('search')}</button>`)
            .on('hover:enter', openSearch))
    }

    function tracksOf(album){
        return albumTracks(album).then(tracks=>{
            if(!tracks.length) throw new Error('empty release')

            return tracks
        })
    }

    function playRelease(album){
        let token = ++requestId

        instance.activity.loader(true)

        tracksOf(album)
            .then(tracks=>{
                if(destroyed || token !== requestId) return

                playTrack(tracks[0], tracks, 0)
            })
            .catch(error=>{
                if(destroyed || token !== requestId) return

                console.error('Music release could not be played:', error.message)
                Noty.show(Lang.translate(error.message == 'empty release' ? 'music_no_tracks' : 'music_network_error'))
            })
            .finally(()=>{
                if(!destroyed && token === requestId) instance.activity.loader(false)
            })
    }

    function openRelease(album){
        let token = ++requestId

        instance.activity.loader(true)

        albumTracks(album)
            .then(tracks=>{
                if(destroyed || token !== requestId) return

                renderTracks(album, tracks)
            })
            .catch(error=>{
                if(destroyed || token !== requestId) return

                console.error('Music release could not be loaded:', error.message)
                message(Lang.translate('music_network_error'), true)
            })
            .finally(()=>{
                if(!destroyed && token === requestId) instance.activity.loader(false)
            })
    }

    function renderTracks(album, tracks){
        let content = html.find('.music-page__content').empty().addClass('music-page__content--album')
        let detail = $(`<div class="music-page__album">
            <button type="button" class="music-page__back selector">${icon('back')}<span></span></button>
            <div class="music-page__album-head">
                <span class="music-page__cover music-page__cover--tone-${album.identifier.length % 5}">${cover(album.cover)}</span>
                <div>
                    <div class="music-page__album-kicker">${Lang.translate('music_album')}</div>
                    <h2 class="music-page__album-name"></h2>
                    <div class="music-page__album-by"></div>
                    <a class="music-page__archive-link" target="_blank" rel="noopener noreferrer"></a>
                </div>
            </div>
            <div class="music-page__tracks" role="list"></div>
        </div>`)

        detail.find('.music-page__back span').text(Lang.translate('music_back_to_albums'))
        detail.find('.music-page__album-name').text(album.title)
        detail.find('.music-page__album-by').text(album.artist + ' · ' + licenseName(album.licenseUrl))
        detail.find('.music-page__archive-link').attr('href', album.archiveUrl).text(Lang.translate('music_open_archive'))
        detail.find('.music-page__back').on('hover:enter', ()=>{
            requestId++
            renderReleases(albums)
        })

        let list = detail.find('.music-page__tracks')

        tracks.forEach((track, index)=>{
            let row = $(`<button type="button" class="music-page__track selector" role="listitem">
                <span class="music-page__track-index">${index + 1}</span>
                <span class="music-page__track-name"></span>
                <span class="music-page__track-duration"></span>
            </button>`)

            row.find('.music-page__track-name').text(track.title)
            row.find('.music-page__track-duration').text(track.duration ? time(track.duration) : '')
            row.attr('data-id', track.id).toggleClass('music-page__track--active', Boolean(activeTrack && activeTrack.id == track.id))
            row.on('hover:enter', ()=>playTrack(track, tracks, index))
            list.append(row)
        })

        if(!tracks.length) list.append($('<div class="music-page__message"></div>').text(Lang.translate('music_no_tracks')))

        content.append(detail)
        refreshFocusable()
    }

    // the same search screen as films and series, with music as its only source
    function openSearch(){
        Search.open({
            sources: [{
                title: 'Music',
                params: {lazy: true, nofound: 'music_no_results'},
                search: (params, done)=>{
                    searchAlbums('all', decodeURIComponent(params.query))
                        .then(results=>done(results.length ? [{
                            title: Lang.translate('music_playlist_results'),
                            results: results.map(album=>Object.assign({}, album, {img: album.cover, original_title: album.artist}))
                        }] : []))
                        .catch(()=>done([]))
                },
                onSelect: (params, close)=>{
                    close()
                    playRelease(params.element)
                }
            }]
        })
    }

    function updatePlayer(){
        let playing = Boolean(activeTrack) && !audio.paused

        bar.toggleClass('hide', !activeTrack)
        root.toggleClass('music--bar', Boolean(activeTrack))
        full.toggleClass('music-full--playing', playing)
        bar.toggleClass('music-bar--playing', playing)

        if(!activeTrack) return

        bar.find('.music-bar__title').text(activeTrack.title)
        bar.find('.music-bar__artist').text(activeTrack.artist)
        full.find('.music-full__title').text(activeTrack.title)
        full.find('.music-full__artist').text(activeTrack.artist)
        full.find('.music-full__album').text([activeTrack.album, activeTrack.license].filter(Boolean).join(' · '))

        let art = cover(activeTrack.cover)

        if(bar.data('cover') !== activeTrack.cover){
            bar.data('cover', activeTrack.cover)
            bar.find('.music-bar__cover').html(art)
            full.find('.music-full__cover-art').html(art)
            full.find('.music-full__backdrop').css('background-image', activeTrack.cover ? `url("${activeTrack.cover}")` : 'none')
        }

        let label = Lang.translate(playing ? 'music_pause' : 'music_play')

        bar.add(full).find('.music-play').html(icon(playing ? 'pause' : 'play')).attr('aria-label', label)
        full.find('.music-full__favorite')
            .toggleClass('music-full__action--on', isFavorite(activeTrack))
            .attr('aria-pressed', isFavorite(activeTrack) ? 'true' : 'false')

        html.find('.music-page__track').each(function(){
            $(this).toggleClass('music-page__track--active', this.dataset.id == activeTrack.id)
        })
    }

    function playTrack(track, tracks, index){
        activeTrack = track
        queue = tracks
        queueIndex = index

        audio.src = track.stream
        Storage.set('music_last_track', {
            title: track.title,
            artist: track.artist,
            album: track.album,
            license: track.license,
            licenseUrl: track.licenseUrl
        })
        updatePlayer()
        refreshFocusable()

        if(full.hasClass('music-full--open') && full.hasClass('music-full--lyrics')) loadLyrics()

        resume()
    }

    function resume(){
        audio.play()
            .then(()=>!destroyed && updatePlayer())
            .catch(error=>{
                if(destroyed) return

                // AbortError: a newer track replaced this one; NotAllowedError: the browser wants a tap first.
                // Neither means the track cannot play, so no warning for them.
                if(error.name != 'AbortError' && error.name != 'NotAllowedError'){
                    console.error('Music playback failed:', error.message)
                    Noty.show(Lang.translate('music_playback_error'))
                }

                updatePlayer()
            })
    }

    function toggle(){
        if(!activeTrack) return

        if(audio.paused) resume()
        else audio.pause()
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

        if(currentCategory == 'favorites') renderReleases(list)
    }

    function loadLyrics(){
        let body = full.find('.music-full__lyrics').empty()

        if(!activeTrack.lyricsUrl){
            body.append($('<p class="music-full__lyrics-empty"></p>').text(Lang.translate('music_lyrics_missing')))
            return
        }

        let token = ++lyricsRequest

        body.append($('<p class="music-full__lyrics-empty"></p>').text(Lang.translate('music_loading')))

        fetch(activeTrack.lyricsUrl)
            .then(response=>{
                if(!response.ok) throw new Error(`Lyrics request failed (${response.status})`)

                return response.text()
            })
            .then(text=>{
                if(destroyed || token !== lyricsRequest) return

                let lines = text.split(/\r?\n/).map(line=>line.replace(/^\[[0-9:.]+\]\s*/, '').trim()).filter(Boolean)

                body.empty()

                if(!lines.length) body.append($('<p class="music-full__lyrics-empty"></p>').text(Lang.translate('music_lyrics_missing')))
                else lines.forEach(line=>body.append($('<p></p>').text(line)))
            })
            .catch(error=>{
                if(destroyed || token !== lyricsRequest) return

                console.error('Music lyrics could not be loaded:', error.message)
                body.empty().append($('<p class="music-full__lyrics-empty"></p>').text(Lang.translate('music_lyrics_error')))
            })
    }

    function setView(view){
        full.toggleClass('music-full--lyrics', view == 'lyrics' && !full.hasClass('music-full--lyrics'))
        full.toggleClass('music-full--viz', view == 'viz' && !full.hasClass('music-full--viz'))
        full.find('.music-full__lyrics-button').attr('aria-pressed', full.hasClass('music-full--lyrics') ? 'true' : 'false')
        full.find('.music-full__viz-button').attr('aria-pressed', full.hasClass('music-full--viz') ? 'true' : 'false')

        if(full.hasClass('music-full--lyrics')) loadLyrics()
    }

    function openFull(){
        if(!activeTrack) return

        $('body').append(full)
        full.addClass('music-full--open')

        Controller.add('music_full', {
            toggle: ()=>{
                Controller.collectionSet(full)
                Controller.collectionFocus(full.find('.music-play')[0], full)
            },
            left: ()=>Navigator.move('left'),
            right: ()=>Navigator.move('right'),
            up: ()=>Navigator.move('up'),
            down: ()=>Navigator.move('down'),
            back: closeFull
        })
        Controller.toggle('music_full')
    }

    function closeFull(){
        full.removeClass('music-full--open').detach()
        Controller.toggle('content')
    }

    function seek(event){
        if(!Number.isFinite(audio.duration) || !audio.duration) return

        let rect = event.currentTarget.getBoundingClientRect()

        audio.currentTime = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * audio.duration
    }

    function onKey(event){
        let action = media_keys[event.keyCode]

        if(!action || !activeTrack || destroyed) return

        event.preventDefault()

        if(action == 'toggle') toggle()
        else if(action == 'play') resume()
        else if(action == 'pause') audio.pause()
        else stepTrack(action == 'next' ? 1 : -1)
    }

    function build(){
        html.append(`<div class="music-page__head">
            <div class="music-page__filters" role="group"></div>
            <div class="music-page__hint">${Lang.translate('music_hint')}</div>
        </div>
        <div class="music-page__content"></div>
        <div class="music-page__note">${Lang.translate('music_attribution_note')}</div>`)

        bar.append(`<div class="music-bar__progress"><span></span></div>
            <button class="music-bar__open selector" type="button" aria-label="${Lang.translate('music_open_player')}">
                <span class="music-bar__cover"></span>
                <span class="music-bar__meta"><b class="music-bar__title"></b><span class="music-bar__artist"></span></span>
            </button>
            <div class="music-bar__controls">
                <button class="music-bar__button music-previous selector" type="button" aria-label="${Lang.translate('music_previous')}">${icon('previous')}</button>
                <button class="music-bar__button music-bar__button--main music-play selector" type="button" aria-label="${Lang.translate('music_play')}">${icon('play')}</button>
                <button class="music-bar__button music-next selector" type="button" aria-label="${Lang.translate('music_next')}">${icon('next')}</button>
                <button class="music-bar__button music-bar__expand selector" type="button" aria-label="${Lang.translate('music_open_player')}">${icon('expand')}</button>
            </div>`)

        full.append(`<div class="music-full__backdrop" aria-hidden="true"></div>
            <div class="music-full__body" role="dialog" aria-modal="true" aria-label="${Lang.translate('music_open_player')}">
                <button class="music-full__close selector" type="button" aria-label="${Lang.translate('music_close_player')}">${icon('close')}</button>
                <div class="music-full__stage">
                    <div class="music-full__cover"><span class="music-full__cover-art"></span></div>
                    <div class="music-full__viz" aria-hidden="true">${'<i></i>'.repeat(24)}</div>
                    <div class="music-full__lyrics" aria-live="polite"></div>
                </div>
                <div class="music-full__info">
                    <h2 class="music-full__title"></h2>
                    <div class="music-full__artist"></div>
                    <div class="music-full__album"></div>
                </div>
                <div class="music-full__timeline">
                    <span class="music-full__elapsed">0:00</span>
                    <div class="music-full__track"><span></span></div>
                    <span class="music-full__duration">0:00</span>
                </div>
                <div class="music-full__controls">
                    <button class="music-full__action music-full__favorite selector" type="button" aria-label="${Lang.translate('music_favorite')}" aria-pressed="false">${icon('heart')}</button>
                    <button class="music-full__button music-previous selector" type="button" aria-label="${Lang.translate('music_previous')}">${icon('previous')}</button>
                    <button class="music-full__button music-full__button--main music-play selector" type="button" aria-label="${Lang.translate('music_play')}">${icon('play')}</button>
                    <button class="music-full__button music-next selector" type="button" aria-label="${Lang.translate('music_next')}">${icon('next')}</button>
                    <button class="music-full__action music-full__lyrics-button selector" type="button" aria-label="${Lang.translate('music_show_lyrics')}" aria-pressed="false">${icon('lyrics')}</button>
                    <button class="music-full__action music-full__viz-button selector" type="button" aria-label="${Lang.translate('music_visualizer')}" aria-pressed="false">${icon('bars')}</button>
                </div>
            </div>`)

        renderFilters()

        // the app's hover events do not bubble, so every control is bound directly; the controller turns a click
        // into hover:enter, so binding click as well would fire twice
        bar.add(full).find('.music-previous').on('hover:enter', ()=>stepTrack(-1))
        bar.add(full).find('.music-next').on('hover:enter', ()=>stepTrack(1))
        bar.add(full).find('.music-play').on('hover:enter', toggle)
        bar.find('.music-bar__open, .music-bar__expand').on('hover:enter', openFull)
        full.find('.music-full__close').on('hover:enter', closeFull)
        full.find('.music-full__favorite').on('hover:enter', toggleFavorite)
        full.find('.music-full__lyrics-button').on('hover:enter', ()=>setView('lyrics'))
        full.find('.music-full__viz-button').on('hover:enter', ()=>setView('viz'))
        bar.find('.music-bar__progress').on('click', seek)
        full.find('.music-full__track').on('click', seek)


        audio.addEventListener('play', updatePlayer)
        audio.addEventListener('pause', updatePlayer)
        audio.addEventListener('ended', ()=>stepTrack(1))
        // only a failure of the track that is meant to play counts; swapping or clearing the source also fires 'error'
        audio.addEventListener('error', ()=>{
            if(destroyed || !activeTrack || !audio.error || audio.src != activeTrack.stream) return

            console.error('Music audio source failed to load:', activeTrack.stream)
            Noty.show(Lang.translate('music_playback_error'))
            updatePlayer()
        })
        audio.addEventListener('timeupdate', ()=>{
            if(!Number.isFinite(audio.duration) || !audio.duration) return

            let percent = `${audio.currentTime / audio.duration * 100}%`

            bar.find('.music-bar__progress span').css('width', percent)
            full.find('.music-full__track span').css('width', percent)
            full.find('.music-full__elapsed').text(time(audio.currentTime))
            full.find('.music-full__duration').text(time(audio.duration))
        })

        window.addEventListener('keydown', onKey)

        scroll.minus()
        scroll.append(html)
        root.append(scroll.render(), bar)
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
                Controller.collectionSet(root)
                Controller.collectionFocus(last || false, root)
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
        return root
    }

    this.destroy = function(){
        destroyed = true
        requestId++
        lyricsRequest++

        window.removeEventListener('keydown', onKey)
        audio.pause()
        audio.removeAttribute('src')
        audio.load()

        full.remove()
        scroll.destroy()
        root.remove()
    }
}

export default component

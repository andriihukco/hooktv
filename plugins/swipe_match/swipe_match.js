function startPlugin(){
    if(window.swipe_match_ready) return

    window.swipe_match_ready = true

    let component = 'swipe_match'
    let storage = {
        liked: 'swipe_match_liked',
        disliked: 'swipe_match_disliked',
        skipped: 'swipe_match_skipped',
        threshold: 'swipe_match_threshold',
        media: 'swipe_match_media',
        minRating: 'swipe_match_min_rating',
        minVotes: 'swipe_match_min_votes',
        poolPages: 'swipe_match_pool_pages',
        historyLimit: 'swipe_match_history_limit',
        suggestionMedia: 'swipe_match_suggestion_media',
        suggestionReason: 'swipe_match_suggestion_reason',
        suggestionRating: 'swipe_match_suggestion_rating'
    }

    let manifest = {
        type: 'video',
        version: '1.0.0',
        name: 'Swipe Match',
        description: 'Tinder-like preference trainer and movie suggestions.',
        component: component
    }

    Lampa.Manifest.plugins = manifest

    function getList(name){
        return Lampa.Storage.get(name, '[]')
    }

    function setList(name, list){
        Lampa.Storage.set(name, list)
    }

    function number(name, fallback, min, max){
        let value = parseFloat(Lampa.Storage.get(name, fallback))

        if(isNaN(value)) value = fallback
        if(typeof min == 'number') value = Math.max(min, value)
        if(typeof max == 'number') value = Math.min(max, value)

        return value
    }

    function allSwipes(){
        return getList(storage.liked).concat(getList(storage.disliked), getList(storage.skipped))
    }

    function learnedCount(){
        return getList(storage.liked).length + getList(storage.disliked).length
    }

    function neededCount(){
        return number(storage.threshold, 15, 10, 20)
    }

    function learned(){
        return learnedCount() >= neededCount()
    }

    function key(card){
        return (card.name ? 'tv' : 'movie') + ':' + card.id
    }

    function clearCard(card, method){
        card.source = card.source || 'tmdb'
        card.swipe_method = method || (card.name ? 'tv' : 'movie')

        return card
    }

    function saveSwipe(type, card){
        let list = getList(type)
        let limit = number(storage.historyLimit, 80, 20, 300)
        let id = key(card)

        list = list.filter((item)=>key(item) !== id)
        list.unshift(clearCard(card))

        setList(type, list.slice(0, limit))
    }

    function removeFromAll(card){
        let id = key(card)

        ;[storage.liked, storage.disliked, storage.skipped].forEach((name)=>{
            setList(name, getList(name).filter((item)=>key(item) !== id))
        })
    }

    function openCard(card){
        Lampa.Activity.push({
            url: card.url,
            component: 'full',
            id: card.id,
            method: card.swipe_method || (card.name ? 'tv' : 'movie'),
            card: card,
            source: 'tmdb'
        })
    }

    function random(max){
        return Math.floor(Math.random() * max)
    }

    function escapeHtml(value){
        return (value + '').replace(/[&<>"']/g, (match)=>{
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[match]
        })
    }

    function randomMethod(){
        let media = Lampa.Storage.get(storage.media, 'movie')

        if(media == 'movie' || media == 'tv') return media

        return random(2) ? 'movie' : 'tv'
    }

    function discover(method, filter, page, onSuccess, onError){
        Lampa.Api.sources.tmdb.get('discover/' + method, {
            page: page,
            filter: filter
        }, (json)=>{
            onSuccess(json.results || [], json)
        }, onError, {life: 60 * 24})
    }

    function tmdbGet(url, params, onSuccess, onError){
        Lampa.Api.sources.tmdb.get(url, params || {}, (json)=>{
            onSuccess(json.results || [], json)
        }, onError, {life: 60 * 24})
    }

    function baseFilter(sort){
        return {
            sort_by: sort || 'popularity.desc',
            include_adult: 'false',
            'vote_average.gte': number(storage.minRating, 6.5, 0, 10),
            'vote_count.gte': number(storage.minVotes, 250, 0)
        }
    }

    function scoreGenres(items){
        let scores = {}

        items.forEach((item)=>{
            ;(item.genre_ids || []).forEach((genre)=>{
                scores[genre] = (scores[genre] || 0) + 1
            })
        })

        return Lampa.Arrays.getKeys(scores).sort((a,b)=>scores[b] - scores[a])
    }

    function genreNames(method, ids){
        if(!ids || !ids.length) return []

        return Lampa.Api.sources.tmdb.getGenresNameFromIds(method || 'movie', ids).filter((name)=>name)
    }

    function topGenreName(items){
        let genres = scoreGenres(items)

        if(!genres.length) return 'your favorite genres'

        let liked = items.find((item)=>{
            return item.genre_ids && item.genre_ids.indexOf(parseInt(genres[0])) >= 0
        })

        return genreNames(liked && liked.swipe_method || 'movie', [genres[0]])[0] || 'this genre'
    }

    function suggestionsFilter(){
        let liked = getList(storage.liked)
        let disliked = getList(storage.disliked)
        let filter = baseFilter('vote_average.desc')
        let good = scoreGenres(liked).slice(0, 3)
        let bad = scoreGenres(disliked).slice(0, 2)

        if(good.length) filter.with_genres = good.join(',')
        if(bad.length) filter.without_genres = bad.join(',')

        return filter
    }

    function displayTitle(card){
        return card.title || card.name || 'Untitled'
    }

    function reasonRank(type){
        return {
            genre: 1,
            person: 2,
            title: 3,
            top: 4
        }[type] || 5
    }

    function Component(){
        let html = $('<div class="swipe-match"></div>')
        let listScroll = new Lampa.Scroll({mask: true, over: true, step: 120, end_ratio: 2})
        let networkLoading = false
        let cards = []
        let current = 0
        let activeTab = 'swipe'
        let activeHistory = 'liked'
        let last
        let lastWheel = 0
        let keyHandler
        let suggestionsCache = []
        let undoStack = []
        let lastAction = 'like'

        this.create = function(){
            this.activity.loader(false)
            this.build()

            return this.render()
        }

        this.build = function(){
            html.empty().append(`
                <style>
                    .swipe-match{height:calc(100vh - 5.2em);padding:.7em 2em 1em;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column}
                    .swipe-match__head{display:flex;align-items:baseline;justify-content:center;gap:.8em;margin-bottom:.55em;text-align:center}
                    .swipe-match__title{font-size:1.75em;font-weight:600;line-height:1.05}
                    .swipe-match__stats{opacity:.72;font-size:.88em;line-height:1.15}
                    .swipe-match__tabs{display:flex;justify-content:center;gap:.5em;margin:0 0 .7em}
                    .swipe-match__tab{padding:.55em .9em;border-radius:.4em;background:rgba(255,255,255,.09)}
                    .swipe-match__tab.focus,.swipe-match__tab.active{background:#fff;color:#111}
                    .swipe-match__body{max-width:76em;width:100%;margin:0 auto;flex:1;min-height:0}
                    .swipe-match__body>.scroll{height:100%;width:100%}
                    .swipe-match__scroll-body{padding-bottom:1em}
                    .swipe-match-card{display:flex;flex-direction:column;align-items:center;max-width:32em;margin:0 auto;text-align:center}
                    .swipe-match-card__poster{width:min(28vh,12.5em);aspect-ratio:2/3;border-radius:.55em;overflow:hidden;background:rgba(255,255,255,.08);box-shadow:0 1em 3em rgba(0,0,0,.25)}
                    .swipe-match-card__poster.focus{outline:.22em solid #fff}
                    .swipe-match-card__poster img{width:100%;height:100%;object-fit:cover;display:block}
                    .swipe-match-card__content{margin-top:.55em;width:100%}
                    .swipe-match-card__meta{display:flex;justify-content:center;gap:.4em;flex-wrap:wrap;margin:.45em 0 .55em}
                    .swipe-match-chip{padding:.25em .45em;border-radius:.3em;background:rgba(255,255,255,.13);font-size:.88em}
                    .swipe-match-card__name{font-size:1.55em;font-weight:700;line-height:1.08;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                    .swipe-match-card__name.focus{color:#fff;text-decoration:underline;text-underline-offset:.16em}
                    .swipe-match-card__text{font-size:.84em;line-height:1.28;opacity:.78;max-width:32em;margin:.55em auto 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
                    .swipe-match-actions{display:flex;justify-content:center;gap:.5em;flex-wrap:wrap;margin-top:.55em}
                    .swipe-match-button{display:flex;align-items:center;justify-content:center;gap:.45em;min-width:3.1em;padding:.62em .8em;border-radius:.42em;background:rgba(255,255,255,.12)}
                    .swipe-match-button.focus{background:#fff;color:#111}
                    .swipe-match-button--undo{width:3.2em;height:2.72em;min-width:3.2em;padding:0}
                    .swipe-match-button--undo svg{width:1.55em;height:1.55em;display:block;margin:auto}
                    .swipe-match-button--like{background:rgba(36,170,92,.82)}
                    .swipe-match-button--dislike{background:rgba(218,62,62,.82)}
                    .swipe-match-button--skip{font-size:.82em;opacity:.82;padding:.52em .62em}
                    .swipe-match-button--like.focus{background:#24d06d;color:#07130b}
                    .swipe-match-button--dislike.focus{background:#ff5a5a;color:#1d0505}
                    .swipe-match-subtabs{display:flex;justify-content:center;gap:.55em;margin:0 0 1.1em}
                    .swipe-match-subtab{padding:.65em .9em;border-radius:.45em;background:rgba(255,255,255,.09)}
                    .swipe-match-subtab.focus,.swipe-match-subtab.active{background:#fff;color:#111}
                    .swipe-match-section{margin-bottom:1.8em}
                    .swipe-match-section:last-child{margin-bottom:.4em}
                    .swipe-match-section__title{font-size:1.25em;font-weight:600;margin:0 0 .75em}
                    .swipe-match-section__title span{opacity:.68;font-weight:400}
                    .swipe-match-filters{display:flex;gap:.45em;flex-wrap:wrap;justify-content:center;align-items:center;margin:0 0 1em}
                    .swipe-match-filter-group{display:flex;gap:.45em;align-items:center;flex-wrap:wrap}
                    .swipe-match-filter-divider{width:1px;height:1.7em;background:rgba(255,255,255,.18);margin:0 .25em}
                    .swipe-match-filter{padding:.5em .72em;border-radius:.4em;background:rgba(255,255,255,.09);font-size:.9em}
                    .swipe-match-filter.focus,.swipe-match-filter.active{background:#fff;color:#111}
                    .swipe-match-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10em,1fr));gap:1em}
                    .swipe-match-item{background:rgba(255,255,255,.08);border-radius:.5em;overflow:hidden}
                    .swipe-match-item.focus{outline:.22em solid #fff}
                    .swipe-match-item img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block;background:rgba(255,255,255,.08)}
                    .swipe-match-item__body{padding:.7em}
                    .swipe-match-item__name{font-weight:600;line-height:1.22}
                    .swipe-match-item__meta{font-size:.9em;opacity:.7;margin-top:.3em}
                    .swipe-match-item__reason{font-size:.82em;line-height:1.2;margin-top:.45em;color:rgba(255,255,255,.78);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
                    .swipe-match-empty{padding:2em;border-radius:.5em;background:rgba(255,255,255,.08);max-width:42em;line-height:1.45}
                    @media(max-width:700px){.swipe-match{height:calc(100vh - 4.6em);padding:.55em 1em}.swipe-match__head{display:block}.swipe-match-card__poster{width:min(32vh,12em)}.swipe-match-card__name{font-size:1.35em}.swipe-match-card__text{-webkit-line-clamp:1}.swipe-match-grid{grid-template-columns:repeat(auto-fill,minmax(8.5em,1fr))}}
                </style>
                <div class="swipe-match__head">
                    <div class="swipe-match__title">Swipe Match</div>
                    <div class="swipe-match__stats"></div>
                </div>
                <div class="swipe-match__tabs">
                    <div class="swipe-match__tab selector" data-tab="swipe">Swipe</div>
                    <div class="swipe-match__tab selector" data-tab="suggestions">Suggestions</div>
                    <div class="swipe-match__tab selector" data-tab="history">History</div>
                </div>
                <div class="swipe-match__body"></div>
            `)

            listScroll.onWheel = (step)=>{
                this.scrollList(step > 0 ? 1 : -1)
            }

            this.bindTabs()
            this.bindWheel()
            this.bindKeys()
            this.renderTab()
        }

        this.scrollList = function(direction){
            if(activeTab == 'swipe') return

            listScroll.wheel(direction > 0 ? 120 : -120)
        }

        this.bindWheel = function(){
            html.find('.swipe-match__body').off('wheel.swipe_match mousewheel.swipe_match').on('wheel.swipe_match mousewheel.swipe_match', (e)=>{
                if(activeTab == 'swipe') return

                let event = e.originalEvent || e
                let delta = event.deltaY || -event.wheelDelta || event.detail || 0
                let direction = delta > 0 ? 1 : -1

                if(!delta) return
                if(Date.now() - lastWheel < 140) return

                lastWheel = Date.now()

                if($(e.target).parents('.scroll').length){
                    let position = listScroll.position()

                    setTimeout(()=>{
                        if(listScroll.position() == position) this.scrollList(direction)
                    }, 60)

                    return
                }

                e.preventDefault()
                this.scrollList(direction)
            })
        }

        this.bindKeys = function(){
            if(keyHandler) Lampa.Keypad.listener.remove('keydown', keyHandler)

            keyHandler = (e)=>{
                let active = Lampa.Activity.active && Lampa.Activity.active()

                if(!active || active.component != component) return
                if(activeTab == 'swipe') return
                if(e.code != 38 && e.code != 40) return

                e.event.preventDefault()

                if(e.code == 40){
                    if(Navigator.canmove('down')) Navigator.move('down')
                    else this.scrollList(1)
                }
                else{
                    if(Navigator.canmove('up')) Navigator.move('up')
                    else this.scrollList(-1)
                }
            }

            Lampa.Keypad.listener.follow('keydown', keyHandler)
        }

        this.contentBody = function(scrollable){
            let body = html.find('.swipe-match__body').empty()

            if(scrollable){
                let wrap = $('<div class="swipe-match__scroll-body"></div>')

                listScroll.clear()
                listScroll.reset()
                listScroll.append(wrap)
                body.append(listScroll.render(true))

                return wrap
            }

            return body
        }

        this.bindTabs = function(){
            html.find('.swipe-match__tab').on('hover:enter', (e)=>{
                let tab = $(e.currentTarget).data('tab')

                if(tab == 'suggestions' && !learned()){
                    return Lampa.Noty.show('Swipe at least ' + neededCount() + ' movies or shows first')
                }

                activeTab = tab
                this.renderTab()
            })
        }

        this.updateStats = function(){
            let count = learnedCount()
            let need = neededCount()
            let status = learned() ? 'Suggestions enabled' : (need - count) + ' more swipes to unlock suggestions'

            html.find('.swipe-match__stats').text(count + ' / ' + need + ' learned · ' + getList(storage.liked).length + ' liked · ' + getList(storage.disliked).length + ' disliked · ' + status)
            html.find('.swipe-match__tab').removeClass('active').filter('[data-tab="'+activeTab+'"]').addClass('active')
        }

        this.renderTab = function(){
            this.updateStats()

            if(activeTab == 'swipe') this.renderSwipe()
            if(activeTab == 'suggestions') this.renderSuggestions()
            if(activeTab == 'history') this.renderHistory()

            this.bindFocus()
        }

        this.loadCards = function(call){
            if(networkLoading) return

            networkLoading = true

            let method = randomMethod()
            let page = random(number(storage.poolPages, 20, 1, 100)) + 1
            let seen = {}

            allSwipes().concat(cards).forEach((card)=>{
                seen[key(card)] = true
            })

            discover(method, baseFilter('popularity.desc'), page, (items)=>{
                networkLoading = false

                cards = cards.concat(items.map((item)=>clearCard(item, method)).filter((item)=>{
                    return item.poster_path && !seen[key(item)]
                }))

                if(call) call()
            }, ()=>{
                networkLoading = false
                Lampa.Noty.show('Swipe Match: failed to load titles')
            })
        }

        this.currentCard = function(){
            return cards[current]
        }

        this.renderSwipe = function(){
            this.updateStats()

            let body = this.contentBody(false)

            if(!this.currentCard()){
                body.append('<div class="swipe-match-empty">Loading swipe cards...</div>')

                return this.loadCards(()=>{
                    this.renderSwipe()
                    this.bindFocus()
                })
            }

            let card = this.currentCard()
            let title = displayTitle(card)
            let year = ((card.release_date || card.first_air_date || '') + '').slice(0,4)
            let img = Lampa.Api.img(card.poster_path, 'w500')

            body.append(`
                <div class="swipe-match-card">
                    <div class="swipe-match-card__poster selector" data-action="open"><img src="${img}"></div>
                    <div class="swipe-match-card__content">
                        <div class="swipe-match-card__name selector" data-action="open">${escapeHtml(title)}</div>
                        <div class="swipe-match-card__meta">
                            <div class="swipe-match-chip">${card.swipe_method == 'tv' ? 'TV' : 'Movie'}</div>
                            <div class="swipe-match-chip">${year || 'No year'}</div>
                            <div class="swipe-match-chip">${(card.vote_average || 0).toFixed ? card.vote_average.toFixed(1) : card.vote_average} TMDB</div>
                            <div class="swipe-match-chip">${card.vote_count || 0} votes</div>
                        </div>
                        <div class="swipe-match-actions">
                            <div class="swipe-match-button swipe-match-button--undo selector" data-action="undo">
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M9 6L4 11l5 5" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M5 11h8.5a5.5 5.5 0 1 1-3.9 9.4" stroke="currentColor" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="swipe-match-button swipe-match-button--like selector" data-action="like">👍 Like</div>
                            <div class="swipe-match-button swipe-match-button--dislike selector" data-action="dislike">👎 Dislike</div>
                            <div class="swipe-match-button swipe-match-button--skip selector" data-action="skip">Didn't watch</div>
                        </div>
                        <div class="swipe-match-card__text">${escapeHtml(card.overview || 'No description.')}</div>
                    </div>
                </div>
            `)

            body.find('[data-action]').on('hover:enter', (e)=>{
                this.action($(e.currentTarget).data('action'))
            })

            let focus = body.find('[data-action="'+lastAction+'"]')[0]

            if(focus) last = focus
        }

        this.action = function(action){
            let card = this.currentCard()

            if(action == 'undo') return this.undoSwipe()
            if(!card) return
            if(action == 'open') return openCard(card)

            lastAction = action

            removeFromAll(card)

            if(action == 'like') saveSwipe(storage.liked, card)
            if(action == 'dislike') saveSwipe(storage.disliked, card)
            if(action == 'skip') saveSwipe(storage.skipped, card)

            undoStack.push({
                action: action,
                card: clearCard(Object.assign({}, card), card.swipe_method),
                index: current
            })

            if(undoStack.length > 20) undoStack.shift()

            current++

            if(cards.length - current < 5) this.loadCards()

            this.renderSwipe()
            this.bindFocus()
        }

        this.undoSwipe = function(){
            let previous = undoStack.pop()

            if(!previous){
                return Lampa.Noty.show('No previous swipe to undo')
            }

            removeFromAll(previous.card)
            current = Math.max(0, previous.index)
            lastAction = 'undo'

            this.renderSwipe()
            this.bindFocus()
        }

        this.renderSuggestions = function(){
            this.updateStats()

            let body = this.contentBody(true)

            if(!learned()){
                return body.append('<div class="swipe-match-empty">Suggestions unlock after ' + neededCount() + ' liked/disliked swipes. Current progress: ' + learnedCount() + '.</div>')
            }

            body.append('<div class="swipe-match-empty">Loading suggestions from your liked titles...</div>')

            let exclude = {}
            let suggestions = []
            let suggestionMap = {}
            let status = {
                pending: 0,
                finished: false
            }

            allSwipes().forEach((card)=>{
                exclude[key(card)] = true
            })

            let appendSuggestion = (reason, reasonType, items, method)=>{
                items.forEach((item)=>{
                    item = clearCard(item, method)
                    let id = key(item)

                    if(!item.poster_path || exclude[id]) return

                    if(suggestionMap[id]){
                        suggestionMap[id].swipe_reasons.push({
                            text: reason,
                            type: reasonType,
                            bucket: reasonType + ':' + reason
                        })

                        return
                    }

                    item.swipe_reasons = [{
                        text: reason,
                        type: reasonType,
                        bucket: reasonType + ':' + reason
                    }]
                    item.swipe_reason = reason
                    item.swipe_reason_type = reasonType
                    suggestionMap[id] = item
                    suggestions.push(item)
                })
            }

            let done = ()=>{
                status.pending--

                if(status.pending <= 0 && status.finished){
                    suggestionsCache = suggestions
                    this.renderSuggestionMixed(body, suggestionsCache)
                }
            }

            let queue = (call)=>{
                status.pending++
                call(done)
            }

            getList(storage.liked).slice(0, 6).forEach((liked)=>{
                let method = liked.swipe_method || (liked.name ? 'tv' : 'movie')
                let title = displayTitle(liked)

                queue((next)=>{
                    tmdbGet(method + '/' + liked.id + '/recommendations', {}, (items)=>{
                        appendSuggestion('Because you liked ' + title, 'title', items, method)

                        if(items.length) next()
                        else{
                            tmdbGet(method + '/' + liked.id + '/similar', {}, (similar)=>{
                                appendSuggestion('Because you liked ' + title, 'title', similar, method)
                                next()
                            }, next)
                        }
                    }, ()=>{
                        tmdbGet(method + '/' + liked.id + '/similar', {}, (items)=>{
                            appendSuggestion('Because you liked ' + title, 'title', items, method)
                            next()
                        }, next)
                    })
                })

                queue((next)=>{
                    tmdbGet(method + '/' + liked.id + '/credits', {}, (items, json)=>{
                        let cast = (json.cast || []).filter((person)=>person.id).slice(0, 2)
                        let director = (json.crew || []).find((person)=>person.job == 'Director')
                        let people = director ? [director].concat(cast) : cast
                        let pending = people.length

                        if(!pending) return next()

                        people.forEach((person)=>{
                            let filter = baseFilter('vote_average.desc')

                            if(person.job == 'Director') filter.with_crew = person.id
                            else filter.with_cast = person.id

                            discover(method, filter, 1, (results)=>{
                                appendSuggestion('Because you like ' + person.name, 'person', results, method)
                                pending--
                                if(!pending) next()
                            }, ()=>{
                                pending--
                                if(!pending) next()
                            })
                        })
                    }, next)
                })
            })

            scoreGenres(getList(storage.liked)).slice(0, 3).forEach((genreId)=>{
                ;['movie', 'tv'].forEach((method)=>{
                    queue((next)=>{
                        let filter = baseFilter('vote_average.desc')
                        let genre = genreNames(method, [genreId])[0] || 'this genre'
                        let bad = scoreGenres(getList(storage.disliked)).slice(0, 2)

                        filter.with_genres = genreId
                        if(bad.length) filter.without_genres = bad.join(',')

                        discover(method, filter, 1, (items)=>{
                            appendSuggestion('Because you like ' + genre, 'genre', items, method)
                            next()
                        }, next)
                    })
                })
            })

            queue((next)=>{
                let method = randomMethod()

                discover(method, baseFilter('vote_average.desc'), 1, (items)=>{
                    appendSuggestion('Highly rated backup pick', 'top', items, method)
                    next()
                }, next)
            })

            status.finished = true
        }

        this.renderSuggestionFilters = function(body){
            let media = Lampa.Storage.get(storage.suggestionMedia, 'all')
            let reason = Lampa.Storage.get(storage.suggestionReason, 'all')
            let rating = Lampa.Storage.get(storage.suggestionRating, 'all')
            let filters = $(`
                <div class="swipe-match-filters">
                    <div class="swipe-match-filter-group">
                        <div class="swipe-match-filter selector ${media == 'all' ? 'active' : ''}" data-suggestion-filter="media" data-value="all">All</div>
                        <div class="swipe-match-filter selector ${media == 'movie' ? 'active' : ''}" data-suggestion-filter="media" data-value="movie">Movies</div>
                        <div class="swipe-match-filter selector ${media == 'tv' ? 'active' : ''}" data-suggestion-filter="media" data-value="tv">TV</div>
                    </div>
                    <div class="swipe-match-filter-divider"></div>
                    <div class="swipe-match-filter-group">
                        <div class="swipe-match-filter selector ${reason == 'all' ? 'active' : ''}" data-suggestion-filter="reason" data-value="all">All reasons</div>
                        <div class="swipe-match-filter selector ${reason == 'title' ? 'active' : ''}" data-suggestion-filter="reason" data-value="title">Liked titles</div>
                        <div class="swipe-match-filter selector ${reason == 'genre' ? 'active' : ''}" data-suggestion-filter="reason" data-value="genre">Genres</div>
                        <div class="swipe-match-filter selector ${reason == 'person' ? 'active' : ''}" data-suggestion-filter="reason" data-value="person">People</div>
                        <div class="swipe-match-filter selector ${reason == 'top' ? 'active' : ''}" data-suggestion-filter="reason" data-value="top">Top rated</div>
                    </div>
                    <div class="swipe-match-filter-divider"></div>
                    <div class="swipe-match-filter-group">
                        <div class="swipe-match-filter selector ${rating == 'all' ? 'active' : ''}" data-suggestion-filter="rating" data-value="all">Any rating</div>
                        <div class="swipe-match-filter selector ${rating == '7' ? 'active' : ''}" data-suggestion-filter="rating" data-value="7">7+</div>
                        <div class="swipe-match-filter selector ${rating == '8' ? 'active' : ''}" data-suggestion-filter="rating" data-value="8">8+</div>
                    </div>
                </div>
            `)

            filters.find('[data-suggestion-filter]').on('hover:enter', (e)=>{
                let item = $(e.currentTarget)
                let type = item.data('suggestion-filter')
                let value = item.data('value') + ''

                if(type == 'media') Lampa.Storage.set(storage.suggestionMedia, value)
                if(type == 'reason') Lampa.Storage.set(storage.suggestionReason, value)
                if(type == 'rating') Lampa.Storage.set(storage.suggestionRating, value)

                this.renderSuggestionMixed(body, suggestionsCache)
            })

            body.append(filters)
        }

        this.filterSuggestions = function(list){
            let media = Lampa.Storage.get(storage.suggestionMedia, 'all')
            let reason = Lampa.Storage.get(storage.suggestionReason, 'all')
            let rating = Lampa.Storage.get(storage.suggestionRating, 'all')

            return list.filter((item)=>{
                let method = item.swipe_method || (item.name ? 'tv' : 'movie')
                let reasons = item.swipe_reasons || [{type: item.swipe_reason_type, text: item.swipe_reason}]

                if(media != 'all' && method != media) return false
                if(reason != 'all' && !reasons.find((entry)=>entry.type == reason)) return false
                if(rating != 'all' && (parseFloat(item.vote_average) || 0) < parseFloat(rating)) return false

                return true
            })
        }

        this.cardReason = function(card, mode){
            if(mode != 'suggestion') return ''

            let reason = Lampa.Storage.get(storage.suggestionReason, 'all')
            let reasons = card.swipe_reasons || [{type: card.swipe_reason_type, text: card.swipe_reason}]
            let match = reason == 'all' ? reasons[0] : reasons.find((entry)=>entry.type == reason)

            return card.swipe_display_reason || (match && match.text) || card.swipe_reason || 'Recommended from your swipes'
        }

        this.mixedSuggestions = function(list){
            let reason = Lampa.Storage.get(storage.suggestionReason, 'all')
            let buckets = {}

            list.forEach((item)=>{
                let reasons = (item.swipe_reasons || [{type: item.swipe_reason_type, text: item.swipe_reason}]).slice()

                if(reason != 'all') reasons = reasons.filter((entry)=>entry.type == reason)
                if(!reasons.length) reasons = [{type: item.swipe_reason_type || 'top', text: item.swipe_reason || 'Recommended from your swipes'}]

                reasons.sort((a,b)=>reasonRank(a.type) - reasonRank(b.type))

                let chosen = reasons[0]
                let bucket = chosen.bucket || chosen.type + ':' + chosen.text

                if(!buckets[bucket]){
                    buckets[bucket] = {
                        type: chosen.type || 'top',
                        reason: chosen.text,
                        items: []
                    }
                }

                buckets[bucket].items.push(item)
            })

            let groups = Lampa.Arrays.getKeys(buckets).map((name)=>{
                return {
                    name: name,
                    type: buckets[name].type,
                    reason: buckets[name].reason,
                    items: buckets[name].items.sort((a,b)=>(b.vote_average || 0) - (a.vote_average || 0))
                }
            }).sort((a,b)=>{
                let rank = reasonRank(a.type) - reasonRank(b.type)

                if(rank !== 0) return rank

                return b.items.length - a.items.length
            })

            let mixed = []
            let seen = {}
            let guard = 0

            while(groups.length && guard < 500){
                guard++

                groups.slice().forEach((group)=>{
                    let item = group.items.shift()

                    while(item && seen[key(item)]){
                        item = group.items.shift()
                    }

                    if(item){
                        let copy = Object.assign({}, item)

                        copy.swipe_display_reason = group.reason
                        mixed.push(copy)
                        seen[key(item)] = true
                    }

                    if(!group.items.length){
                        groups = groups.filter((entry)=>entry !== group)
                    }
                })
            }

            return mixed
        }

        this.renderSuggestionMixed = function(body, list){
            body.empty()
            this.renderSuggestionFilters(body)

            let filtered = this.mixedSuggestions(this.filterSuggestions(list)).slice(0, 120)

            if(!filtered.length){
                body.append('<div class="swipe-match-empty">No personalized matches were available yet, so try a few more likes or lower the rating/vote filters in Swipe Match settings.</div>')
                return this.bindFocus()
            }

            this.renderGrid(body, filtered, 'suggestion')

            Lampa.Layer.visible(listScroll.render(true))
            this.bindFocus()
        }

        this.renderHistory = function(){
            this.updateStats()

            let body = this.contentBody(true)
            let liked = getList(storage.liked).map((item)=>Object.assign({swipe_status: 'Liked'}, item))
            let disliked = getList(storage.disliked).map((item)=>Object.assign({swipe_status: 'Disliked'}, item))
            let skipped = getList(storage.skipped).map((item)=>Object.assign({swipe_status: "Didn't watch"}, item))
            let groups = {
                liked: liked,
                disliked: disliked,
                unwatched: skipped
            }
            let labels = {
                liked: 'Liked',
                disliked: 'Disliked',
                unwatched: "Didn't watch"
            }
            let list = groups[activeHistory] || []

            body.append(`
                <div class="swipe-match-subtabs">
                    <div class="swipe-match-subtab selector ${activeHistory == 'liked' ? 'active' : ''}" data-history="liked">Liked (${liked.length})</div>
                    <div class="swipe-match-subtab selector ${activeHistory == 'disliked' ? 'active' : ''}" data-history="disliked">Disliked (${disliked.length})</div>
                    <div class="swipe-match-subtab selector ${activeHistory == 'unwatched' ? 'active' : ''}" data-history="unwatched">Didn't watch (${skipped.length})</div>
                </div>
            `)

            body.find('[data-history]').on('hover:enter', (e)=>{
                activeHistory = $(e.currentTarget).data('history')
                this.renderHistory()
                this.bindFocus()
            })

            if(!list.length){
                body.append('<div class="swipe-match-empty">No ' + labels[activeHistory].toLowerCase() + ' titles yet.</div>')
                Lampa.Layer.visible(listScroll.render(true))

                return
            }

            this.renderGrid(body, list, 'history')
            Lampa.Layer.visible(listScroll.render(true))
        }

        this.renderGrid = function(body, list, mode){
            let grid = $('<div class="swipe-match-grid"></div>')

            list.forEach((card)=>{
                let title = card.title || card.name || 'Untitled'
                let year = ((card.release_date || card.first_air_date || '') + '').slice(0,4)
                let reason = this.cardReason(card, mode)
                let item = $(`
                    <div class="swipe-match-item selector">
                        <img src="${card.poster_path ? Lampa.Api.img(card.poster_path, 'w300') : './img/img_load.svg'}">
                        <div class="swipe-match-item__body">
                            <div class="swipe-match-item__name">${escapeHtml(title)}</div>
                            <div class="swipe-match-item__meta">${mode == 'history' ? card.swipe_status + ' · ' : ''}${year || 'No year'} · ${card.vote_average || 0}</div>
                            ${mode == 'suggestion' ? '<div class="swipe-match-item__reason">' + escapeHtml(reason) + '</div>' : ''}
                        </div>
                    </div>
                `)

                item.on('hover:enter',()=>openCard(card))

                grid.append(item)
            })

            body.append(grid)
        }

        this.bindFocus = function(){
            html.find('.selector').off('hover:focus hover:hover hover:touch').on('hover:focus hover:hover hover:touch',(e)=>{
                last = e.target

                if(activeTab != 'swipe' && $(e.target).hasClass('swipe-match-item')){
                    listScroll.update(e.target, true)
                }
            })

            this.start()
        }

        this.start = function(){
            if(Lampa.Activity.active() && Lampa.Activity.active().activity !== this.activity) return

            Lampa.Controller.add('content',{
                toggle: ()=>{
                    Lampa.Controller.collectionSet(html)
                    Lampa.Controller.collectionFocus(last || html.find('.selector')[0], html)
                },
                up: ()=>{
                    if(Navigator.canmove('up')) Navigator.move('up')
                    else if(activeTab != 'swipe') this.scrollList(-1)
                    else Lampa.Controller.toggle('head')
                },
                down: ()=>{
                    if(Navigator.canmove('down')) Navigator.move('down')
                    else if(activeTab != 'swipe') this.scrollList(1)
                },
                left: ()=>{
                    if(Navigator.canmove('left')) Navigator.move('left')
                    else Lampa.Controller.toggle('menu')
                },
                right: ()=>{
                    Navigator.move('right')
                },
                back: ()=>{
                    Lampa.Activity.backward()
                }
            })

            Lampa.Controller.toggle('content')
        }

        this.pause = function(){}
        this.stop = function(){}

        this.render = function(){
            return html
        }

        this.destroy = function(){
            if(keyHandler) Lampa.Keypad.listener.remove('keydown', keyHandler)
            listScroll.destroy()
            html.remove()
            html = null
            cards = null
        }
    }

    function addSettings(){
        Lampa.SettingsApi.addComponent({
            component: component,
            icon: `<svg viewBox="0 0 48 48" fill="none">
                <path d="M14 16c0-4 3-7 7-7 2.5 0 4.5 1.2 6 3 1.5-1.8 3.5-3 6-3 4 0 7 3 7 7 0 8-13 16-13 16S14 24 14 16Z" stroke="white" stroke-width="4" fill="none"/>
                <path d="M14 38h26" stroke="white" stroke-width="4" stroke-linecap="round"/>
            </svg>`,
            name: 'Swipe Match'
        })

        function param(name, type, values, valueDefault, title, description){
            Lampa.SettingsApi.addParam({
                component: component,
                param: {
                    name: name,
                    type: type,
                    values: values || '',
                    default: valueDefault
                },
                field: {
                    name: title,
                    description: description
                }
            })
        }

        function title(name){
            Lampa.SettingsApi.addParam({
                component: component,
                param: {
                    type: 'title'
                },
                field: {
                    name: name
                }
            })
        }

        title('Learning')

        param(storage.threshold, 'select', {
            '10': '10 swipes',
            '12': '12 swipes',
            '15': '15 swipes',
            '20': '20 swipes'
        }, '15', 'Minimum swipes for suggestions')

        param(storage.media, 'select', {
            mixed: 'Movies and TV',
            movie: 'Movies only',
            tv: 'TV only'
        }, 'movie', 'Media type')

        title('Candidate filters')

        param(storage.minRating, 'select', {
            '0': 'Any',
            '5': '5+',
            '6': '6+',
            '6.5': '6.5+',
            '7': '7+',
            '7.5': '7.5+',
            '8': '8+'
        }, '6.5', 'Minimum rating')

        param(storage.minVotes, 'select', {
            '0': 'Any',
            '50': '50+',
            '100': '100+',
            '250': '250+',
            '500': '500+',
            '1000': '1000+'
        }, '250', 'Minimum votes')

        param(storage.poolPages, 'select', {
            '5': 'Top 100',
            '10': 'Top 200',
            '20': 'Top 400',
            '50': 'Top 1000',
            '100': 'Top 2000'
        }, '20', 'Swipe pool size')

        param(storage.historyLimit, 'select', {
            '20': '20 titles',
            '50': '50 titles',
            '80': '80 titles',
            '150': '150 titles',
            '300': '300 titles'
        }, '80', 'History limit')

        title('Suggestion filters')

        param(storage.suggestionMedia, 'select', {
            all: 'Movies and TV',
            movie: 'Movies only',
            tv: 'TV only'
        }, 'all', 'Suggestion media')

        param(storage.suggestionReason, 'select', {
            all: 'All reasons',
            title: 'Liked titles',
            genre: 'Genres',
            person: 'People',
            top: 'Top rated'
        }, 'all', 'Suggestion reason')

        param(storage.suggestionRating, 'select', {
            all: 'Any',
            '7': '7+',
            '8': '8+'
        }, 'all', 'Suggestion rating')

        Lampa.SettingsApi.addParam({
            component: component,
            param: {
                name: 'swipe_match_clear_history',
                type: 'button'
            },
            field: {
                name: 'Clear swipe history'
            },
            onChange: ()=>{
                setList(storage.liked, [])
                setList(storage.disliked, [])
                setList(storage.skipped, [])

                Lampa.Noty.show('Swipe Match history cleared')
            }
        })
    }

    function add(){
        if(Lampa.Head.render().find('.open--swipe-match').length) return

        let icon = `<svg viewBox="0 0 48 48" fill="none">
            <path d="M14 16c0-4 3-7 7-7 2.5 0 4.5 1.2 6 3 1.5-1.8 3.5-3 6-3 4 0 7 3 7 7 0 8-13 16-13 16S14 24 14 16Z" stroke="currentColor" stroke-width="4" fill="none"/>
            <path d="M14 38h26" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        </svg>`

        Lampa.Head.addIcon(icon, ()=>{
            Lampa.Activity.push({
                url: '',
                title: 'Swipe Match',
                component: component,
                page: 1
            })
        }).addClass('open--swipe-match')
    }

    Lampa.Component.add(component, Component)
    addSettings()

    if(window.appready) add()
    else{
        Lampa.Listener.follow('app', function(e){
            if(e.type == 'ready') add()
        })
    }
}

startPlugin()

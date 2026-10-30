import Lang from '../core/lang'
import Storage from '../core/storage/storage'
import Controller from '../core/controller'
import Favorite from '../core/favorite'
import Api from '../core/api/api'
import TMDB from '../core/tmdb/tmdb'
import Activity from './activity/activity'
import Select from './select'
import Search from './search/global'
import Filter from '../utils/library_filter'
import Extra from '../utils/tmdb_extra'
import TabHotkeys from './tab_hotkeys'

/**
 * HOOK TV: a "Filters" pill stays at the bottom of the top-level pages (Home,
 * Movies, Series, Saved and History when they hold something) and the search
 * overlay; nested pages never get it. It opens a right-hand panel (a bottom
 * sheet on phones) styled like the other sheets: rating and year ranges,
 * genres and countries as multi-pick chips.
 *
 * Where the filter runs depends on the page:
 *  library - Saved and History: your own cards, filtered locally (favorites API)
 *  remote  - Home / Movies / Series: Show opens a grid that TMDB filters
 *            (discover query, sources/tmdb.js); Home also picks films or series
 *  search  - the search overlay: the found rows, filtered locally
 */

const GAP = 16 // px between the pill and the screen edge or the tab bar

let dock
let pill
let panel
let object   // activity the pill belongs to
let ctx      // context the panel was opened for
let draft    // filter being edited in the panel
let returnTo
let counting
let reopening

// the last filter shown from each tab, so the panel opens where you left it
let last = {type: 'movie', main: null, movie: null, tv: null}

function el(tag, cls, html){
    let node = document.createElement(tag)

    node.className = cls
    if(html) node.innerHTML = html

    return node
}

// Lampa turns clicks on collection elements into hover:enter (and marks them trigger_click);
// plain clicks only run for elements it has not bound
function action(node, run){
    node.addEventListener('hover:enter', run)
    node.addEventListener('click', ()=>{
        if(!node.trigger_click) run()
    })
}

function context(){
    if(document.body.classList.contains('search--open')){
        return Filter.search.query ? {kind: 'search', filter: Filter.search.filter, cards: Filter.search.results} : null
    }

    if(!object) return null

    let c = object.component

    // Saved, History and every Saved folder, only with something in them
    if(c == 'bookmarks' || c == 'favorite'){
        let cards = library()

        return cards.length ? {kind: 'library', filter: object.library_filter, cards} : null
    }

    // Home / Movies / Series tabs are rows; Show opens a filtered grid, Home lets you pick the type
    if(c == 'main') return {kind: 'remote', jump: true, pick: true, type: last.type, filter: last.main}

    if(c == 'category' && (object.url == 'movie' || object.url == 'tv')) return {kind: 'remote', jump: true, type: object.url, filter: last[object.url]}

    // a row opened with More (Watching now, Top rated, a genre…): the filter narrows that list
    if(c == 'category_full' && tmdbList(object)) return {kind: 'remote', type: Filter.type(object.url), path: object.url, filter: object.library_filter}

    return null
}

// TMDB lists the API can re-ask with a filter; search results filter what came back
function tmdbList(object){
    return (!object.source || object.source == 'tmdb') && /^(movie|tv|trending|discover)\//.test(object.url || '')
}

function library(){
    let list = []
    let seen = {}
    let add  = (card)=>{
        let key = (card.name ? 'tv' : 'movie') + card.id

        if(!seen[key]){
            seen[key] = true
            list.push(card)
        }
    }

    if(object.component == 'bookmarks'){
        let all = Favorite.all()

        // Saved shows its shelves only; History is a page of its own, so its items don't count here
        delete all.history

        for(let key in all) if(Array.isArray(all[key])) all[key].forEach(add)
    }
    else{
        Favorite.get({type: object.type}).forEach(card=>{
            if(object.filter == 'tv' && !card.name) return
            if(object.filter == 'movie' && card.name) return

            add(card)
        })
    }

    return list
}

// chips and year span for the panel: from the cards when we have them, else everything TMDB has
function options(){
    if(ctx.cards){
        let found = Filter.options(ctx.cards)

        // films found by search carry no country, so offer the common ones there
        if(ctx.kind == 'search') found.countries = found.countries.concat(Filter.COUNTRIES.filter(c=>found.countries.indexOf(c) < 0))

        return found
    }

    let year = new Date().getFullYear()

    return {
        genres: (Api.sources.tmdb.genres[ctx.type] || []).map(g=>g.id),
        countries: Filter.COUNTRIES,
        years: [1920, year + 1]
    }
}

function genreName(id){
    let tmdb  = Api.sources.tmdb
    let first = ctx.type == 'tv' ? 'tv' : 'movie'

    return tmdb.getGenresNameFromIds(first, [id])[0] || tmdb.getGenresNameFromIds(first == 'tv' ? 'movie' : 'tv', [id])[0] || ''
}

function countryName(code){
    try{
        return new Intl.DisplayNames([Storage.get('language', 'en')], {type: 'region'}).of(code) || code
    }
    catch(e){
        return code
    }
}

function boundText(group, i){
    let value = draft[group][i]

    return value == null ? Lang.translate('filter_any') : value + ''
}

function showText(total){
    return Lang.translate('hooktv_filter_show') + (total == null ? '' : ' · ' + total)
}

// TMDB grids: ask TMDB how many titles match, a moment after the last change
function remoteCount(){
    clearTimeout(counting)

    let button = panel.querySelector('.library-filter__apply')

    if(ctx.kind !== 'remote') return button.textContent = showText(null)

    counting = setTimeout(()=>{
        let path  = Filter.discover(ctx.path || 'discover/' + ctx.type, draft)
        let asked = draft

        $.get(TMDB.api(path + '&api_key=' + TMDB.key()), (data)=>{
            if(asked === draft && data && typeof data.total_results == 'number') button.textContent = showText(data.total_results.toLocaleString())
        })
    }, 350)
}

function update(){
    panel.querySelectorAll('.library-filter__bound').forEach(bound=>{
        bound.querySelector('b').textContent = boundText(bound.dataset.group, +bound.dataset.i)
        bound.classList.toggle('active', draft[bound.dataset.group][+bound.dataset.i] != null)
    })

    panel.querySelectorAll('.library-filter__type').forEach(chip=>{
        chip.classList.toggle('active', chip.dataset.type == ctx.type)
    })

    panel.querySelectorAll('.library-filter__chip[data-group]').forEach(chip=>{
        let list  = draft[chip.dataset.group]
        let value = chip.dataset.group == 'genres' ? +chip.dataset.value : chip.dataset.value

        chip.classList.toggle('active', list.indexOf(value) >= 0)
    })

    panel.querySelector('.library-filter__reset').classList.toggle('hide', !Filter.count(draft))

    if(ctx.cards) panel.querySelector('.library-filter__apply').textContent = showText(Filter.apply(ctx.cards, draft).length)
    else remoteCount()
}

// a bound opens the usual sheet with the values; picking one swaps the bounds if they cross
function pickBound(group, i){
    let span   = options().years || [1950, new Date().getFullYear()]
    let values = []

    // whole steps up to 5, then half steps where most titles sit
    if(group == 'rating') for(let r = 1; r <= 8; r += r < 5 ? 1 : 0.5) values.push(r)
    else for(let y = span[1]; y >= span[0]; y--) values.push(y)

    let back = ()=>Controller.toggle('library_filter')

    Select.show({
        title: Lang.translate(group == 'rating' ? 'title_rating' : 'title_year') + ' · ' + Lang.translate(i ? 'filter_rating_to' : 'filter_rating_from'),
        items: [{title: Lang.translate('filter_any'), value: null, selected: draft[group][i] == null}].concat(values.map(v=>({title: v + '', value: v, selected: draft[group][i] === v}))),
        onSelect: (item)=>{
            draft[group][i] = item.value

            let [min, max] = draft[group]

            if(min != null && max != null && min > max) draft[group] = [max, min]

            update()
            back()
        },
        onBack: back
    })
}

function section(title, body){
    let node = el('div', 'library-filter__section')

    node.appendChild(el('div', 'library-filter__label', title))
    node.appendChild(body)

    return node
}

const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'

// iOS grouped rows: "From  Any  ›" over "To  Any  ›"
function range(group){
    let box = el('div', 'library-filter__group')

    ;[0, 1].forEach(i=>{
        let bound = el('div', 'library-filter__row library-filter__bound selector', `<span>${Lang.translate(i ? 'filter_rating_to' : 'filter_rating_from')}</span><b></b>${CHEVRON}`)

        bound.dataset.group = group
        bound.dataset.i = i

        action(bound, ()=>pickBound(group, i))

        box.appendChild(bound)
    })

    return box
}

function chips(group, values, name){
    let box = el('div', 'library-filter__chips')

    values.forEach(value=>{
        let label = name(value)

        if(!label) return

        let chip = el('div', 'library-filter__chip selector')

        chip.textContent = label
        chip.dataset.group = group
        chip.dataset.value = value

        action(chip, ()=>{
            let list = draft[group]
            let at   = list.indexOf(value)

            if(at >= 0) list.splice(at, 1)
            else list.push(value)

            update()
        })

        box.appendChild(chip)
    })

    return box
}

function countriesSection(found){
    let node = section(Lang.translate('title_country'), chips('countries', found.countries, countryName))

    node.classList.add('library-filter__section--countries')

    return node
}

// Home: films or series; genre ids differ between the two, so switching clears the genres
function typeSection(){
    let box = el('div', 'library-filter__segmented')

    ;['movie', 'tv'].forEach(kind=>{
        let chip = el('div', 'library-filter__type selector')

        chip.textContent = Lang.translate(kind == 'tv' ? 'menu_tv' : 'menu_movies')
        chip.dataset.type = kind

        action(chip, ()=>{
            if(ctx.type == kind) return

            ctx.type = kind
            draft.genres = []

            build()

            Controller.collectionSet(panel)
            Controller.collectionFocus(panel.querySelector('.library-filter__type[data-type="' + kind + '"]'), panel)
        })

        box.appendChild(chip)
    })

    return section(Lang.translate('title_type'), box)
}

function build(){
    let found = options()
    let body  = panel.querySelector('.library-filter__body')

    body.innerHTML = ''

    if(ctx.pick) body.appendChild(typeSection())

    body.appendChild(section(Lang.translate('title_rating'), range('rating')))
    body.appendChild(section(Lang.translate('title_year'), range('year')))

    if(found.genres.length) body.appendChild(section(Lang.translate('title_genre'), chips('genres', found.genres, genreName)))
    if(found.countries.length) body.appendChild(countriesSection(found))

    update()
}

// saved films have no country in their list data: look them up (cached), store it on the
// saved card, then swap in the fuller country list without moving the focus
function enrich(){
    if(ctx.kind !== 'library') return

    let missing = ctx.cards.filter(card=>!(card.origin_country || []).length && !(card.production_countries || []).length).slice(0, 80)

    if(!missing.length) return

    let opened = ctx

    Promise.all(missing.map(card=>Extra.get(card).then(extra=>{
        if(extra && extra.countries && extra.countries.length) card.origin_country = extra.countries
    }))).then(()=>{
        if(opened !== ctx || !document.body.classList.contains('library-filter--open')) return

        let old  = panel.querySelector('.library-filter__section--countries')
        let next = countriesSection(Filter.options(ctx.cards))

        if(old) old.replaceWith(next)
        else panel.querySelector('.library-filter__body').appendChild(next)

        update()

        if(Controller.enabled().name == 'library_filter'){
            let focused = panel.querySelector('.selector.focus')

            Controller.collectionSet(panel)
            Controller.collectionFocus(focused || panel.querySelector('.library-filter__bound'), panel)
        }
    })
}

function clone(f){
    let base = Filter.empty()

    if(!f) return base

    return {
        rating: (f.rating || base.rating).slice(),
        year: (f.year || base.year).slice(),
        genres: (f.genres || []).slice(),
        countries: (f.countries || []).slice()
    }
}

function open(){
    ctx = context()

    if(!ctx) return

    draft = clone(ctx.filter)

    build()

    returnTo = Controller.enabled().name

    document.body.classList.add('library-filter--open')
    panel.querySelector('.library-filter__body').scrollTop = 0

    Controller.toggle('library_filter')

    enrich()
}

function close(){
    clearTimeout(counting)

    document.body.classList.remove('library-filter--open')

    if(returnTo && returnTo !== 'library_filter') Controller.toggle(returnTo)
}

function apply(){
    let filter = Filter.count(draft) ? draft : null

    clearTimeout(counting)

    document.body.classList.remove('library-filter--open')

    if(ctx.kind == 'search'){
        let query = Filter.search.query

        Filter.search.filter = filter

        // search only runs again for a new query, so reopen it with the same one
        reopening = true
        Search.close()
        Search.open({input: query})
        reopening = false
    }
    else if(ctx.jump){
        if(ctx.pick) last.type = ctx.type

        last[ctx.pick ? 'main' : ctx.type] = filter

        refresh()

        if(!filter) return close()

        Activity.push({
            url: 'discover/' + ctx.type,
            title: Lang.translate(ctx.type == 'tv' ? 'menu_tv' : 'menu_movies') + ' · ' + Lang.translate('hooktv_filters'),
            component: 'category_full',
            source: 'tmdb',
            page: 1,
            library_filter: filter
        })
    }
    else Activity.replace({library_filter: filter, page: 1})
}

// above the phone tab bar while it shows, otherwise GAP from the bottom edge
function place(){
    let bar   = document.querySelector('.navigation-bar--tabs')
    let shown = bar && getComputedStyle(bar).display !== 'none' && !bar.classList.contains('navigation-bar--hidden') && !document.body.classList.contains('search--open')

    dock.style.bottom = shown ? (bar.offsetHeight + parseFloat(getComputedStyle(bar).bottom) + GAP) + 'px' : ''
}

function refresh(){
    let current = context()
    let count   = current ? Filter.count(current.filter) : 0

    pill.classList.toggle('library-filter-pill--show', Boolean(current))
    pill.classList.toggle('library-filter-pill--active', count > 0)
    pill.querySelector('.library-filter-pill__count').textContent = count || ''
    pill.querySelector('.library-filter-pill__key').textContent = TabHotkeys.tabKey()

    place()
}

function init(){
    if(pill || !window.lampa_settings.minimal_ui) return

    pill = el('div', 'library-filter-pill selector', `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
        <span>${Lang.translate('hooktv_filters')}</span>
        <b class="library-filter-pill__key"></b>
        <b class="library-filter-pill__count"></b>`)

    action(pill, open)

    panel = el('div', 'library-filter', `
        <div class="library-filter__layer"></div>
        <div class="library-filter__content">
            <div class="library-filter__head">
                <div class="library-filter__title">${Lang.translate('hooktv_filters')}</div>
                <div class="library-filter__reset selector">${Lang.translate('hooktv_filter_reset')}</div>
                <div class="library-filter__close selector" role="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></div>
            </div>
            <div class="library-filter__body"></div>
            <div class="library-filter__foot">
                <div class="library-filter__apply selector"></div>
            </div>
        </div>`)

    panel.querySelector('.library-filter__layer').addEventListener('click', close)

    action(panel.querySelector('.library-filter__close'), close)

    action(panel.querySelector('.library-filter__reset'), ()=>{
        draft = Filter.empty()

        update()
    })

    action(panel.querySelector('.library-filter__apply'), apply)

    // keep the focused row in view while the remote walks the panel
    panel.addEventListener('hover:focus', (e)=>{
        if(e.target.scrollIntoView) e.target.scrollIntoView({block: 'nearest'})
    }, true)

    // the pill sits in its own dock so the remote can focus it as a one-item collection
    dock = el('div', 'library-filter-dock')

    dock.appendChild(pill)

    document.body.appendChild(dock)
    document.body.appendChild(panel)

    Controller.add('library_filter', {
        toggle: ()=>{
            Controller.collectionSet(panel)
            Controller.collectionFocus(panel.querySelector('.library-filter__body .selector'), panel)
        },
        up: ()=>Navigator.move('up'),
        down: ()=>Navigator.move('down'),
        left: ()=>Navigator.move('left'),
        right: ()=>Navigator.move('right'),
        back: close
    })

    let toContent = ()=>Controller.toggle('content')

    Controller.add('library_filter_pill', {
        toggle: ()=>{
            Controller.collectionSet(dock)
            Controller.collectionFocus(pill, dock)
        },
        up: toContent,
        back: toContent
    })

    // TV remote: the pill is always on screen, but a remote can only reach it by stepping
    // ↓ from the last row (the buttons of an expanded card hand over in peek.js)
    window.addEventListener('keydown', (e)=>{
        if(e.keyCode !== 40 || e.defaultPrevented || !pill.classList.contains('library-filter-pill--show')) return
        if(Controller.enabled().name !== 'content' || Navigator.canmove('down')) return

        e.stopPropagation()
        e.preventDefault()

        Controller.toggle('library_filter_pill')
    }, true)

    // desktop and TV: keys 1–5 switch tabs; the key of the tab you are on opens its filters
    TabHotkeys.init(open)

    Lampa.Listener.follow('activity', (e)=>{
        if(e.type !== 'start') return

        object = e.object

        refresh()
    })

    // search opening / closing, the tab bar hiding while scrolling
    new MutationObserver(()=>{
        // a filter belongs to one search; a fresh search starts unfiltered
        if(!document.body.classList.contains('search--open') && !reopening){
            Filter.search.filter = null
            Filter.search.query = ''
        }

        refresh()
    }).observe(document.body, {attributes: true, attributeFilter: ['class']})

    let bar = document.querySelector('.navigation-bar--tabs')

    if(bar) new MutationObserver(place).observe(bar, {attributes: true, attributeFilter: ['class']})

    window.addEventListener('resize', place)

    Filter.search.onChange = refresh
}

export default {
    init
}

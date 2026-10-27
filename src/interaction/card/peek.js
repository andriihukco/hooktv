import Api from '../../core/api/api'
import Lang from '../../core/lang'
import Favorite from '../../core/favorite'
import Watch from '../watch'
import Utils from '../../utils/utils'
import Extra from '../../utils/tmdb_extra'
import Controller from '../../core/controller'

/**
 * HOOK TV: the highlighted card grows sideways. One info pane (logo, facts,
 * genres, description, Watch / My List) moves into the focused or hovered card
 * next to its poster, and both sit in one highlighted container. The other
 * cards slide over; row height never changes. Phones keep the in-card overlay.
 */

const HOVER_INTENT = 650 // ms the pointer rests on a poster before it expands
const FOCUS_INTENT = 350 // ms, lets held arrow keys run through a row without expanding each card
const SCROLL_CALM  = 450 // ms without scrolling before a card may expand

let scrolled = 0 // when the page last scrolled

let pane
let host     // card that holds the pane
let current  // card whose pane is open
let intent
let fitting
let returnTo // controller to go back to when the pane buttons give up focus

function el(tag, cls, text){
    let node = document.createElement(tag)

    node.className = cls
    if(text) node.textContent = text

    return node
}

function listLabel(data){
    let added = Favorite.check(data).book

    pane.querySelector('.card-peek__list').classList.toggle('active', Boolean(added))
    pane.querySelector('.card-peek__list span').textContent = Lang.translate(added ? 'hooktv_in_list' : 'hooktv_add_list')
}

// rating · year · age · runtime in one meta row, the same chips as the title page (status lives there)
function facts(data, extra){
    let box  = el('div', 'hk-meta card-peek__facts')
    let vote = parseFloat(data.vote_average || 0)
    let year = ((data.release_date || data.first_air_date || '') + '').slice(0, 4)

    if(vote) box.appendChild(rateChip(vote))
    if(year) box.appendChild(el('span', 'hk-chip', year))

    if(extra){
        if(extra.pg) box.appendChild(el('span', 'hk-chip', extra.pg))
        if(extra.runtime) box.appendChild(el('span', 'hk-chip', Utils.secondsToTimeHuman(extra.runtime * 60).trim()))
    }

    return box
}

function rateChip(vote){
    let tone = vote >= 7 ? 'good' : vote >= 5 ? 'mid' : 'bad'
    let chip = el('span', 'hk-chip hk-rate rate--' + tone)

    chip.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span class="hk-rate__value">' + vote.toFixed(1) + '</span>'

    return chip
}

function chips(list){
    let row = el('div', 'hk-meta card-peek__genres')

    list.forEach(name=>row.appendChild(el('span', 'hk-chip', name)))

    return row
}

function fill(card){
    let data = card.hooktvData
    let info = pane.querySelector('.card-peek__info')
    let meta = card.querySelector('.card__hover-meta')
    let text = card.querySelector('.card__hover-description')

    let render = (extra)=>{
        let name  = data.title || data.name
        let title = el('div', extra && extra.logo ? 'card-peek__title card-peek__title--logo' : 'card-peek__title', extra && extra.logo ? '' : name)

        if(extra && extra.logo){
            let logo = el('img', 'card-peek__logo')

            logo.src = extra.logo
            logo.alt = name

            title.appendChild(logo)
        }

        // three genres at most: the row never wraps, so the pane keeps its height
        let genres = (extra && extra.genres.length ? extra.genres : (meta ? meta.textContent.replace(/^\d{4}\s·\s/, '').split(' · ').filter(Boolean) : [])).slice(0, 3)

        info.innerHTML = ''
        info.appendChild(title)
        info.appendChild(facts(data, extra))

        if(genres.length) info.appendChild(chips(genres))
        if(text) info.appendChild(el('div', 'card-peek__descr', text.textContent))
    }

    render(null)

    Extra.get(data).then(extra=>extra && current === card && render(extra))

    listLabel(data)
}

// after the width animation, scroll the row just enough to show the whole card
function fit(card){
    clearTimeout(fitting)

    fitting = setTimeout(()=>{
        let row = card.closest('.scroll--horizontal')

        if(!row || !row.hooktvScroll || current !== card) return

        let view = row.getBoundingClientRect()
        let box  = card.getBoundingClientRect()
        let over = box.right - (view.right - 16)

        if(over > 0) row.hooktvScroll.by(Math.min(over, box.left - view.left - 16))
    }, 380) // after the 0.35s expand
}

function close(){
    clearTimeout(intent)

    current = null

    if(host) host.classList.remove('card--peek-open')
    if(pane) pane.classList.remove('card-peek--open')

    unshift()
}

// phones, tablets and narrow windows keep plain posters: no sideways growth there
function allowed(){
    return !document.body.classList.contains('true--mobile') && !Utils.isTouchDevice() && window.innerWidth >= 768
}

let shifted = [] // grid cards slid aside for the open pane

// slide the cards of the card's own row out of the pane's way; the grid clips whatever
// passes its edge, so no other row reflows and nothing is covered
function shift(card, by){
    unshift()

    let row   = Array.from(card.parentElement.children)
    let index = row.indexOf(card)

    row.forEach((other, i)=>{
        if(other === card || other.offsetTop !== card.offsetTop) return
        if(by > 0 ? i < index : i > index) return

        other.style.setProperty('--peek-shift', by + 'px')
        shifted.push(other)
    })
}

function unshift(){
    shifted.forEach(other=>other.style.removeProperty('--peek-shift'))
    shifted = []
}

// Grids wrap, so a card that grows would push its neighbours onto the next line and
// leave a hole at the end of the row. There the card keeps its slot, the pane takes
// exactly whole columns and the rest of the row slides aside (shift); near the right
// side the pane opens to the left and the cards before it slide left.
function float(card){
    let grid  = card.closest('.mapping--grid').getBoundingClientRect()
    let box   = card.getBoundingClientRect()
    let style = getComputedStyle(card)
    let em    = parseFloat(style.fontSize)
    let want  = Math.min(Math.max(17 * em, 0.24 * window.innerWidth), 25 * em) // the pane's usual width
    let cols  = Math.max(2, Math.round(want / box.width)) // one column is too narrow for the text
    let right = grid.right - box.right >= cols * box.width - 1
    let pad   = parseFloat(right ? style.paddingRight : style.paddingLeft)

    card.classList.add('card--peek-float')
    card.classList.toggle('card--peek-left', !right)

    // the card draws the shared container, the pane sizes itself: both need the width
    card.style.setProperty('--peek-w', (cols * box.width - pad) + 'px')
    pane.style.setProperty('--peek-w', (cols * box.width - pad) + 'px')

    // the grid gutter is the card's padding: the container starts at the poster, not the padding
    card.style.setProperty('--peek-inset-l', style.paddingLeft)
    card.style.setProperty('--peek-inset-r', style.paddingRight)

    card.peekShift = (right ? 1 : -1) * cols * box.width
}

function open(card){
    // a streaming service badge has no details to show
    if(!card.hooktvData || card.classList.contains('card--provider') || !card.querySelector('.card__hover-info') || !allowed()) return close()

    if(host !== card){
        let view = card.querySelector('.card__view')

        // the previous card snaps back so only one layout shift happens, then this one grows
        if(host){
            host.classList.remove('card--peek', 'card--peek-open', 'card--peek-float', 'card--peek-left')
            host.style.removeProperty('--peek-w')
            host.style.removeProperty('--peek-inset-l')
            host.style.removeProperty('--peek-inset-r')
        }

        pane.classList.add('card-peek--instant')
        pane.classList.remove('card-peek--open')
        pane.style.removeProperty('--peek-w')

        if(card.closest('.mapping--grid')) float(card)

        // exact width: a grid row fits its cards to the fraction of a pixel, a rounded-up card wraps
        card.style.setProperty('--card-w', card.getBoundingClientRect().width + 'px')
        card.style.setProperty('--view-h', view.offsetHeight + 'px')
        // container corners follow the poster's, so the ring is even on every corner
        card.style.setProperty('--view-r', getComputedStyle(view).borderTopLeftRadius)
        card.classList.add('card--peek')
        card.appendChild(pane)

        pane.offsetWidth
        pane.classList.remove('card-peek--instant')

        host = card
    }

    current = card

    fill(card)

    card.classList.add('card--peek-open')
    pane.classList.add('card-peek--open')
    pane.classList.toggle('card-peek--locked', locked())

    if(card.classList.contains('card--peek-float')) shift(card, card.peekShift)
    else unshift()

    // the row's navigation was collected before the pane arrived: add its buttons so → always
    // runs card → Watch → My List → next card (the navigator skips elements it already has)
    if(!locked() && card.classList.contains('focus') && Controller.enabled().name !== 'card_peek'){
        Controller.collectionAppend(Array.from(pane.querySelectorAll('.selector')))
    }

    fit(card)
}

// Russian titles show their pane blurred, with Watch / My List switched off
function locked(){
    return Boolean(current && current.classList.contains('card--russian'))
}

// hand focus back from the pane buttons to the card row it came from
function leave(){
    if(Controller.enabled().name !== 'card_peek') return

    Controller.toggle(returnTo || 'content')
}

function init(){
    if(pane) return

    pane = el('div', 'card-peek')
    pane.innerHTML = `
        <div class="card-peek__body">
            <div class="card-peek__info"></div>
            <div class="card-peek__buttons">
                <button class="card-peek__button card-peek__play selector" type="button"><svg aria-hidden="true"><use xlink:href="#sprite-play"></use></svg><span>${Lang.translate('hooktv_watch_now')}</span></button>
                <button class="card-peek__button card-peek__list selector" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg><span></span></button>
            </div>
        </div>`

    // remote / keyboard Enter arrives as hover:enter; a mouse click on a button Lampa has
    // already bound (trigger_click) becomes hover:enter too, so only unbound clicks run here
    let action = (selector, run)=>{
        let button = pane.querySelector(selector)

        button.addEventListener('hover:enter', ()=>locked() || run())
        button.addEventListener('click', (e)=>{
            // the pane sits inside the card: keep the click from also opening the card
            e.stopPropagation()

            if(!button.trigger_click && !locked()) run()
        })
    }

    action('.card-peek__play', ()=>{
        let card = current

        leave()
        close()

        if(card) Watch.start(card.hooktvData, 'content')
    })

    action('.card-peek__list', ()=>{
        if(!current) return

        Favorite.toggle('book', current.hooktvData)
        listLabel(current.hooktvData)
    })

    Controller.add('card_peek', {
        toggle: ()=>{
            Controller.collectionSet(pane)
            Controller.collectionFocus(pane.querySelector('.card-peek__play'), pane)
        },
        left: ()=>Navigator.move('left'),
        right: ()=>Navigator.move('right'),
        up: ()=>leave(),
        down: ()=>{
            leave()

            // next row; from the last row on to the Filters pill (library_filter.js)
            if(Navigator.canmove('down')) Controller.move('down')
            else if(document.querySelector('.library-filter-pill--show')) Controller.toggle('library_filter_pill')
        },
        back: ()=>leave()
    })

    // ↓ on the expanded card steps into its buttons instead of the next row.
    // Lampa's keypad listens on window in the bubble phase, so this capture listener runs first.
    window.addEventListener('keydown', (e)=>{
        if(e.keyCode !== 40 || !current || locked() || !pane.classList.contains('card-peek--open')) return
        if(!current.classList.contains('focus') || Controller.enabled().name == 'card_peek') return

        e.stopPropagation()
        e.preventDefault()

        returnTo = Controller.enabled().name
        Controller.toggle('card_peek')
    }, true)

    // cards sliding under a resting pointer while the page scrolls must not expand:
    // wait until scrolling has been calm for a moment, then only open a card that is
    // still under the pointer or still focused
    let settle = (card)=>{
        let wait = SCROLL_CALM - (Date.now() - scrolled)

        if(wait > 0) return intent = setTimeout(()=>settle(card), wait)

        if(card.isConnected && (card.matches(':hover') || card.classList.contains('focus'))) open(card)
    }

    let onScroll = ()=>{
        scrolled = Date.now()
    }

    document.addEventListener('scroll', onScroll, {capture: true, passive: true})
    document.addEventListener('wheel', onScroll, {capture: true, passive: true})
    document.addEventListener('touchmove', onScroll, {capture: true, passive: true})

    // Lampa's hover events do not bubble, so listen in the capture phase
    let onFocus = (delay)=>(e)=>{
        if(pane.contains(e.target)) return

        let card = e.target.closest && e.target.closest('.card--details-overlay')

        clearTimeout(intent)

        if(!card) return close()
        if(card === current) return

        intent = setTimeout(()=>settle(card), delay)
    }

    document.addEventListener('hover:focus', onFocus(FOCUS_INTENT), true)
    document.addEventListener('hover:hover', onFocus(HOVER_INTENT), true)
}

export default {
    init,
    close
}

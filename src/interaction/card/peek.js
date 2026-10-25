/**
 * HOOK TV: Netflix-style info panel for the focused / hovered card. It lives on
 * body, outside the card, because row scrollers clip anything past the poster.
 * Content is the .card__hover-info that details.js already builds per card.
 */

let panel
let current
let settle

function hide(){
    current = null

    if(panel) panel.classList.remove('card-peek--visible')
}

function show(card){
    let info = card.querySelector('.card__hover-info')

    if(!info || document.body.classList.contains('true--mobile')) return hide()

    current = card

    panel.innerHTML = info.innerHTML

    let rect  = card.getBoundingClientRect()
    let width = Math.max(rect.width * 1.5, 280)
    let left  = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8)

    panel.style.width = width + 'px'
    panel.style.left  = left + 'px'

    // below the poster when it fits, otherwise above it
    let below = rect.bottom + 12 + panel.offsetHeight < window.innerHeight

    panel.style.top = (below ? rect.bottom + 12 : rect.top - 12 - panel.offsetHeight) + 'px'
    panel.classList.toggle('card-peek--above', !below)
    panel.classList.add('card-peek--visible')
}

function init(){
    if(panel) return

    panel = document.createElement('div')
    panel.className = 'card-peek'
    panel.setAttribute('aria-hidden', 'true')

    document.body.appendChild(panel)

    // Lampa's hover events do not bubble, so listen in the capture phase
    let onFocus = (e)=>{
        let card = e.target.closest && e.target.closest('.card--details-overlay')

        clearTimeout(settle)

        if(!card) return hide()

        show(card)

        // rows slide to the focused card with a transform; place again once it lands
        settle = setTimeout(()=>current === card && show(card), 350)
    }

    document.addEventListener('hover:focus', onFocus, true)
    document.addEventListener('hover:hover', onFocus, true)

    document.addEventListener('mouseout', (e)=>{
        if(current && !current.contains(e.relatedTarget)) hide()
    }, true)

    // follow the card while its row scrolls; a mouse wheel means the user moved on
    document.addEventListener('scroll', ()=>{
        if(current) requestAnimationFrame(()=>current && show(current))
    }, {capture: true, passive: true})
    document.addEventListener('wheel', hide, {capture: true, passive: true})
}

export default {
    init,
    hide
}

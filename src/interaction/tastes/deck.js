import Lang from '../../core/lang'
import TMDB from '../../core/api/sources/tmdb'

/**
 * HOOK TV: one card of the swipe deck. Drag on touch and mouse (right like, left dislike,
 * up or down skip), or pick one of the three buttons with a remote.
 */

const DRAG_MIN = 80

const BUTTONS = [
    {value: 'dislike', label: 'tastes_dislike'},
    {value: 'skip',    label: 'tastes_skip'},
    {value: 'like',    label: 'tastes_like'}
]

function bindDrag(face, onVerdict){
    let start = null

    face.on('pointerdown', (e)=>{
        start = {x: e.clientX, y: e.clientY}
    })

    face.on('pointerup', (e)=>{
        if(!start) return

        let dx = e.clientX - start.x
        let dy = e.clientY - start.y

        start = null

        if(Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_MIN) return

        if(Math.abs(dx) > Math.abs(dy)) onVerdict(dx > 0 ? 'like' : 'dislike')
        else onVerdict('skip')
    })

    face.on('pointerleave', ()=>{
        start = null
    })
}

/**
 * @param {object} card - TMDB title
 * @param {string} progress - "3 / 20"
 * @param {function} onVerdict - called with 'like' | 'dislike' | 'skip'
 * @returns {jQuery}
 */
function render(card, progress, onVerdict){
    let html = $('<div class="tastes-deck"></div>')
    let face = $('<div class="tastes-deck__card"></div>')

    html.append($('<div class="tastes-deck__progress"></div>').text(progress))

    if(card.poster_path) face.append($('<img class="tastes-deck__poster" alt="" />').attr('src', TMDB.img(card.poster_path, 'w500')))

    face.append($('<div class="tastes-deck__name"></div>').text(card.title || card.name || ''))

    html.append(face)

    let row = $('<div class="tastes-deck__actions"></div>')

    BUTTONS.forEach(b=>{
        let node = $('<div class="selector tastes-deck__btn"></div>').text(Lang.translate(b.label))

        node.on('hover:enter', ()=>onVerdict(b.value))

        row.append(node)
    })

    html.append(row)

    bindDrag(face, onVerdict)

    return html
}

export default {render}

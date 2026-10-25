import Settings from '../settings/settings'
import Controller from '../../core/controller'
import Noty from '../noty'
import Lang from '../../core/lang'
import TMDB from '../../core/api/sources/tmdb'
import Tastes from '../../core/tastes'
import R from '../../core/tastes_rules'
import W from './wizard_state'
import Pick from './pick'
import Deck from './deck'

/**
 * HOOK TV: the Tastes wizard, drawn inside the Settings panel so it matches the rest of it.
 * Pick the basics, swipe popular titles, save. Rerun opens the saved profile. Verdicts are
 * written as each card is swiped.
 */

const POPULAR = '?sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=7'
const PAGE    = 'tastes_wizard'

let host
let state
let picked
let deck = []

/**
 * Replace the panel body with one step and focus its first control
 */
function show(el){
    if(!host) return

    host.empty().append(el)

    Controller.collectionSet(host)

    let first = el.find('.selector')[0]

    if(first) Controller.collectionFocus(first, host)
}

function message(text, retry){
    let box = $('<div class="tastes-message"></div>').text(text)

    if(retry){
        let button = $('<div class="selector settings-param tastes-action"></div>').text(Lang.translate('tastes_retry'))

        button.on('hover:enter', retry)
        box.append(button)
    }

    return box
}

// movie and tv in turns, so the deck is not all one kind
function interleave(movies, shows){
    let out = []
    let length = Math.max(movies.length, shows.length)

    for(let i = 0; i < length; i++){
        if(movies[i]) out.push(movies[i])
        if(shows[i]) out.push(shows[i])
    }

    return out
}

function loadDeck(){
    show(message(Lang.translate('tastes_loading')))

    let movies, shows
    let pending = 2
    let failed  = false

    let done = ()=>{
        if(failed) return

        if(--pending) return

        deck = W.deckFor(interleave(movies, shows), Tastes.get().verdicts)
        state = Object.assign(state, {index: 0})

        showCard()
    }

    let fail = ()=>{
        if(failed) return

        failed = true

        show(message(Lang.translate('tastes_deck_failed'), loadDeck))
    }

    TMDB.get('discover/movie' + POPULAR, {}, (json)=>{
        movies = json.results || []
        done()
    }, fail)

    TMDB.get('discover/tv' + POPULAR, {}, (json)=>{
        shows = json.results || []
        done()
    }, fail)
}

function showCard(){
    if(state.index >= deck.length) return showSummary()

    show(Deck.render(deck[state.index], (state.index + 1) + ' / ' + deck.length, onVerdict))
}

function onVerdict(value){
    let card = deck[state.index]

    if(!Tastes.verdict(card, value)) Noty.show(Lang.translate('tastes_save_failed'))

    state = W.swipe(state, card, value)

    showCard()
}

function showSummary(){
    let verdicts = Tastes.get().verdicts
    let count = (value)=>deck.slice(0, state.index).filter(card=>{
        let v = verdicts[R.verdictKey(card)]

        return v && v.verdict == value
    }).length

    let text = Lang.translate('tastes_summary')
        .replace('{like}', count('like'))
        .replace('{dislike}', count('dislike'))
        .replace('{skip}', count('skip'))

    let box = message(text)
    let save = $('<div class="selector settings-param tastes-action"></div>').text(Lang.translate('tastes_save'))

    save.on('hover:enter', ()=>{
        let ok = Tastes.set({
            genres: picked.genres,
            countries: picked.countries,
            actors: picked.actors,
            min_rating: picked.min_rating,
            wizard_done: true
        })

        if(!ok){
            Noty.show(Lang.translate('tastes_save_failed'))

            return
        }

        Noty.show(Lang.translate('tastes_saved'))

        close()
    })

    box.append(save)

    show(box)
}

function onPicked(sel){
    picked = Object.assign(picked, sel)
    state  = W.next(state)

    loadDeck()
}

/**
 * Settings renders this page into the panel; the wizard takes over that body
 */
function init(){
    Settings.listener.follow('open', (e)=>{
        if(e.name != PAGE) return

        host = $(e.body)

        show(Pick.render(picked, onPicked))
    })
}

/**
 * Open the wizard in the Settings panel. A saved profile pre-fills step one.
 */
function open(){
    picked = Tastes.get()
    state  = {step: 'pick', index: 0}
    deck   = []

    Settings.create(PAGE, {onBack: close})
}

/**
 * Back to the Tastes page
 */
function close(){
    host = null

    Settings.create('tastes')
}

export default {init, open, close}

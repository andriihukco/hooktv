import R from '../../core/tastes_rules'

/**
 * HOOK TV: step and deck logic for the Tastes wizard. Pure: no DOM, no Storage.
 * The caller writes verdicts through Tastes.verdict.
 */

const steps = ['pick', 'swipe', 'summary']
const DECK_SIZE = 20

function move(state, to){
    return Object.assign({}, state, {step: steps[to]})
}

function next(state){
    return move(state, Math.min(steps.indexOf(state.step) + 1, steps.length - 1))
}

function prev(state){
    return move(state, Math.max(steps.indexOf(state.step) - 1, 0))
}

/**
 * Advance the deck. Remembers the last verdict so the screen can animate it.
 */
function swipe(state, card, verdict){
    return Object.assign({}, state, {index: (state.index || 0) + 1, last: {id: card.id, verdict}})
}

/**
 * Cards still without a verdict, in order, at most DECK_SIZE
 */
function deckFor(popular, verdicts){
    return popular.filter(card=>!verdicts[R.verdictKey(card)]).slice(0, DECK_SIZE)
}

export default {steps, next, prev, swipe, deckFor}

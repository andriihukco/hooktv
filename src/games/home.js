// The Games home: what each row of the page holds. Pure data (no DOM), so the specs can check it.
// The component (components/games_home.js) turns these rows into Line items and wires the keys.
import games, {categories, cardData, categoryTitle} from './catalog'
import {t} from './i18n'
import {history} from './store'

const DAY = 864e5
const TOP = 10

// a tile of the home: the style decides how it is drawn (interaction/card/module/style.js)
const tile = (data, style, module) => Object.assign(data, {params: {style: {name: style}, module}})

// a row: a horizontal Line with its own layout; `type` is the CSS modifier that sizes its tiles
const row = (type, title, results, view) => ({
    title,
    results,
    params: {type, items: {mapping: 'line', align_left: false, view}, scroll: {horizontal: true, step: 300}}
})

/**
 * The game the hero shows: one a day, so the hero changes without anyone picking it
 * @param {number} now time in ms
 * @returns {object} game
 */
export function featuredGame(now = Date.now()){
    return games[Math.floor(now / DAY) % games.length]
}

/**
 * The rows of the Games home, top to bottom: the featured heroes, a ranked list, then one shelf per folder
 * and a last shelf with every game.
 * @param {number} now time in ms, for the heroes
 * @param {*} module the card module each tile is built with
 * @returns {Array} rows for the Main component
 */
export function rows(now, module){
    const heroes = [0, 1, 2, 3].map(i => tile(cardData(featuredGame(now + i * DAY)), 'feature', module))

    const top = games.slice(0, TOP).map((g, i) => tile(Object.assign(cardData(g), {rank: i + 1, best: history.stats(g.id).best}), 'list', module))

    const shelves = categories.map(c => row('shelf', categoryTitle(c), c.games.map(g => tile(cardData(g), 'game', module)), 7))

    return [
        row('feature', '', heroes, 1),
        row('list', t('hooktv_games_top', 'Top games'), top, 3),
        ...shelves,
        row('shelf', t('hooktv_games_all', 'All games'), games.map(g => tile(cardData(g), 'game', module)), 7)
    ]
}

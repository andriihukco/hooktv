// The Games home: what each row of the page holds. Pure data (no DOM), so the specs can check it.
// The component (components/games_home.js) turns these rows into Line items and wires the keys.
import games, {categories, cardData, categoryTitle, categoryOverview, categoryCardId} from './catalog'
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
 * The rows of the Games home, top to bottom: a featured hero, a ranked list, the folders as tiles,
 * then one shelf per folder with its games.
 * @param {number} now time in ms, for the hero
 * @param {*} module the card module each tile is built with
 * @returns {Array} rows for the Main component
 */
export function rows(now, module){
    const featured = tile(cardData(featuredGame(now)), 'feature', module)

    const top = games.slice(0, TOP).map((g, i) => tile(Object.assign(cardData(g), {rank: i + 1, best: history.stats(g.id).best}), 'list', module))

    const folders = categories.map(c => tile({
        id: categoryCardId(c.id),
        title: categoryTitle(c),
        overview: categoryOverview(c),
        category: c.id,
        games: c.games.map(g => g.id),
        c1: c.c1,
        c2: c.c2
    }, 'folder', module))

    folders.push(tile({
        id: categoryCardId('all'),
        title: t('hooktv_games_all', 'All games'),
        overview: '',
        all: true,
        games: games.map(g => g.id),
        c1: '#8E8E93',
        c2: '#48484A'
    }, 'folder', module))

    const shelves = categories.map(c => row('shelf', categoryTitle(c), c.games.map(g => tile(cardData(g), 'game', module)), 7))

    return [
        row('feature', '', [featured], 1),
        row('list', t('hooktv_games_top', 'Top games'), top, 3),
        row('folders', t('hooktv_games_categories', 'Categories'), folders, 2),
        ...shelves
    ]
}

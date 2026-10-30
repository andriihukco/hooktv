import arcade from './packs/arcade'
import arcade2 from './packs/arcade2'
import boards from './packs/boards'
import cards from './packs/cards'
import logic from './packs/logic'
import puzzle from './packs/puzzle'
import words from './packs/words'
import quiz from './packs/quiz'
import party from './packs/party'
import categoryList from './categories'
import {tint} from './icons'

export {setTranslator, gameTitle, gameHint, categoryTitle, categoryOverview} from './i18n'
import {gameTitle, gameHint} from './i18n'

// Every playable game, in the order the home row shows them: the most inviting first.
const order = ['2048', 'snake', 'tetris', 'pacman', 'flappy', 'chess', 'candy', 'wordle', 'breakout', 'doodle', 'crossy', 'sudoku', 'minesweeper', 'solitaire', 'blackjack', 'tictactoe', 'checkers', 'reversi', 'pong', 'bubbles', 'slicer', 'tower', 'memory', 'battleship', 'sliding', 'poker', 'hangman', 'quiz', 'rps', 'mole', 'typing', 'speedtype', 'wordrain', 'numtype', 'alias', 'charades', 'higher_lower', 'capitals', 'kahoot']

const packs = {arcade: [...arcade, ...arcade2], puzzle, words: [...words, ...quiz, ...party], logic, board: boards, cards}
const all = []

for(let kind in packs) packs[kind].forEach(g => all.push(Object.assign({}, g, {kind, c1: tint(g.id)[0], c2: tint(g.id)[1]})))

const games = order.map(id => all.find(g => g.id == id)).filter(Boolean).concat(all.filter(g => !order.includes(g.id)))

// a game's card id: stable (the same game always has the same one, wherever the row puts it) and negative,
// so it never meets a TMDB id in My List, history or the bookmarks
function numeric(id){
    let h = 5381

    for(let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0

    return -(1000 + h % 900000)
}

games.forEach(g => g.card_id = numeric(g.id))

// the categories as the Games tab shows them: each one holds its games in the order listed in categories.js
const categories = categoryList.map(c => Object.assign({}, c, {games: c.games.map(id => games.find(g => g.id == id)).filter(Boolean)}))
const placed = categories.reduce((ids, c) => ids.concat(c.games.map(g => g.id)), [])
const loose = games.filter(g => !placed.includes(g.id))

if(loose.length) categories.push({id: 'more', title: 'More', overview: 'Everything else', c1: '#8E8E93', c2: '#48484A', games: loose})

// a category's card id, negative like a game's, so it never meets a TMDB id
export const categoryCardId = id => numeric('category:' + id)

export function categoryById(id){
    return categories.find(c => c.id == id)
}

/**
 * The card data of a game: what a row tile, My List and the bookmarks all draw from.
 * Only `game` and `id` have to be stored; everything else is filled in from here.
 */
export function cardData(game){
    return {
        id: game.card_id,
        game: game.id,
        title: gameTitle(game),
        overview: gameHint(game),
        kind: game.kind,
        c1: game.c1,
        c2: game.c2
    }
}

/** fills in a stored game card (bookmarks keep little more than its id) and makes it a game tile */
// the card styles of the games home (see games/home.js and interaction/card/module/style.js)
const HOME_STYLES = ['feature', 'list', 'folder']

export function hydrate(data){
    let game = data && data.game && games.find(g => g.id == data.game)

    if(!game) return data

    Object.assign(data, cardData(game))

    // a game tile is drawn as a game tile, unless the games home picked one of its own layouts for it
    const chosen = data.params && data.params.style && data.params.style.name

    data.params = Object.assign({}, data.params, {style: {name: HOME_STYLES.includes(chosen) ? chosen : 'game'}})

    return data
}

export function byId(id){
    return games.find(g => g.id == id)
}

export {categories}

export default games

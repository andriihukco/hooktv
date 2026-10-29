import arcade from './packs/arcade'
import arcade2 from './packs/arcade2'
import boards from './packs/boards'
import cards from './packs/cards'
import logic from './packs/logic'
import puzzle from './packs/puzzle'
import words from './packs/words'
import {tint} from './icons'

// Every playable game, in the order the home row shows them: the most inviting first.
const order = ['2048', 'snake', 'tetris', 'pacman', 'flappy', 'chess', 'candy', 'wordle', 'invaders', 'breakout', 'doodle', 'crossy', 'sudoku', 'minesweeper', 'solitaire', 'blackjack', 'connect4', 'tictactoe', 'checkers', 'reversi', 'asteroids', 'pong', 'frogger', 'bubbles', 'slicer', 'emoji', 'tower', 'archery', 'maze', 'memory', 'simon', 'mastermind', 'battleship', 'nonogram', 'lightsout', 'sliding', 'mahjong', 'poker', 'hangman', 'quiz', 'rps', 'mole', 'insects', 'shapes', 'typing', 'speedtype', 'wordrain', 'numtype', 'numspeak', 'dice']

const packs = {arcade: [...arcade, ...arcade2], puzzle, words, logic, board: boards, cards}
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

/**
 * The card data of a game: what a row tile, My List and the bookmarks all draw from.
 * Only `game` and `id` have to be stored; everything else is filled in from here.
 */
export function cardData(game){
    return {
        id: game.card_id,
        game: game.id,
        title: game.title,
        overview: game.hint || '',
        kind: game.kind,
        c1: game.c1,
        c2: game.c2
    }
}

/** fills in a stored game card (bookmarks keep little more than its id) and makes it a game tile */
export function hydrate(data){
    let game = data && data.game && games.find(g => g.id == data.game)

    if(!game) return data

    Object.assign(data, cardData(game))

    data.params = Object.assign({}, data.params, {style: {name: 'game'}})

    return data
}

export function byId(id){
    return games.find(g => g.id == id)
}

export default games

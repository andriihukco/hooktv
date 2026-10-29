import arcade from './packs/arcade'
import arcade2 from './packs/arcade2'
import boards from './packs/boards'
import cards from './packs/cards'
import logic from './packs/logic'
import puzzle from './packs/puzzle'
import words from './packs/words'

// Every playable game, in the order the home row shows them: the most inviting first.
const order = ['2048', 'snake', 'tetris', 'pacman', 'flappy', 'chess', 'candy', 'wordle', 'invaders', 'breakout', 'doodle', 'crossy', 'sudoku', 'minesweeper', 'solitaire', 'blackjack', 'connect4', 'tictactoe', 'checkers', 'reversi', 'asteroids', 'pong', 'frogger', 'bubbles', 'slicer', 'emoji', 'tower', 'archery', 'maze', 'memory', 'simon', 'mastermind', 'battleship', 'nonogram', 'lightsout', 'sliding', 'mahjong', 'poker', 'hangman', 'quiz', 'rps', 'mole', 'insects', 'shapes', 'typing', 'speedtype', 'wordrain', 'numtype', 'numspeak', 'dice']
const all = [...puzzle, ...words, ...logic, ...boards, ...cards, ...arcade, ...arcade2]

export default order.map(id => all.find(g => g.id == id)).filter(Boolean).concat(all.filter(g => !order.includes(g.id)))

// Game categories: the Games tab shows them as folders, and each folder opens its own grid of games.
// Order here is the order of the folders. A game listed in no category lands in "More", so none goes missing.
export default [
    {
        id: 'arcade',
        title: 'Arcade',
        overview: 'Reflex and action',
        c1: '#FF5A4D', c2: '#FF9F0A',
        games: ['snake', 'flappy', 'pacman', 'tetris', 'breakout', 'pong', 'invaders', 'asteroids', 'frogger', 'crossy', 'doodle', 'bubbles', 'slicer', 'tower', 'archery', 'mole', 'insects', 'emoji', 'shapes', 'maze']
    },
    {
        id: 'puzzle',
        title: 'Puzzle & Logic',
        overview: 'Think it through',
        c1: '#3E91FF', c2: '#A55CEB',
        games: ['2048', 'candy', 'sudoku', 'nonogram', 'lightsout', 'sliding', 'mahjong', 'memory', 'simon', 'mastermind', 'minesweeper']
    },
    {
        id: 'board',
        title: 'Board & Cards',
        overview: 'Dice, cards and boards',
        c1: '#35C976', c2: '#8A5A2B',
        games: ['chess', 'checkers', 'reversi', 'tictactoe', 'connect4', 'battleship', 'solitaire', 'blackjack', 'poker', 'rps', 'dice']
    },
    {
        id: 'words',
        title: 'Words & Typing',
        overview: 'Letters, numbers and speed',
        c1: '#6AD6FF', c2: '#5B55E6',
        games: ['wordle', 'hangman', 'typing', 'speedtype', 'wordrain', 'numtype', 'numspeak']
    },
    {
        id: 'quiz',
        title: 'Quizzes',
        overview: 'Trivia, flags, films and party play',
        c1: '#FFD83D', c2: '#FF9019',
        games: ['kahoot', 'quiz', 'movie_quiz', 'flags', 'true_false']
    }
]

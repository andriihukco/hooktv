// Game categories: the Games tab shows them as folders, and each folder opens its own grid of games.
// Order here is the order of the folders. A game listed in no category lands in "More", so none goes missing.
export default [
    {
        id: 'arcade',
        title: 'Arcade',
        overview: 'Reflex and action',
        c1: '#FF5A4D', c2: '#FF9F0A',
        games: ['snake', 'flappy', 'pacman', 'tetris', 'breakout', 'pong', 'crossy', 'doodle', 'bubbles', 'slicer', 'tower', 'mole', 'racer', 'astray', 'duel']
    },
    {
        id: 'puzzle',
        title: 'Puzzle & Logic',
        overview: 'Think it through',
        c1: '#3E91FF', c2: '#A55CEB',
        games: ['2048', 'candy', 'sudoku', 'sliding', 'memory', 'minesweeper']
    },
    {
        id: 'board',
        title: 'Board & Cards',
        overview: 'Cards and boards',
        c1: '#35C976', c2: '#8A5A2B',
        games: ['chess', 'checkers', 'reversi', 'tictactoe', 'battleship', 'solitaire', 'blackjack', 'poker', 'rps']
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
        overview: 'Trivia, flags, films and capitals',
        c1: '#FFD83D', c2: '#FF9019',
        games: ['quiz', 'movie_quiz', 'flags', 'capitals', 'true_false', 'higher_lower']
    },
    {
        id: 'party',
        title: 'Party & Teams',
        overview: 'Solo, duo or teams',
        c1: '#FF9F0A', c2: '#FF375F',
        games: ['alias', 'charades', 'kahoot']
    }
]

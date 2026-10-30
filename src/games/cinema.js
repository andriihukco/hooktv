import {t} from './i18n'

// The cinema layer: every game can be played in a film style (a skin) and carries a poster line of its own.
// A skin recolours the canvas games through the shared palette, tints the rest with CSS, adds a title card
// before the game and a closing line after it. Skins are written in the spirit of a genre, not of a studio.

export const SKINS = [
    {id: 'classic', name: 'Classic', chapter: 'Now playing', win: '', lose: ''},
    {
        id: 'wizard', name: 'Wizard School', chapter: 'Year One', win: 'A spell well cast.', lose: 'The candles go out.',
        accent: '#E8C170', palette: {bg: '#120a0a', lime: '#E8C170', blue: '#7A5CFF', pink: '#C0392B', orange: '#E39B3A', purple: '#6C3FA0', teal: '#E8C170', yellow: '#F2D27A', green: '#4F8A5B', red: '#B03A2E'}
    },
    {
        id: 'ring', name: 'The Quest', chapter: 'Book One', win: 'The quest is complete.', lose: 'The shadow grows.',
        accent: '#C9B26B', palette: {bg: '#0d120b', lime: '#C9B26B', blue: '#5B8DA6', pink: '#A8573A', orange: '#D9923A', purple: '#6B5B7A', teal: '#8FBF9A', yellow: '#E5C76B', green: '#5E9B55', red: '#A8432C'}
    },
    {
        id: 'pulp', name: 'Pulp Chapters', chapter: 'Chapter One', win: 'Chapter closed.', lose: 'To be continued…',
        accent: '#FFD60A', palette: {bg: '#0d0c08', lime: '#FFD60A', blue: '#3C5A8A', pink: '#D62828', orange: '#F77F00', purple: '#7A2E4B', teal: '#EAE2B7', yellow: '#FFD60A', green: '#6A994E', red: '#D62828'}
    },
    {
        id: 'neon', name: 'Neon Rain', chapter: 'Reel 01', win: 'Signal acquired.', lose: 'Connection lost.',
        accent: '#00FF9C', palette: {bg: '#04070f', lime: '#00FF9C', blue: '#00B7FF', pink: '#FF2E88', orange: '#FF7A00', purple: '#9B5CFF', teal: '#00F0FF', yellow: '#F7FF59', green: '#00FF9C', red: '#FF2E5B'}
    },
    {
        id: 'space', name: 'Space Saga', chapter: 'Episode I', win: 'The galaxy sleeps safe.', lose: 'The stars grow dim.',
        accent: '#9BE7FF', palette: {bg: '#02030a', lime: '#9BE7FF', blue: '#3A7BFF', pink: '#FF6F91', orange: '#FFA94D', purple: '#7A6CFF', teal: '#7FE7FF', yellow: '#FFD166', green: '#5EE0A0', red: '#FF5C5C'}
    },
    {
        id: 'western', name: 'Dusty Western', chapter: 'Act I', win: 'Sundown. You rode out.', lose: 'Boot Hill.',
        accent: '#E0B060', palette: {bg: '#17110a', lime: '#E0B060', blue: '#6E8A9A', pink: '#C46A4A', orange: '#D98A3D', purple: '#8A6A6A', teal: '#C9B38A', yellow: '#E6C26A', green: '#7F9A5A', red: '#B5442E'}
    }
]

export const skinById = id => SKINS.find(s => s.id == id) || SKINS[0]

export const skinName = skin => t('hooktv_skin_' + skin.id, skin.name)

// A genre and one line for every game: the poster of its lobby and the subtitle of its title card.
const FILM = {
    '2048': ['Puzzle thriller', 'Every merge rewrites the ending.'],
    snake: ['Creature feature', 'Something ancient is hungry.'],
    tetris: ['Disaster movie', 'The ceiling is coming down. Stay calm.'],
    pacman: ['Chase thriller', 'Four ghosts. One corridor. No exit.'],
    flappy: ['Survival drama', 'One wingbeat from disaster.'],
    chess: ['Psychological thriller', 'Every move is a confession.'],
    candy: ['Fairy tale', 'A sweet town and a sticky plot.'],
    wordle: ['Mystery', 'Six chances to name the culprit.'],
    breakout: ['Prison break', 'The wall must fall.'],
    doodle: ['Adventure', 'Higher than anyone has ever jumped.'],
    crossy: ['Road movie', 'The traffic never sleeps.'],
    sudoku: ['Noir mystery', 'Nine suspects. One truth.'],
    minesweeper: ['War film', 'Walk softly. Trust the numbers.'],
    solitaire: ['Western', 'One player, one deck, one long afternoon.'],
    blackjack: ['Casino heist', 'Twenty-one reasons to stay.'],
    tictactoe: ['Duel', 'Three in a row at high noon.'],
    checkers: ['Costume drama', 'Every piece has a crown to earn.'],
    reversi: ['Political drama', 'Loyalties flip in a single move.'],
    pong: ['Sports drama', 'The first rally ever played.'],
    bubbles: ['Animated feature', 'Pop the sky.'],
    slicer: ['Martial-arts epic', 'Steel, speed and a confused kitchen.'],
    tower: ['Disaster epic', 'Build it taller than the plot allows.'],
    memory: ['Mind-bender', 'You have seen this before.'],
    battleship: ['War epic', 'The enemy fleet is somewhere in the fog.'],
    sliding: ['Puzzle box', 'The picture is in there somewhere.'],
    poker: ['Neo-western', 'Everyone is bluffing. Almost.'],
    hangman: ['Gothic mystery', 'Guess before the rope runs out.'],
    quiz: ['Game-show special', 'Fastest finger wins the night.'],
    rps: ['Duel', 'Three weapons. Zero mercy.'],
    mole: ['Slapstick comedy', 'Whack-a-whatever.'],
    typing: ['Newsroom drama', 'Deadline in sixty seconds.'],
    speedtype: ['Action thriller', 'Type like the building is on fire.'],
    wordrain: ['Disaster fantasy', 'It is raining words.'],
    numtype: ['Spy thriller', 'Dial the code before they do.'],
    alias: ['Comedy ensemble', 'Say everything except the word.'],
    charades: ['Silent film', 'No sound. Only gestures.'],
    higher_lower: ['Documentary', 'Facts have a way of surprising you.'],
    capitals: ['Travelogue', 'Name the city on the postcard.'],
    kahoot: ['Game show', 'Four colours, one winner.'],
    true_false: ['Courtroom drama', 'The truth, the whole truth, quickly.'],
    movie_quiz: ['Cinephile’s night', 'Prove you stayed for the credits.'],
    flags: ['Epic journey', 'A hundred flags, one passport.'],
    film_buff: ['Cinephile’s dream', 'Pick a universe and prove you know it.'],
    emoji_movie: ['Silent mystery', 'Guess the film from the clues.']
}

export function film(game){
    let [genre, line] = FILM[game.id] || ['Feature presentation', game.hint || '']

    return {genre: t('game_' + game.id + '_genre', genre), line: t('game_' + game.id + '_tagline', line)}
}

/** the closing line of a run in the skin's voice; empty for Classic */
export const ending = (skin, win) => win ? t('hooktv_skin_' + skin.id + '_win', skin.win) : t('hooktv_skin_' + skin.id + '_lose', skin.lose)

/** the number of games that carry a poster line: every game in the catalog should be one of them */
export const posters = () => Object.keys(FILM)

// The awards a player wins on a game: a rung per number of plays, and the top prize for a run of wins.
// Named after the ladder of a festival run, from a first screening to the Academy.
export function award(plays, wins){
    if(wins >= 10) return t('hooktv_award_best', 'Best Picture')
    if(plays >= 25) return t('hooktv_award_oscar', 'Oscar nominee')
    if(plays >= 10) return t('hooktv_award_festival', 'Festival favourite')
    if(plays >= 3) return t('hooktv_award_indie', 'Indie darling')
    if(plays >= 1) return t('hooktv_award_short', 'Short film')

    return t('hooktv_award_none', 'Not yet in production')
}

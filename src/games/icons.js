// App-store style game icons: a deep two-tone gradient (drawn by the card's CSS) and a flat white glyph on top.
// Glyphs live in a 100×100 box; the darker gradient colour is `currentColor`, so cut-outs read as holes in the white shape.

const W = (o = 1) => `fill="#fff"${o < 1 ? ` fill-opacity="${o}"` : ''}`
const S = (w = 6, o = 1) => `fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o < 1 ? ` stroke-opacity="${o}"` : ''}`
const rect = (x, y, w, h, r = 4, o = 1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${W(o)}/>`
const circ = (x, y, r, o = 1) => `<circle cx="${x}" cy="${y}" r="${r}" ${W(o)}/>`
const hole = (x, y, r, o = 1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`
const line = (x1, y1, x2, y2, w = 6, o = 1) => `<path d="M${x1} ${y1}L${x2} ${y2}" ${S(w, o)}/>`
const path = (d, o = 1) => `<path d="${d}" ${W(o)}/>`
const stroke = (d, w = 6, o = 1) => `<path d="${d}" ${S(w, o)}/>`
const cut = (d, o = 1) => `<path d="${d}" fill="currentColor"${o < 1 ? ` fill-opacity="${o}"` : ''}/>`

// a pixel picture: rows of '#' and '.'
const pixels = (rows, cell, x, y, o = 1) => rows.map((row, j) => [...row].map((ch, i) => ch == '#' ? rect(x + i * cell, y + j * cell, cell + .4, cell + .4, cell > 8 ? 2 : 0.6, o) : '').join('')).join('')

const spade = 'M50 27C50 27 31 42 31 55C31 62 37 66 44 63C43 68 41 72 38 75H62C59 72 57 68 56 63C63 66 69 62 69 55C69 42 50 27 50 27Z'

const glyphs = {
    '2048': () => rect(20, 20, 28, 28, 8, .55) + rect(52, 20, 28, 28, 8, .8) + rect(20, 52, 28, 28, 8, .8) + rect(52, 52, 28, 28, 8) + `<text x="66" y="73" text-anchor="middle" font-size="19" font-weight="800" fill="currentColor" font-family="-apple-system,SF Pro Display,Helvetica,Arial,sans-serif">8</text>`,
    snake: () => stroke('M72 30H42a13 13 0 0 0 0 26h16a13 13 0 0 1 0 26H28', 12) + circ(76, 30, 9) + hole(79, 28, 2.6) + circ(78, 78, 6, .7),
    tetris: () => rect(19, 19, 20, 20, 5) + rect(41, 19, 20, 20, 5) + rect(63, 19, 20, 20, 5) + rect(41, 41, 20, 20, 5) + rect(19, 63, 20, 20, 5, .6) + rect(41, 63, 20, 20, 5, .6) + rect(63, 63, 20, 20, 5, .6) + rect(63, 41, 20, 20, 5, .35),
    pacman: () => path('M44 50L74 32A34 34 0 1 0 74 68Z') + hole(48, 30, 4.6) + circ(86, 50, 5, .85),
    flappy: () => `<ellipse cx="46" cy="54" rx="28" ry="23" ${W()}/>` + `<ellipse cx="38" cy="58" rx="13" ry="9" fill="currentColor" fill-opacity=".22"/>` + circ(60, 44, 8) + hole(62, 44, 3.8) + path('M72 52L90 57L72 64Z', .85),
    chess: () => circ(50, 31, 12) + rect(38, 44, 24, 8, 4) + path('M42 52C45 66 41 72 34 76H66C59 72 55 66 58 52Z') + rect(29, 76, 42, 9, 4.5),
    candy: () => circ(50, 50, 21) + path('M30 50L11 36V64Z', .85) + path('M70 50L89 36V64Z', .85) + `<path d="M35 61C43 69 57 69 65 61" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="6" stroke-linecap="round"/>` + `<path d="M36 39C42 33 52 32 58 35" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="6" stroke-linecap="round"/>`,
    wordle: () => rect(18, 20, 20, 20, 5) + rect(40, 20, 20, 20, 5, .45) + rect(62, 20, 20, 20, 5) + rect(18, 42, 20, 20, 5, .45) + rect(40, 42, 20, 20, 5) + rect(62, 42, 20, 20, 5, .45) + rect(18, 64, 20, 20, 5) + rect(40, 64, 20, 20, 5) + rect(62, 64, 20, 20, 5),
    invaders: () => pixels(['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'], 6.4, 15, 26),
    breakout: () => [0, 1, 2].map(j => [0, 1, 2, 3].map(i => rect(17 + i * 17, 20 + j * 12, 15, 9, 3, j == 1 ? .6 : 1)).join('')).join('') + circ(56, 62, 5.5) + rect(32, 78, 36, 8, 4),
    doodle: () => rect(36, 18, 28, 36, 14) + hole(45, 32, 3.4) + hole(56, 32, 3.4) + path('M64 38L78 41L64 46Z', .85) + stroke('M40 58V68M60 58V68M40 68H34M60 68H66', 6) + rect(24, 78, 52, 9, 4.5, .8),
    crossy: () => rect(32, 30, 36, 34, 8) + rect(44, 20, 12, 12, 4, .8) + path('M68 42L82 47L68 52Z', .85) + hole(58, 42, 3.4) + rect(14, 76, 22, 6, 3, .55) + rect(44, 76, 22, 6, 3, .55) + rect(74, 76, 14, 6, 3, .55),
    sudoku: () => `<rect x="19" y="19" width="62" height="62" rx="9" ${S(5)}/>` + line(40, 20, 40, 80, 3.4, .6) + line(60, 20, 60, 80, 3.4, .6) + line(20, 40, 80, 40, 3.4, .6) + line(20, 60, 80, 60, 3.4, .6) + ['5|29|31', '3|50|52', '7|71|73', '9|30|72', '1|72|52'].map(s => { let [t, x, y] = s.split('|'); return `<text x="${x}" y="${+y + 6}" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="-apple-system,SF Pro Display,Helvetica,Arial,sans-serif">${t}</text>` }).join(''),
    minesweeper: () => circ(50, 52, 20) + [0, 45, 90, 135].map(a => `<path d="M50 24V80" transform="rotate(${a} 50 52)" ${S(6)}/>`).join('') + hole(43, 45, 5, .3),
    solitaire: () => rect(27, 17, 46, 66, 8) + cut(spade),
    blackjack: () => `<g transform="rotate(-14 40 56)">${rect(22, 22, 40, 58, 7, .5)}</g>` + rect(36, 20, 42, 60, 7) + `<text x="57" y="60" text-anchor="middle" font-size="26" font-weight="800" fill="currentColor" font-family="-apple-system,SF Pro Display,Helvetica,Arial,sans-serif">21</text>`,
    connect4: () => rect(16, 22, 68, 56, 12, .28) + [0, 1, 2, 3].map(i => [0, 1, 2].map(j => circ(29 + i * 14, 36 + j * 14, 5.2, (i + j * 2) % 3 == 0 ? 1 : .55)).join('')).join(''),
    tictactoe: () => line(40, 20, 40, 80, 5, .55) + line(60, 20, 60, 80, 5, .55) + line(20, 40, 80, 40, 5, .55) + line(20, 60, 80, 60, 5, .55) + line(24, 24, 36, 36, 6) + line(36, 24, 24, 36, 6) + `<circle cx="50" cy="50" r="6.6" ${S(5)}/>` + line(64, 64, 76, 76, 6) + line(76, 64, 64, 76, 6),
    checkers: () => circ(50, 52, 28, .5) + circ(50, 46, 28) + `<circle cx="50" cy="46" r="17" fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width="5"/>`,
    reversi: () => circ(50, 50, 31) + `<path d="M50 19A31 31 0 0 1 50 81Z" fill="currentColor" fill-opacity=".72"/>`,
    asteroids: () => `<path d="M50 20L70 74L50 63L30 74Z" ${S(6.5)}/>` + `<path d="M76 18L88 24L86 38L74 40L68 29Z" ${S(4, .6)}/>`,
    pong: () => rect(16, 30, 9, 34, 4.5) + rect(75, 38, 9, 34, 4.5) + circ(52, 50, 6.5) + [0, 1, 2, 3].map(i => rect(48.5, 18 + i * 20, 3.4, 11, 1.7, .5)).join(''),
    frogger: () => circ(33, 32, 12) + circ(67, 32, 12) + hole(33, 33, 5.2) + hole(67, 33, 5.2) + `<ellipse cx="50" cy="58" rx="31" ry="23" ${W()}/>` + `<path d="M36 60C43 68 57 68 64 60" fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>`,
    bubbles: () => `<circle cx="38" cy="42" r="19" ${S(5)}/>` + `<circle cx="38" cy="42" r="19" ${W(.2)}/>` + `<circle cx="68" cy="34" r="12" ${S(4.5, .8)}/>` + `<circle cx="62" cy="68" r="15" ${S(5, .9)}/>` + `<circle cx="62" cy="68" r="15" ${W(.14)}/>` + stroke('M28 36C30 31 34 28 39 27', 3.6, .85),
    slicer: () => path('M18 44A32 32 0 0 0 82 44Z') + `<path d="M26 47A24 24 0 0 0 74 47Z" fill="currentColor" fill-opacity=".3"/>` + hole(40, 58, 2.6, .6) + hole(50, 66, 2.6, .6) + hole(60, 58, 2.6, .6) + line(22, 22, 80, 40, 5, .85),
    emoji: () => circ(50, 50, 30) + hole(40, 44, 4.8) + hole(60, 44, 4.8) + `<path d="M35 57C42 68 58 68 65 57" fill="none" stroke="currentColor" stroke-width="5.4" stroke-linecap="round"/>`,
    tower: () => rect(35, 18, 30, 13, 4) + rect(24, 33, 46, 13, 4, .85) + rect(30, 48, 46, 13, 4, .7) + rect(20, 63, 56, 13, 4, .55) + rect(12, 78, 76, 7, 3.5, .4),
    archery: () => circ(46, 54, 30, .5) + `<circle cx="46" cy="54" r="22" fill="currentColor" fill-opacity=".3"/>` + circ(46, 54, 14, .9) + hole(46, 54, 6.5, .6) + line(46, 54, 80, 20, 5) + path('M80 20L90 18L88 28Z') + line(70, 30, 82, 32, 3.6, .8) + line(68, 32, 70, 20, 3.6, .8),
    maze: () => stroke('M22 26H78V74H30V42H62V58H46', 6.5, .7) + circ(46, 58, 7.5) + circ(22, 26, 5, .5),
    memory: () => `<g transform="rotate(-10 40 56)">${rect(18, 24, 36, 52, 7, .5)}</g>` + `<g transform="rotate(8 62 50)">${rect(44, 24, 38, 54, 7)}${cut('M63 38L66 46H75L68 51L71 60L63 55L55 60L58 51L51 46H60Z')}</g>`,
    simon: () => path('M47 47V19A31 31 0 0 0 16 47Z', .9) + path('M53 47V19A31 31 0 0 1 84 47Z', .55) + path('M47 53V81A31 31 0 0 1 16 53Z', .55) + path('M53 53V81A31 31 0 0 0 84 53Z', .9),
    mastermind: () => [0, 1, 2, 3].map(i => circ(24 + i * 17.5, 32, 7.5, [1, .55, 1, .35][i])).join('') + [0, 1, 2, 3].map(i => circ(24 + i * 17.5, 56, 7.5, [.55, 1, .35, 1][i])).join('') + [0, 1, 2, 3].map(i => circ(31 + i * 12.5, 80, 3.6, [1, .5, 1, .5][i])).join(''),
    battleship: () => path('M14 56H86L76 72H26Z') + rect(38, 40, 26, 16, 3, .9) + rect(45, 30, 12, 10, 2.5, .8) + line(51, 20, 51, 30, 3.6) + stroke('M16 82Q26 76 36 82T56 82T76 82T90 80', 4, .6),
    nonogram: () => pixels(['.#.#.', '#####', '#####', '.###.', '..#..'], 12, 20, 22),
    lightsout: () => circ(50, 42, 24) + rect(41, 64, 18, 8, 3.5, .85) + rect(44, 74, 12, 6, 3, .85) + hole(42, 36, 5, .22) + [[50, 8, 50, 14], [18, 22, 23, 27], [82, 22, 77, 27], [10, 48, 16, 48], [90, 48, 84, 48]].map(a => line(...a, 4.4, .85)).join(''),
    sliding: () => [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]].map(([i, j]) => rect(18 + i * 22, 18 + j * 22, 20, 20, 5, (i + j) % 2 ? .55 : 1)).join('') + `<rect x="62" y="62" width="20" height="20" rx="5" ${S(2.6, .45)}/>`,
    mahjong: () => rect(27, 17, 46, 66, 9) + `<rect x="33" y="23" width="34" height="46" rx="5" fill="currentColor" fill-opacity=".14"/>` + hole(42, 36, 6) + hole(58, 36, 6) + hole(50, 50, 6) + hole(42, 62, 6) + hole(58, 62, 6),
    poker: () => `<g transform="rotate(-14 40 56)">${rect(20, 22, 40, 58, 7, .5)}</g>` + rect(38, 20, 42, 60, 7) + cut('M59 33L75 52L59 71L43 52Z'),
    hangman: () => stroke('M24 82H62M38 82V22H66V32', 6.5) + `<circle cx="66" cy="42" r="8" ${S(4.6)}/>` + stroke('M66 50V66M66 56L58 63M66 56L74 63M66 66L60 76M66 66L72 76', 4.2, .85),
    quiz: () => stroke('M36 38A14 14 0 1 1 57 49C52 52 50 55 50 62', 9) + circ(50, 77, 6),
    rps: () => line(32, 24, 68, 66, 7) + line(68, 24, 32, 66, 7) + `<circle cx="30" cy="76" r="10" ${S(5.2)}/>` + `<circle cx="70" cy="76" r="10" ${S(5.2)}/>`,
    mole: () => `<ellipse cx="50" cy="76" rx="33" ry="10" fill="currentColor" fill-opacity=".38"/>` + path('M27 76A23 25 0 0 1 73 76Z') + hole(41, 62, 3.8) + hole(59, 62, 3.8) + `<ellipse cx="50" cy="69" rx="6" ry="4.2" fill="currentColor" fill-opacity=".5"/>`,
    insects: () => circ(50, 28, 10) + circ(50, 56, 27) + `<path d="M50 30V83" stroke="currentColor" stroke-opacity=".4" stroke-width="4"/>` + hole(40, 52, 4.8, .6) + hole(60, 52, 4.8, .6) + hole(42, 68, 4, .6) + hole(58, 68, 4, .6) + line(40, 20, 34, 12, 3.6) + line(60, 20, 66, 12, 3.6),
    shapes: () => circ(35, 36, 15) + rect(48, 46, 32, 32, 8, .85) + path('M22 82L38 52L54 82Z', .62),
    typing: () => [[0, 0, 5], [0, 1, 5], [0, 2, 5]].map(([_, j, n]) => Array.from({length: n}, (_, i) => rect(17 + i * 13.4 + (j == 1 ? 4 : j == 2 ? 8 : 0), 24 + j * 17, 11, 12, 3.4)).join('')).join('') + rect(26, 76, 48, 12, 4, .7),
    speedtype: () => path('M57 14L28 55H46L40 86L72 42H53Z'),
    wordrain: () => circ(36, 44, 14) + circ(54, 38, 18) + circ(72, 48, 12) + rect(30, 46, 52, 14, 7) + line(36, 72, 31, 84, 5, .8) + line(52, 72, 47, 84, 5, .8) + line(68, 72, 63, 84, 5, .8),
    numtype: () => stroke('M42 22L37 78M66 22L61 78M23 40H79M21 62H77', 7.5),
    numspeak: () => rect(38, 16, 24, 42, 12) + stroke('M28 46A22 22 0 0 0 72 46', 5.6) + line(50, 68, 50, 82, 5.6) + line(38, 84, 62, 84, 5.6),
    dice: () => rect(21, 21, 58, 58, 15) + hole(37, 37, 5.8) + hole(63, 37, 5.8) + hole(50, 50, 5.8) + hole(37, 63, 5.8) + hole(63, 63, 5.8)
}

// gradient top → bottom: saturated, a touch deeper at the bottom, like the App Store's game icons
const tints = {
    '2048': ['#FFC247', '#FF6A2B'], snake: ['#4ADE80', '#0E9F78'], tetris: ['#8B7BFF', '#3B6DF0'], pacman: ['#FFD93D', '#FF9500'],
    flappy: ['#5EDBFF', '#1F8BFF'], chess: ['#6B6B76', '#1D1D23'], candy: ['#FF7EB3', '#B04BEA'], wordle: ['#58E08A', '#12915A'],
    invaders: ['#3A3A8F', '#14143A'], breakout: ['#FF6B8B', '#FF8A1F'], doodle: ['#B7F04E', '#2DBF64'], crossy: ['#68E36F', '#19A19B'],
    sudoku: ['#4DA3FF', '#4C4BD6'], minesweeper: ['#8A8A94', '#2E2E36'], solitaire: ['#25B867', '#075E35'], blackjack: ['#3A3A44', '#14141A'],
    connect4: ['#FFD53D', '#F4521E'], tictactoe: ['#5AB8FF', '#2563EB'], checkers: ['#FF6259', '#A81F2B'], reversi: ['#3FD07A', '#0B6B3A'],
    asteroids: ['#4A5266', '#12141F'], pong: ['#3D8BFF', '#5B3FD8'], frogger: ['#4ADE80', '#1E8FD8'], bubbles: ['#7CE2FF', '#8A5CF0'],
    slicer: ['#FF6A88', '#FFB02E'], emoji: ['#FFE04D', '#FF9F0A'], tower: ['#FFAA2C', '#F0386B'], archery: ['#FFB13D', '#26B76A'],
    maze: ['#7D6BFF', '#C055F0'], memory: ['#C378F5', '#F23E6E'], simon: ['#B26CF5', '#2D8CFF'], mastermind: ['#FFA838', '#B650E8'],
    battleship: ['#3B93FF', '#16396B'], nonogram: ['#C45EF2', '#FF4D79'], lightsout: ['#FFDA3A', '#FF8F1F'], sliding: ['#45D98A', '#2486F2'],
    mahjong: ['#35C976', '#8A5A2B'], poker: ['#FF4F78', '#5B4CE0'], hangman: ['#FFA52E', '#F0453A'], quiz: ['#FFD83D', '#FF9019'],
    rps: ['#FF5A7A', '#FF9A2E'], mole: ['#B38A5F', '#4C9A52'], insects: ['#FF5A4D', '#2DB961'], shapes: ['#3E91FF', '#A55CEB'],
    typing: ['#6C63F0', '#38C8F0'], speedtype: ['#FFD93D', '#FF3B6B'], wordrain: ['#6AD6FF', '#5B55E6'], numtype: ['#62D6FF', '#1F7CF5'],
    numspeak: ['#FF5A7A', '#B450E6'], dice: ['#FF5B52', '#B352E8']
}

export function glyph(id){
    let g = glyphs[id]

    return g ? g() : ''
}

export function tint(id){
    return tints[id] || ['#6C63F0', '#38C8F0']
}

// markup shared by the cards and the player: a gradient squircle with the glyph on it
export function iconHTML(id){
    let [a, b] = tint(id)

    return `<span class="game-icon" style="--ga:${a};--gb:${b};color:${b}"><svg viewBox="0 0 100 100" aria-hidden="true">${glyph(id)}</svg></span>`
}

export const ids = Object.keys(glyphs)

// Quiz games: a shared multiple-choice engine (trivia, movies, flags, capitals, true or false) that plays solo, in duo
// or in teams, and a Kahoot-style party quiz against bots. The questions live in ../data/questions.js.
import {TRIVIA, MOVIES, STATEMENTS, PARTY_QUESTIONS, flagQuestions, capitalQuestions} from '../data/questions'
import {run, LIMITS, COUNTS, TEAMS, MODES} from '../quizkit'

// Kahoot-style answer tiles: red triangle, blue diamond, yellow circle, green square
const TILES = [
    {color: '#E21B3C', shape: '<path d="M50 24L80 74H20Z" fill="#fff"/>'},
    {color: '#1368CE', shape: '<path d="M50 22L78 50L50 78L22 50Z" fill="#fff"/>'},
    {color: '#D89E00', shape: '<circle cx="50" cy="50" r="28" fill="#fff"/>'},
    {color: '#26890C', shape: '<rect x="24" y="24" width="52" height="52" rx="6" fill="#fff"/>'}
]


// Kahoot-style party quiz on one screen: four coloured answers, a speed bonus, and three bots to beat.
// The bots answer when the round starts, so the leaderboard after each question is ready at once.
function party(env){
    const BOTS = ['Ada', 'Miro', 'Kai']
    const qs = env.shuffle(PARTY_QUESTIONS).slice(0, +env.opts.count || 10), LIMIT = LIMITS[env.level]
    const rows = BOTS.map(name => ({name, score: 0, you: false}))
    const you = {name: 'You', score: 0, you: true}
    let qi = 0, t0, order, locked

    let q = document.createElement('div')
    q.style.cssText = 'position:absolute;left:5%;right:5%;top:5%;text-align:center;font-size:1.6em;font-weight:700;min-height:3em'
    let bar = document.createElement('div')
    bar.style.cssText = 'position:absolute;left:5%;right:5%;top:0;height:.4em;background:var(--accent,#C8F542);transform-origin:left;transition:transform .1s linear;border-radius:99em'
    let board = document.createElement('div')
    board.style.cssText = 'position:absolute;left:10%;right:10%;top:24%;bottom:40%;display:none;flex-direction:column;justify-content:center;gap:.5em;font-size:1.3em'
    ;[q, bar, board].forEach(n => env.el.appendChild(n))

    let g = env.grid(2, 2, (c, i) => {
        c.style.cssText += ';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3em;padding:.5em;font-size:1.1em;color:#fff;font-weight:700;text-align:center'
        c.innerHTML = `<svg viewBox="0 0 100 100" width="1.6em" height="1.6em">${TILES[i].shape}</svg><span class="k-text"></span>`
        c.dataset.color = TILES[i].color
    }, pick, {css: 'inset:auto 3% 3% 3%;height:52%;gap:.5em;padding:0'})

    const standings = () => [you, ...rows].sort((a, b) => b.score - a.score)

    function ask(){
        let [text, ...a] = qs[qi]; order = env.shuffle(a.map((v, i) => i))
        q.textContent = `${qi + 1}/${qs.length} · ${text}`
        board.style.display = 'none'
        g.cells.forEach((c, i) => {
            c.style.display = ''
            c.style.background = TILES[i].color
            c.querySelector('.k-text').textContent = a[order[i]]
        })
        // bots: 40 / 60 / 80% right by level, each with a speed bonus that depends on how quickly they answer
        rows.forEach(b => {
            let delay = env.rnd(1500, 9000), right = Math.random() < [.4, .6, .8][env.level]
            if(right) b.score += 500 + Math.round(500 * (1 - delay / LIMIT))
        })
        t0 = Date.now(); locked = false
    }

    function pick(i){
        if(locked) return; locked = true
        let ok = i >= 0 && order[i] == 0, left = Math.max(0, LIMIT - (Date.now() - t0)) / LIMIT
        if(ok){ let pts = 500 + Math.round(500 * left); env.score(pts, 1); you.score = env.points; env.sfx('good') }
        else env.sfx('bad')
        // the right answer stays lit, the others fade
        g.cells.forEach((c, k) => { if(order[k] != 0) c.style.background = '#2b2b30' })
        finish()
    }

    function finish(){
        board.innerHTML = ''
        standings().forEach((s, n) => {
            let line = document.createElement('div')
            line.style.cssText = `display:flex;justify-content:space-between;padding:.35em .8em;border-radius:.6em;background:${s.you ? 'rgba(200,245,66,.18)' : 'rgba(255,255,255,.06)'};font-weight:${s.you ? 700 : 500}`
            line.innerHTML = `<span>${n + 1}. ${s.name}</span><span>${s.score}</span>`
            board.appendChild(line)
        })
        env.after(() => {
            g.cells.forEach(c => c.style.display = 'none')
            board.style.display = 'flex'
        }, 700)
        env.after(() => {
            if(++qi == qs.length){
                let rank = standings().indexOf(you) + 1
                env.over(`#${rank} of ${BOTS.length + 1} · ${env.points} points`, rank == 1)
            }
            else ask()
        }, 3600)
    }

    env.timer(() => {
        let l = 1 - (Date.now() - t0) / LIMIT
        bar.style.transform = `scaleX(${Math.max(0, locked ? 0 : l)})`
        if(l <= 0 && !locked) pick(-1)
    }, 100)
    ask()
}

export default [
    {
        id: 'kahoot', title: 'Quiz Party', emoji: '🎉', c1: '#E21B3C', c2: '#1368CE', size: [100, 90], levels: true,
        hint: 'Four coloured answers · faster right answers score more · three bots to beat',
        options: [COUNTS],
        start: party
    },
    {
        id: 'quiz', title: 'Trivia Quiz', emoji: '🧠', c1: '#FFD60A', c2: '#FF9F0A', size: [100, 80], levels: true, modes: MODES,
        hint: 'Pick a category · answer fast · play solo, as a duo or in teams',
        options: [
            {id: 'category', label: 'Category', def: 0, values: [{id: 'all', label: 'Everything'}].concat(TRIVIA.map(c => ({id: c.id, label: c.emoji + ' ' + c.title})))},
            COUNTS, TEAMS
        ],
        start: env => run(env, {bank: env.opts.category == 'all' ? TRIVIA.reduce((all, c) => all.concat(c.items), []) : TRIVIA.find(c => c.id == env.opts.category).items})
    },
    {
        id: 'movie_quiz', title: 'Movie Quiz', emoji: '🎬', c1: '#2A1B4A', c2: '#FF375F', size: [100, 80], levels: true, modes: MODES,
        hint: 'Films, actors and series · solo, duo or teams',
        options: [COUNTS, TEAMS],
        start: env => run(env, {bank: MOVIES})
    },
    {
        id: 'flags', title: 'Flag Quiz', emoji: '🏳️', c1: '#0A84FF', c2: '#FFD60A', size: [100, 80], levels: true, modes: MODES,
        hint: 'Name the country that owns each flag · solo, duo or teams',
        options: [COUNTS, TEAMS],
        start: env => run(env, {bank: flagQuestions(), emoji: true, prompt: 'Which country?'})
    },
    {
        id: 'capitals', title: 'Capitals', emoji: '🏙️', c1: '#30D158', c2: '#0A84FF', size: [100, 80], levels: true, modes: MODES,
        hint: 'Name the capital city · solo, duo or teams',
        options: [COUNTS, TEAMS],
        start: env => run(env, {bank: capitalQuestions()})
    },
    {
        id: 'true_false', title: 'True or False', emoji: '✅', c1: '#30D158', c2: '#64D2FF', size: [100, 80], levels: true, modes: MODES,
        hint: 'Decide fast · faster answers score more · solo, duo or teams',
        options: [COUNTS, TEAMS],
        start: env => run(env, {bank: STATEMENTS, cols: 2, rows: 1, css: 'inset:auto 4% 6% 4%;height:30%;gap:.6em;padding:0'})
    }
]

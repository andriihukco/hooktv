// Quiz games: a shared multiple-choice engine (movie, flag, true or false) and a Kahoot-style party quiz.
// Each item is [prompt, correct answer, ...wrong answers]; the answers are shuffled per question.
const MOVIES = [
    ['Which film is about a team that steals secrets from inside people’s dreams?', 'Inception', 'Interstellar', 'The Matrix', 'Memento'],
    ['Which film series is set at a wizard school called Hogwarts?', 'Harry Potter', 'The Chronicles of Narnia', 'Percy Jackson', 'Eragon'],
    ['Which Disney film follows a lion cub named Simba?', 'The Lion King', 'Bambi', 'Tarzan', 'Brother Bear'],
    ['Which saga contains the line “May the Force be with you”?', 'Star Wars', 'Star Trek', 'Dune', 'Battlestar Galactica'],
    ['Who directed Jaws (1975)?', 'Steven Spielberg', 'Martin Scorsese', 'Stanley Kubrick', 'Alfred Hitchcock'],
    ['Which 1997 film is about a ship that sank in the North Atlantic?', 'Titanic', 'Poseidon', 'The Abyss', 'Master and Commander'],
    ['In which film does the crew of the spaceship Nostromo face an alien?', 'Alien', 'Event Horizon', 'Solaris', 'Moon'],
    ['Who played Captain Jack Sparrow?', 'Johnny Depp', 'Orlando Bloom', 'Geoffrey Rush', 'Javier Bardem'],
    ['Which Pixar film follows a clownfish searching for his son?', 'Finding Nemo', 'Shark Tale', 'Moana', 'Up'],
    ['Which film won Best Picture at the 2020 Oscars?', 'Parasite', '1917', 'Joker', 'Once Upon a Time in Hollywood'],
    ['Which animated film features the song “Let It Go”?', 'Frozen', 'Tangled', 'Moana', 'Encanto'],
    ['Who is the villain of Avengers: Infinity War?', 'Thanos', 'Loki', 'Ultron', 'Red Skull'],
    ['Which 2023 film stars Margot Robbie as a doll in a pink world?', 'Barbie', 'Lady Bird', 'Little Women', 'Mamma Mia!']
]

const FLAGS = [
    ['🇺🇦', 'Ukraine', 'Sweden', 'Kazakhstan', 'Lithuania'],
    ['🇯🇵', 'Japan', 'South Korea', 'Bangladesh', 'Palau'],
    ['🇧🇷', 'Brazil', 'Colombia', 'Ecuador', 'Mexico'],
    ['🇨🇦', 'Canada', 'Austria', 'Peru', 'Poland'],
    ['🇪🇬', 'Egypt', 'Iraq', 'Syria', 'Jordan'],
    ['🇮🇳', 'India', 'Chad', 'Ireland', 'Ivory Coast'],
    ['🇰🇪', 'Kenya', 'Mali', 'Nigeria', 'Ghana'],
    ['🇳🇴', 'Norway', 'Iceland', 'Finland', 'Denmark'],
    ['🇹🇷', 'Turkey', 'Tunisia', 'Algeria', 'Azerbaijan'],
    ['🇦🇷', 'Argentina', 'Uruguay', 'Chile', 'Paraguay'],
    ['🇬🇷', 'Greece', 'Israel', 'Estonia', 'Finland'],
    ['🇹🇭', 'Thailand', 'Cambodia', 'Vietnam', 'Myanmar'],
    ['🇲🇽', 'Mexico', 'Italy', 'Ireland', 'Hungary'],
    ['🇵🇱', 'Poland', 'Belarus', 'Indonesia', 'Monaco']
]

const STATEMENTS = [
    ['The Pacific is the largest ocean on Earth.', 'True', 'False'],
    ['Octopuses have three hearts.', 'True', 'False'],
    ['Lightning never strikes the same place twice.', 'False', 'True'],
    ['Bananas are berries.', 'True', 'False'],
    ['The Sahara is the largest desert on Earth.', 'False', 'True'],
    ['Water boils at 100 °C at sea level.', 'True', 'False'],
    ['The Great Wall of China is visible from the Moon with the naked eye.', 'False', 'True'],
    ['Ukraine borders Poland.', 'True', 'False'],
    ['Sound travels faster in water than in air.', 'True', 'False'],
    ['Mount Everest is in Peru.', 'False', 'True'],
    ['Honey can stay edible for thousands of years.', 'True', 'False'],
    ['A group of crows is called a murder.', 'True', 'False'],
    ['Goldfish have a memory span of only three seconds.', 'False', 'True'],
    ['Venus is the hottest planet in the Solar System.', 'True', 'False'],
    ['The Eiffel Tower is in Berlin.', 'False', 'True']
]

// Kahoot-style answer tiles: red triangle, blue diamond, yellow circle, green square
const TILES = [
    {color: '#E21B3C', shape: '<path d="M50 24L80 74H20Z" fill="#fff"/>'},
    {color: '#1368CE', shape: '<path d="M50 22L78 50L50 78L22 50Z" fill="#fff"/>'},
    {color: '#D89E00', shape: '<circle cx="50" cy="50" r="28" fill="#fff"/>'},
    {color: '#26890C', shape: '<rect x="24" y="24" width="52" height="52" rx="6" fill="#fff"/>'}
]

const PARTY = [
    ['Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Mercury'],
    ['What is the capital of Ukraine?', 'Kyiv', 'Lviv', 'Odesa', 'Kharkiv'],
    ['How many continents are there?', '7', '5', '6', '8'],
    ['What is H₂O?', 'Water', 'Salt', 'Hydrogen', 'Oxygen'],
    ['Who painted the Mona Lisa?', 'Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Van Gogh'],
    ['What is the fastest land animal?', 'Cheetah', 'Lion', 'Horse', 'Greyhound'],
    ['Which gas do plants absorb from the air?', 'Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'],
    ['How many minutes are in two hours?', '120', '90', '100', '180'],
    ['Which organ pumps blood through the body?', 'Heart', 'Liver', 'Lung', 'Kidney'],
    ['Which is the longest river in Ukraine?', 'Dnipro', 'Dniester', 'Danube', 'Southern Bug'],
    ['In which year did humans first land on the Moon?', '1969', '1959', '1975', '1981'],
    ['What is the chemical symbol for gold?', 'Au', 'Ag', 'Gd', 'Go']
]

const LIMIT = 15000

// Multiple-choice round: a question, a 2×2 (or 2×1) grid of answers, a shrinking timer bar.
// Faster right answers score more, the same rule as the Trivia Quiz.
function choice(env, bank, opts = {}){
    let qs = env.shuffle(bank).slice(0, opts.count || 10), qi = 0, t0, order, locked
    let q = document.createElement('div')
    q.style.cssText = 'position:absolute;left:5%;right:5%;top:6%;text-align:center;font-size:1.9em;font-weight:700;min-height:3.4em'
    let bar = document.createElement('div')
    bar.style.cssText = 'position:absolute;left:5%;right:5%;top:0;height:.4em;background:var(--accent,#C8F542);transform-origin:left;transition:transform .1s linear;border-radius:99em'
    ;[q, bar].forEach(n => env.el.appendChild(n))

    let g = env.grid(opts.cols || 2, opts.rows || 2, c => { c.style.fontSize = '1.2em'; c.style.padding = '.5em'; c.style.textAlign = 'center' }, pick, {css: opts.css || 'inset:auto 4% 4% 4%;height:48%;gap:.5em;padding:0'})

    function ask(){
        let [text, ...a] = qs[qi]; order = env.shuffle(a.map((v, i) => i))
        q.innerHTML = opts.emoji ? `<div style="font-size:3.2em;line-height:1.2">${text}</div><div style="font-size:.6em;opacity:.6;margin-top:.2em">${qi + 1}/${qs.length} · ${opts.prompt || ''}</div>` : `${qi + 1}/${qs.length} · ${text}`
        g.cells.forEach((c, i) => { c.textContent = a[order[i]]; c.style.background = '' })
        t0 = Date.now(); locked = false
    }

    function pick(i){
        if(locked) return; locked = true
        let ok = order[i] == 0, left = Math.max(0, LIMIT - (Date.now() - t0)) / LIMIT
        if(g.cells[i]) g.cells[i].style.background = ok ? '#2f9e44' : '#a82a2a'
        if(!ok) g.cells[order.indexOf(0)].style.background = '#2f9e44'
        ok ? (env.score(50 + (left * 50 | 0), 1), env.sfx('good')) : env.sfx('bad')
        env.after(() => { if(++qi == qs.length) env.over(`${env.points} points`, true); else ask() }, 900)
    }

    env.timer(() => { let l = 1 - (Date.now() - t0) / LIMIT; bar.style.transform = `scaleX(${Math.max(0, locked ? 0 : l)})`; if(l <= 0 && !locked) pick(-1) }, 100)
    ask()
}

// Kahoot-style party quiz on one screen: four coloured answers, a speed bonus, and three bots to beat.
// The bots answer when the round starts, so the leaderboard after each question is ready at once.
function party(env){
    const BOTS = ['Ada', 'Miro', 'Kai']
    const qs = env.shuffle(PARTY).slice(0, 10)
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
        q.textContent = `${qi + 1}/10 · ${text}`
        board.style.display = 'none'
        g.cells.forEach((c, i) => {
            c.style.display = ''
            c.style.background = TILES[i].color
            c.querySelector('.k-text').textContent = a[order[i]]
        })
        // bots: ~60% right, each with a speed bonus that depends on how quickly they answer
        rows.forEach(b => {
            let delay = env.rnd(1500, 9000), right = Math.random() < 0.6
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
        id: 'kahoot', title: 'Quiz Party', emoji: '🎉', c1: '#E21B3C', c2: '#1368CE', size: [100, 90],
        hint: 'Four coloured answers · faster right answers score more · three bots to beat',
        start: party
    },
    {
        id: 'movie_quiz', title: 'Movie Quiz', emoji: '🎬', c1: '#2A1B4A', c2: '#FF375F', size: [100, 80],
        hint: 'Ten films · name the film from its story',
        start: env => choice(env, MOVIES, {count: 10, prompt: 'Which film?'})
    },
    {
        id: 'flags', title: 'Flag Quiz', emoji: '🏳️', c1: '#0A84FF', c2: '#FFD60A', size: [100, 80],
        hint: 'Ten flags · name the country that owns each one',
        start: env => choice(env, FLAGS, {count: 10, emoji: true, prompt: 'Which country?'})
    },
    {
        id: 'true_false', title: 'True or False', emoji: '✅', c1: '#30D158', c2: '#64D2FF', size: [100, 80],
        hint: 'Ten statements · decide fast, faster answers score more',
        start: env => choice(env, STATEMENTS, {count: 10, cols: 2, rows: 1, css: 'inset:auto 4% 6% 4%;height:30%;gap:.6em;padding:0'})
    }
]

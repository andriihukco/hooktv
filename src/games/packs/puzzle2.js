// Puzzles, part 2: a light grid, a dial lock and crumbling stepping stones.
// Our own rules and art; the ideas come from the sample games list (Patel230/sample-games), not from their code.

// the lock's feedback: how many digits are right and in place (exact), and right but in another place (near)
export function feedback(secret, guess){
    let exact = 0, left = {}, right = {}

    secret.forEach((s, i) => {
        if(s == guess[i]) exact++
        else { left[s] = (left[s] || 0) + 1; right[guess[i]] = (right[guess[i]] || 0) + 1 }
    })

    let near = 0

    for(let d in left) near += Math.min(left[d], right[d] || 0)

    return {exact, near}
}

// a route from the bottom-left to the top-right corner of an n × n board; the stones on it always lead to the star
export function route(n, shuffle){
    const seen = new Set(), path = []
    const start = (n - 1) * n, goal = n - 1
    const around = i => {
        let x = i % n, y = (i / n) | 0
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([X, Y]) => X >= 0 && X < n && Y >= 0 && Y < n).map(([X, Y]) => Y * n + X)
    }
    const walk = i => {
        path.push(i); seen.add(i)
        if(i == goal) return true
        for(const j of shuffle(around(i))) if(!seen.has(j) && walk(j)) return true
        path.pop(); seen.delete(i)
        return false
    }
    walk(start)
    return path
}

export default [
{
    id: 'flipgrid', title: 'Flip Grid', emoji: '💡', c1: '#FFD60A', c2: '#FF9F0A', size: [100, 100], pad: true, hint: 'Tap a light to flip it and its neighbours · switch every light off',
    start(env){
        const N = 5
        let on, moves, done, g
        const flip = (b, i) => {
            let x = i % N, y = (i / N) | 0
            ;[[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
                let X = x + dx, Y = y + dy
                if(X >= 0 && X < N && Y >= 0 && Y < N) b[Y * N + X] ^= 1
            })
        }
        // scrambled from the dark board by presses, so every start is solvable and never already solved
        do {
            on = Array(N * N).fill(0)
            for(let s = 0; s < 12; s++) flip(on, env.rnd(N * N))
        } while(!on.some(Boolean))
        moves = 0; done = false
        const draw = () => g.cells.forEach((c, i) => {
            c.style.background = on[i] ? '#FFD60A' : 'rgba(255,255,255,.07)'
            c.style.boxShadow = on[i] ? '0 0 .6em rgba(255,214,10,.6)' : ''
        })
        const tap = i => {
            if(done) return
            flip(on, i); moves++; env.sfx('tap'); draw()
            if(on.every(v => !v)){
                done = true
                env.score(Math.max(100, 1000 - moves * 20))
                env.over('Lights out!', true)
            }
        }
        g = env.grid(N, N, c => { c.style.borderRadius = '.2em' }, tap, {css: 'inset:0;gap:.25em;padding:.6em'})
        draw()
    }
},
{
    id: 'dialescape', title: 'Dial Escape', emoji: '🔐', c1: '#8E8E93', c2: '#3A3A3C', size: [100, 100], pad: true, hint: 'Set the four dials · ● right digit, right place · ○ right digit, wrong place · 8 tries',
    start(env){
        const TRIES = 8, DIALS = 4
        const secret = Array.from({length: DIALS}, () => env.rnd(10))
        let guess = [0, 0, 0, 0], rows = [], g
        const hist = document.createElement('div')
        hist.style.cssText = 'position:absolute;left:12%;right:12%;top:40%;bottom:6%;overflow:auto;font-size:1.1em;line-height:1.7;color:#fff'
        env.el.appendChild(hist)
        const draw = () => {
            g.cells.forEach((c, i) => {
                c.style.fontSize = '1.8em'; c.style.fontWeight = 700
                c.style.color = i < DIALS ? '#fff' : '#0c0c0f'
                c.style.background = i < DIALS ? 'rgba(255,255,255,.1)' : '#C8F542'
                c.textContent = i < DIALS ? guess[i] : '✓'
            })
            hist.innerHTML = rows.map(r => `<div>${r.guess.join(' ')} &nbsp; <span style="color:#64D2FF">${'●'.repeat(r.exact)}</span><span style="opacity:.6">${'○'.repeat(r.near)}</span></div>`).join('')
        }
        const turn = (i, d) => { if(i < DIALS){ guess[i] = (guess[i] + d + 10) % 10; env.sfx('tap'); draw() } }
        const submit = () => {
            const f = feedback(secret, guess)
            rows.push({guess: guess.slice(), exact: f.exact, near: f.near})
            if(f.exact == DIALS){ env.score((TRIES - rows.length + 1) * 100); return env.over('Door open!', true) }
            if(rows.length >= TRIES) return env.over('Locked', false)
            env.sfx('good'); draw()
        }
        g = env.grid(DIALS + 1, 1, () => {}, i => i < DIALS ? turn(i, 1) : submit(), {css: 'inset:auto;left:0;right:0;top:14%;height:22%;gap:.5em;padding:.5em'})
        env.on('press', k => {
            let i = g.at()
            if(i < DIALS && k == 'up') turn(i, 1)
            if(i < DIALS && k == 'down') turn(i, -1)
        })
        env.on('key', e => { if(/^[0-9]$/.test(e.key) && g.at() < DIALS){ guess[g.at()] = +e.key; draw() } })
        draw()
    }
},
{
    id: 'skyhop', title: 'Sky Hop', emoji: '⭐', c1: '#5EE6E0', c2: '#1F6FB8', size: [100, 100], pad: true, hint: 'Hop to a neighbouring stone · stones crumble behind you · reach the star',
    start(env){
        let n = 5, level = 1, pos, stone, goal, g, gen = 0
        const around = i => {
            let x = i % n, y = (i / n) | 0
            return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([X, Y]) => X >= 0 && X < n && Y >= 0 && Y < n).map(([X, Y]) => Y * n + X)
        }
        const draw = () => g.cells.forEach((c, i) => {
            let legal = stone[i] && around(pos).includes(i)
            c.style.background = i == pos ? '#5EE6E0' : stone[i] ? (legal ? 'rgba(94,230,224,.45)' : 'rgba(255,255,255,.22)') : 'rgba(255,255,255,.04)'
            c.style.color = i == pos ? '#0c0c0f' : '#FFD60A'
            c.style.fontSize = '1.6em'
            c.textContent = i == pos ? '●' : i == goal ? '★' : ''
        })
        const stuck = () => !around(pos).some(i => stone[i])
        const hop = i => {
            if(!stone[i] || !around(pos).includes(i)) return
            stone[pos] = false
            pos = i; env.sfx('tap')
            if(pos == goal){
                level++; env.score((level - 1) * 100)
                if(level > 5){ env.score(500); return env.over('Sky cleared!', true) }
                n++
                env.after(build, 300)
                return
            }
            if(stuck()){ env.score((level - 1) * 100); return env.over('No stone left', false) }
            draw()
        }
        // a new sky: a route from the start to the star, plus loose stones that lead nowhere
        function build(){
            const my = ++gen
            const path = route(n, env.shuffle)
            stone = Array(n * n).fill(false)
            path.forEach(i => stone[i] = true)
            for(let i = 0; i < n * n; i++) if(!stone[i] && env.rnd(100) < 30) stone[i] = true
            pos = (n - 1) * n; goal = n - 1
            if(g) g.el.remove()
            // cells of an older sky are ignored, so the new grid never gets an old press
            g = env.grid(n, n, () => {}, i => { if(my == gen) hop(i) }, {css: 'inset:0;gap:.25em;padding:.8em', off: () => my != gen})
            draw()
        }
        build()
    }
}
]

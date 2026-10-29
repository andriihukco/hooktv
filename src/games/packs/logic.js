// Logic puzzles: sudoku, nonogram, mastermind, battleship, candy match.
const SQ = [100, 100]

export default [
{
    id: 'sudoku', levels: true, title: 'Sudoku', emoji: '9️⃣', c1: '#0A84FF', c2: '#5E5CE6', size: [100, 112], pad: true, hint: 'Arrows move · OK or a number key fills · every row, column and box needs 1–9',
    start(env){
        let sol, puz, b, fixed, level
        const base = (r, c) => (r * 3 + ((r / 3) | 0) + c) % 9
        function make(holes){
            let rows = env.shuffle([0, 1, 2]).flatMap(g => env.shuffle([0, 1, 2]).map(r => g * 3 + r)), cols = env.shuffle([0, 1, 2]).flatMap(g => env.shuffle([0, 1, 2]).map(c => g * 3 + c)), nums = env.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
            sol = rows.flatMap(r => cols.map(c => nums[base(r, c)]))
            b = sol.slice(); env.shuffle([...Array(81).keys()]).slice(0, holes).forEach(i => b[i] = 0)
            fixed = b.map(v => v != 0)
        }
        const bad = i => { let v = b[i]; if(!v) return false; let r = (i / 9) | 0, c = i % 9; for(let k = 0; k < 81; k++){ if(k == i || b[k] != v) continue; let r2 = (k / 9) | 0, c2 = k % 9; if(r2 == r || c2 == c || ((r / 3) | 0) == ((r2 / 3) | 0) && ((c / 3) | 0) == ((c2 / 3) | 0)) return true } return false }
        let g
        function begin(holes){
            make(holes)
            g = env.grid(9, 9, (c, i) => { c.style.fontSize = '1.7em'; c.style.borderRadius = '.15em'; c.style.fontWeight = 700; c.style.borderRight = i % 9 % 3 == 2 && i % 9 < 8 ? '.2em solid rgba(255,255,255,.4)' : ''; c.style.borderBottom = ((i / 9) | 0) % 3 == 2 && i < 72 ? '.2em solid rgba(255,255,255,.4)' : '' }, pick, {css: 'inset:0 0 11% 0;gap:.12em;padding:.4em'})
            let pad = env.buttons(['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫'], i => set(i == 9 ? 0 : i + 1), {nokeys: true}); pad.el.style.cssText += ';padding:.3em;gap:.3em'; pad.bs.forEach(x => { x.style.padding = '.35em .7em'; x.style.fontSize = '1em' })
            draw()
        }
        function draw(){
            g.cells.forEach((c, i) => { let v = b[i]; c.textContent = v || ''; c.style.color = fixed[i] ? '#fff' : bad(i) ? '#FF453A' : '#64D2FF'; c.style.background = fixed[i] ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)' })
            let at = g.at(), fv = b[at]; if(fv) g.cells.forEach((c, i) => { if(b[i] == fv && i != at) c.style.background = 'rgba(100,210,255,.2)' })
        }
        function set(v){
            if(!g) return
            let i = g.at(); if(fixed[i]) return
            b[i] = v; env.sfx('tap'); draw()
            if(b.every(Boolean) && b.every((x, k) => !bad(k))){ env.score(level * 500, 1); env.over('Solved!', true) }
        }
        function pick(i){ if(!fixed[i]) set((b[i] + 1) % 10); else draw() }
        env.on('key', e => { if(/^[0-9]$/.test(e.key)) set(+e.key); else if(e.keyCode == 8) set(0) })
        env.on('press', () => env.after(draw, 0))
        level = env.level + 1
        begin([36, 46, 54][env.level])
    }
},
{
    id: 'battleship', title: 'Battleship', emoji: '🚢', c1: '#0A84FF', c2: '#1C3A5E', size: [100, 62], pad: true, hint: 'Fire at the right-hand sea · sink the whole fleet first',
    start(env){
        const N = 10, FLEET = [5, 4, 3, 3, 2]
        const place = () => { let b = Array(100).fill(0), ships = []; FLEET.forEach((len, id) => { for(;;){ let h = Math.random() < .5, x = env.rnd(h ? N - len + 1 : N), y = env.rnd(h ? N : N - len + 1), cells = Array.from({length: len}, (_, k) => h ? y * N + x + k : (y + k) * N + x); if(cells.every(c => !b[c])){ cells.forEach(c => b[c] = id + 1); ships.push(cells); break } } }); return {b, ships} }
        let mine = place(), foe = place(), shotsMe = Array(100).fill(0), shotsFoe = Array(100).fill(0), busy = false, targets = []
        let lab = document.createElement('div'); lab.style.cssText = 'position:absolute;top:0;left:0;right:0;height:7%;display:flex;font-size:1.1em;opacity:.6;align-items:center'; lab.innerHTML = '<div style="flex:1;text-align:center">Your fleet</div><div style="flex:1;text-align:center">Enemy waters</div>'; env.el.appendChild(lab)
        let gm = env.grid(N, N, c => { c.style.borderRadius = '.15em' }, null, {static: true, css: 'inset:auto;left:1.5%;top:9%;width:46%;aspect-ratio:1;gap:.12em;padding:.15em'})
        let gf = env.grid(N, N, c => { c.style.borderRadius = '.15em' }, fire, {css: 'inset:auto;right:1.5%;top:9%;width:46%;aspect-ratio:1;gap:.12em;padding:.15em', start: 44})
        const paint = (g, own, shots, who) => g.cells.forEach((c, i) => {
            let ship = who.b[i], s = shots[i]
            c.style.background = s == 1 ? (ship ? '#FF453A' : '#2a4a72') : own && ship ? '#6c7a92' : '#143354'
            c.textContent = s ? (ship ? '' : '•') : ''
            c.style.color = '#9bc'; c.style.fontSize = '1.3em'
            if(s == 1 && ship && who.ships[ship - 1].every(k => shots[k])) who.ships[ship - 1].forEach(k => g.cells[k].style.background = '#8b1a14')
        })
        const draw = () => { paint(gm, true, shotsFoe, mine); paint(gf, false, shotsMe, foe) }
        const sunk = (who, shots) => who.ships.every(s => s.every(k => shots[k]))
        function fire(i){
            if(busy || shotsMe[i]) return
            shotsMe[i] = 1; let hit = foe.b[i]; env.sfx(hit ? 'pop' : 'tap'); if(hit) env.score(20, 1); draw()
            if(sunk(foe, shotsMe)){ env.score(300, 1); return env.over('Enemy fleet sunk!', true) }
            busy = true; env.after(reply, 550)
        }
        function reply(){
            let i
            targets = targets.filter(t => !shotsFoe[t])
            if(targets.length) i = targets.pop()
            else { let free = [...Array(100).keys()].filter(k => !shotsFoe[k] && ((k % 10) + (k / 10 | 0)) % 2 == 0); if(!free.length) free = [...Array(100).keys()].filter(k => !shotsFoe[k]); i = env.pick(free) }
            shotsFoe[i] = 1
            if(mine.b[i]){ let x = i % 10, y = i / 10 | 0; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { let X = x + dx, Y = y + dy; if(X >= 0 && X < 10 && Y >= 0 && Y < 10 && !shotsFoe[Y * 10 + X]) targets.push(Y * 10 + X) }); env.sfx('bad') }
            draw(); busy = false
            if(sunk(mine, shotsFoe)) env.over('Your fleet was sunk')
        }
        draw()
    }
},
{
    id: 'candy', title: 'Candy Crush', emoji: '🍬', c1: '#FF375F', c2: '#BF5AF2', size: SQ, swipe: false, pad: true, hint: 'Select a candy, then a neighbour to swap · match three or more · 25 moves',
    start(env){
        const N = 8, K = ['🍓', '🍋', '🍇', '🍏', '🍊', '🫐'], BG = ['#FF375F', '#FFD60A', '#BF5AF2', '#30D158', '#FF9F0A', '#0A84FF']
        let b = Array.from({length: N * N}, () => env.rnd(6)), sel = -1, busy = false, moves = 25
        let top = document.createElement('div'); top.style.cssText = 'position:absolute;left:0;right:0;top:0;height:6%;text-align:center;font-size:1.2em;line-height:2;opacity:.85'; env.el.appendChild(top)
        let g = env.grid(N, N, c => { c.style.fontSize = '2.2em'; c.style.transition = 'transform .15s, opacity .15s' }, pick, {css: 'inset:6% 0 0 0;gap:.2em;padding:.4em', start: 27})
        const find = () => { let m = new Set(); for(let r = 0; r < N; r++) for(let c = 0; c < N; c++){ let v = b[r * N + c]; if(v < 0) continue; let k = 1; while(c + k < N && b[r * N + c + k] == v) k++; if(k >= 3) for(let j = 0; j < k; j++) m.add(r * N + c + j); k = 1; while(r + k < N && b[(r + k) * N + c] == v) k++; if(k >= 3) for(let j = 0; j < k; j++) m.add((r + j) * N + c) } return m }
        const draw = () => { g.cells.forEach((c, i) => { c.textContent = b[i] >= 0 ? K[b[i]] : ''; c.style.background = b[i] >= 0 ? BG[b[i]] + '33' : 'transparent'; c.style.transform = i == sel ? 'scale(1.12)' : ''; c.style.opacity = 1 }); top.textContent = `Moves left: ${moves}` }
        async function settle(){
            busy = true
            let chain = 0
            for(;;){
                let m = find(); if(!m.size) break
                chain++; env.score(m.size * 10 * chain, 1); env.sfx('pop')
                m.forEach(i => { g.cells[i].style.transform = 'scale(.2)'; g.cells[i].style.opacity = 0 })
                await new Promise(r => env.after(r, 220)); if(!g.cells[0].isConnected) return
                m.forEach(i => b[i] = -1)
                for(let c = 0; c < N; c++){ let col = []; for(let r = N - 1; r >= 0; r--) if(b[r * N + c] >= 0) col.push(b[r * N + c]); for(let r = N - 1; r >= 0; r--) b[r * N + c] = col.length ? col.shift() : env.rnd(6) }
                draw(); await new Promise(r => env.after(r, 180)); if(!g.cells[0].isConnected) return
            }
            busy = false; draw()
            if(!moves) env.over(`${env.points} points`, env.points > 1500)
            else if(!hasMove()){ b = Array.from({length: N * N}, () => env.rnd(6)); settle() }
        }
        const hasMove = () => { for(let i = 0; i < N * N; i++) for(const j of [i + 1, i + N]){ if(j >= N * N || (j == i + 1 && i % N == N - 1)) continue; [b[i], b[j]] = [b[j], b[i]]; let ok = find().size; [b[i], b[j]] = [b[j], b[i]]; if(ok) return true } return false }
        function pick(i){
            if(busy) return
            if(sel < 0){ sel = i; return draw() }
            let near = Math.abs(sel - i) == N || (Math.abs(sel - i) == 1 && (sel / N | 0) == (i / N | 0))
            if(!near){ sel = i; return draw() }
            ;[b[sel], b[i]] = [b[i], b[sel]]
            if(!find().size){ [b[sel], b[i]] = [b[i], b[sel]]; sel = -1; env.sfx('bad'); return draw() }
            sel = -1; moves--; draw(); settle()
        }
        // start without ready-made matches
        let guard = 0; while(find().size && guard++ < 50) find().forEach(i => b[i] = env.rnd(6))
        draw()
    }
},
]

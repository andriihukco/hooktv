// Slide / match / logic puzzles on DOM grids.
const SQ = [100, 100]

const tint = v => `hsl(${Math.max(8, 168 - Math.log2(v) * 14)} 70% ${Math.min(62, 34 + Math.log2(v) * 2.4)}%)`

export default [
{
    id: '2048', title: '2048', emoji: '🔢', c1: '#FF9F0A', c2: '#FF375F', size: SQ, swipe: true, pad: true, hint: 'Swipe or use arrows to merge equal tiles',
    start(env){
        let g = env.grid(4, 4, null, null, {static: true, css: 'gap:.5em;padding:.6em'}), b = Array(16).fill(0)
        const add = () => { let e = b.map((v, i) => v ? -1 : i).filter(i => i >= 0); if(e.length) b[env.pick(e)] = Math.random() < .9 ? 2 : 4 }
        const draw = () => g.cells.forEach((c, i) => {
            let v = b[i]
            c.textContent = v || ''
            c.style.background = v ? tint(v) : ''
            c.style.color = v ? '#0b0f00' : ''
            c.style.fontSize = v > 999 ? '1.5em' : v > 99 ? '1.9em' : '2.4em'
            c.style.fontWeight = 800
        })
        const lines = d => [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => d == 'left' ? i * 4 + j : d == 'right' ? i * 4 + 3 - j : d == 'up' ? j * 4 + i : (3 - j) * 4 + i))
        // slides the board one way; returns the points merged, or -1 when nothing moves. commit=false only probes.
        const move = (d, commit) => {
            let moved = false, pts = 0, nb = b.slice()
            lines(d).forEach(idx => {
                let v = idx.map(i => b[i]).filter(Boolean), out = []
                for(let i = 0; i < v.length; i++){
                    if(v[i] == v[i + 1]){ out.push(v[i] * 2); pts += v[i] * 2; i++ }
                    else out.push(v[i])
                }
                while(out.length < 4) out.push(0)
                idx.forEach((i, j) => { if(nb[i] != out[j]) moved = true; nb[i] = out[j] })
            })
            if(!moved) return -1
            if(commit){ b = nb; env.score(pts, 1) }
            return pts
        }
        const stuck = () => !['left', 'right', 'up', 'down'].some(d => move(d) >= 0)
        add(); add(); draw()
        env.on('press', k => {
            if(k != 'ok' && move(k, true) >= 0){ env.sfx('tap'); add(); draw(); if(stuck()) env.over('No moves left') }
        })
    }
},
{
    id: 'tictactoe', title: 'Tic-Tac-Toe', emoji: '⭕', c1: '#0A84FF', c2: '#64D2FF', size: SQ, pad: true, hint: 'Beat the computer · each win is a point',
    start(env){
        let b = Array(9).fill(''), turn = 'X', ai = true, busy = false
        let L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
        let win = (b, p) => L.find(l => l.every(i => b[i] == p))
        let mm = (b, p) => { // minimax: score from O's view
            if(win(b, 'O')) return 1; if(win(b, 'X')) return -1; if(b.every(Boolean)) return 0
            let best = p == 'O' ? -2 : 2
            b.forEach((v, i) => { if(v) return; b[i] = p; let s = mm(b, p == 'O' ? 'X' : 'O'); b[i] = ''; best = p == 'O' ? Math.max(best, s) : Math.min(best, s) })
            return best
        }
        let banner = document.createElement('div')
        banner.style.cssText = 'position:absolute;left:0;right:0;top:0;text-align:center;font-size:1.3em;padding:.5em;opacity:.7'
        env.el.appendChild(banner)
        let g = env.grid(3, 3, null, pick, {css: 'top:2.4em;gap:.5em'})
        const draw = w => g.cells.forEach((c, i) => { c.textContent = b[i]; c.style.color = b[i] == 'X' ? '#64D2FF' : '#FF375F'; c.style.fontSize = '4em'; c.style.fontWeight = 800; c.style.background = w && w.includes(i) ? 'rgba(200,245,66,.22)' : '' })
        const status = t => banner.textContent = t
        function end(){
            let w = win(b, 'X') || win(b, 'O'), full = b.every(Boolean)
            if(!w && !full) return false
            draw(w); busy = true
            let who = w ? b[w[0]] : ''
            if(who == 'X' && ai){ env.score(1, 1); env.sfx('win'); status('You win!') } else if(who && ai){ env.sfx('bad'); status('Computer wins') } else status(who ? who + ' wins' : 'Draw')
            env.after(() => { b.fill(''); turn = 'X'; busy = false; draw(); status(ai ? 'Your move' : 'X to move') }, 1400)
            return true
        }
        function pick(i){
            if(busy || b[i]) return
            b[i] = turn; env.sfx('tap'); draw()
            if(end()) return
            turn = turn == 'X' ? 'O' : 'X'
            if(ai){
                busy = true; status('Thinking…')
                env.after(() => {
                    let best = -2, mv = []
                    b.forEach((v, j) => { if(v) return; b[j] = 'O'; let s = mm(b, 'X'); b[j] = ''; if(s > best){ best = s; mv = [j] } else if(s == best) mv.push(j) })
                    b[env.pick(mv)] = 'O'; turn = 'X'; busy = false; draw(); if(!end()) status('Your move')
                }, 450)
            } else status(turn + ' to move')
        }
        draw(); status('Your move')
        let mode = env.buttons(['vs Computer', '2 Players'], i => { ai = i == 0; mode.close(); status(ai ? 'Your move' : 'X to move') }, {modal: true})
    }
},
{
    id: 'connect4', title: 'Connect Four', emoji: '🔴', c1: '#FFD60A', c2: '#FF453A', size: [100, 86], pad: true, hint: 'Left / right to aim, OK to drop',
    start(env){
        const W = 7, H = 6
        let b = Array(W * H).fill(0), col = 3, busy = false
        let g = env.grid(W, H, null, null, {static: true, css: 'top:12%;gap:.35em;padding:.5em;background:#0a3a8a;border-radius:1em;bottom:0'})
        g.cells.forEach(c => { c.style.borderRadius = '50%'; c.style.background = '#06204f'; c.style.cursor = 'pointer' })
        let chip = document.createElement('div')
        chip.style.cssText = 'position:absolute;top:1.2%;width:9%;aspect-ratio:1;border-radius:50%;background:#FFD60A;transition:left .08s;box-shadow:0 0 1em rgba(255,214,10,.6)'
        env.el.appendChild(chip)
        const show = () => chip.style.left = (3 + col * 13.4) + '%'
        const colorOf = v => v == 1 ? '#FFD60A' : v == 2 ? '#FF453A' : '#06204f'
        const draw = () => g.cells.forEach((c, i) => c.style.background = colorOf(b[i]))
        const four = (b, p) => { for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) for(const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]){ let ok = 1; for(let k = 0; k < 4; k++){ let X = x + dx * k, Y = y + dy * k; if(X < 0 || X >= W || Y < 0 || Y >= H || b[Y * W + X] != p){ ok = 0; break } } if(ok) return true } return false }
        const drop = (b, c, p) => { for(let y = H - 1; y >= 0; y--) if(!b[y * W + c]){ b[y * W + c] = p; return y } return -1 }
        const score = (b, p) => { let s = 0; for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) for(const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]){ let m = 0, o = 0; for(let k = 0; k < 4; k++){ let X = x + dx * k, Y = y + dy * k; if(X < 0 || X >= W || Y < 0 || Y >= H){ m = o = 9; break } let v = b[Y * W + X]; v == p ? m++ : v ? o++ : 0 } if(m < 5 && !o) s += m * m; if(m < 5 && !m) s -= o * o } return s }
        const search = (b, d, a, be, max) => {
            if(four(b, 2)) return 1000 + d; if(four(b, 1)) return -1000 - d; if(!d || b.every(Boolean)) return score(b, 2) - score(b, 1) * 1.1
            let best = max ? -1e9 : 1e9
            for(const c of [3, 2, 4, 1, 5, 0, 6]){ if(b[c]) continue; let y = drop(b, c, max ? 2 : 1); let s = search(b, d - 1, a, be, !max); b[y * W + c] = 0; if(max){ best = Math.max(best, s); a = Math.max(a, s) } else { best = Math.min(best, s); be = Math.min(be, s) } if(a >= be) break }
            return best
        }
        function play(c){
            if(busy || b[c]) return
            let y = drop(b, c, 1); env.sfx('tap'); draw()
            if(four(b, 1)){ env.score(1, 1); env.over('You win!', true); return }
            if(b.every(Boolean)) return env.over('Draw')
            busy = true
            env.after(() => {
                let best = -1e9, mv = 3
                for(const c2 of [3, 2, 4, 1, 5, 0, 6]){ if(b[c2]) continue; let y2 = drop(b, c2, 2), s = search(b, 4, -1e9, 1e9, false); b[y2 * W + c2] = 0; if(s > best){ best = s; mv = c2 } }
                drop(b, mv, 2); env.sfx('tap'); draw(); busy = false
                if(four(b, 2)) env.over('Computer wins')
                else if(b.every(Boolean)) env.over('Draw')
            }, 350)
        }
        g.cells.forEach((c, i) => c.onclick = () => { col = i % W; show(); play(col) })
        env.on('press', k => { if(k == 'left') col = (col + W - 1) % W; if(k == 'right') col = (col + 1) % W; if(k == 'ok') play(col); show() })
        show(); draw()
    }
},
{
    id: 'memory', title: 'Memory Match', emoji: '🃏', c1: '#BF5AF2', c2: '#FF375F', size: SQ, pad: true, hint: 'Find all the pairs with the fewest moves',
    start(env){
        let faces = env.shuffle([...'🍎🍋🍇🍓🥝🍉🍒🥑'].flatMap(x => [x, x])), open = [], moves = 0, left = 8, lock = false
        let g = env.grid(4, 4, (c, i) => { c.style.fontSize = '3em'; c.style.background = 'linear-gradient(145deg,#2a2a31,#1b1b20)' }, pick, {css: 'gap:.5em;padding:.6em'})
        function pick(i){
            if(lock || open.includes(i) || g.cells[i].dataset.done) return
            g.cells[i].textContent = faces[i]; g.cells[i].style.background = '#34343c'; open.push(i); env.sfx('tap')
            if(open.length < 2) return
            moves++; lock = true
            let [a, b] = open; open = []
            if(faces[a] == faces[b]){
                env.sfx('good'); env.score(Math.max(10, 100 - moves * 5) , 1)
                ;[a, b].forEach(j => { g.cells[j].dataset.done = 1; g.cells[j].style.background = 'rgba(200,245,66,.22)' })
                lock = false
                if(!--left) env.after(() => env.over(`Cleared in ${moves} moves`, true), 500)
            } else env.after(() => { [a, b].forEach(j => { g.cells[j].textContent = ''; g.cells[j].style.background = 'linear-gradient(145deg,#2a2a31,#1b1b20)' }); lock = false }, 700)
        }
    }
},
{
    id: 'minesweeper', title: 'Minesweeper', emoji: '💣', c1: '#8E8E93', c2: '#3A3A3C', size: SQ, hint: 'OK digs · F / long-press / colour button toggles flag mode',
    start(env){
        const N = 9, M = 10
        let mines = null, shown = Array(N * N).fill(0), flag = Array(N * N).fill(0), flagMode = false, dead = false, t0
        const nb = i => { let x = i % N, y = (i / N) | 0, o = []; for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){ let X = x + dx, Y = y + dy; if((dx || dy) && X >= 0 && X < N && Y >= 0 && Y < N) o.push(Y * N + X) } return o }
        const cnt = i => nb(i).filter(j => mines[j]).length
        const COL = ['', '#64D2FF', '#30D158', '#FF453A', '#BF5AF2', '#FF9F0A', '#5AC8FA', '#fff', '#8E8E93']
        let chip = document.createElement('div')
        chip.style.cssText = 'position:absolute;left:0;right:0;top:0;height:2.4em;display:flex;justify-content:center;align-items:center;gap:1em;font-size:1.2em'
        env.el.appendChild(chip)
        const head = () => chip.innerHTML = `<span style="opacity:.6">🚩 ${M - flag.filter(Boolean).length}</span><span class="games__btn ${flagMode ? 'focus' : ''}" style="padding:.2em .9em;font-size:.9em">${flagMode ? '🚩 Flag' : '⛏ Dig'}</span>`
        chip.onclick = () => { flagMode = !flagMode; head() }
        let g = env.grid(N, N, c => { c.style.fontSize = '1.7em'; c.style.fontWeight = 800; c.style.background = '#2a2a31' }, pick, {css: 'top:2.4em;gap:.25em;padding:.4em'})
        const draw = () => g.cells.forEach((c, i) => {
            if(shown[i]){ let n = mines[i] ? -1 : cnt(i); c.textContent = mines[i] ? '💣' : n || ''; c.style.color = COL[n] || ''; c.style.background = mines[i] ? '#FF453A' : 'rgba(255,255,255,.04)' }
            else { c.textContent = flag[i] ? '🚩' : ''; c.style.background = '#2a2a31' }
        })
        function reveal(i){
            let q = [i]
            while(q.length){ let j = q.pop(); if(shown[j] || flag[j]) continue; shown[j] = 1; if(!cnt(j) && !mines[j]) q.push(...nb(j)) }
        }
        function pick(i){
            if(dead) return
            if(flagMode){ if(!shown[i]){ flag[i] ^= 1; env.sfx('pop') } head(); draw(); return }
            if(flag[i]) return
            if(!mines){ mines = Array(N * N).fill(0); let ban = [i, ...nb(i)]; env.shuffle([...Array(N * N).keys()].filter(j => !ban.includes(j))).slice(0, M).forEach(j => mines[j] = 1); t0 = Date.now() }
            if(shown[i]){ // chord
                if(cnt(i) == nb(i).filter(j => flag[j]).length) nb(i).forEach(j => { if(!flag[j] && !shown[j]) pick2(j) })
            } else pick2(i)
            draw()
            if(!dead && shown.filter(Boolean).length == N * N - M){ env.score(Math.max(1, 999 - ((Date.now() - t0) / 1000 | 0))); env.over('Field cleared!', true) }
        }
        function pick2(j){ reveal(j); if(mines[j]){ dead = true; mines.forEach((m, k) => m && (shown[k] = 1)); draw(); env.after(() => env.over('Boom!'), 500) } else env.sfx('tap') }
        env.on('key', e => { if([70, 406, 16].includes(e.keyCode)){ flagMode = !flagMode; head() } })
        let hold
        g.cells.forEach((c, i) => { c.onpointerdown = () => { hold = setTimeout(() => { hold = 0; g.focus(i); if(!shown[i] && !dead){ flag[i] ^= 1; env.sfx('pop'); head(); draw() } }, 450) }; c.onpointerup = c.onpointerleave = () => clearTimeout(hold); c.onclick = () => { if(hold === 0){ hold = null; return } g.focus(i); pick(i) } })
        head()
    }
},
{
    id: 'lightsout', title: 'Lights Out', emoji: '💡', c1: '#FFD60A', c2: '#FF9F0A', size: SQ, hint: 'Toggle a light and its neighbours · turn them all off',
    start(env){
        const N = 5; let on = Array(N * N).fill(0), moves = 0, level = 1
        const flip = i => { let x = i % N, y = (i / N) | 0; [[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => { let X = x + dx, Y = y + dy; if(X >= 0 && X < N && Y >= 0 && Y < N) on[Y * N + X] ^= 1 }) }
        const deal = () => { on.fill(0); for(let k = 0; k < 4 + level * 2; k++) flip(env.rnd(N * N)); if(!on.some(Boolean)) flip(12); moves = 0; draw() }
        let g = env.grid(N, N, c => { c.style.borderRadius = '30%' }, pick, {css: 'gap:.5em;padding:.7em'})
        const draw = () => g.cells.forEach((c, i) => { c.style.background = on[i] ? 'radial-gradient(circle at 50% 40%,#FFE680,#FF9F0A)' : '#1d1d22'; c.style.boxShadow = on[i] ? '0 0 1.2em rgba(255,214,10,.55)' : '' })
        function pick(i){
            flip(i); moves++; env.sfx('tap'); draw()
            if(!on.some(Boolean)){ env.score(Math.max(10, 100 - moves * 3), 1); env.sfx('win'); level++; env.after(deal, 600) }
        }
        deal()
    }
},
{
    id: 'sliding', title: 'Sliding Puzzle', emoji: '🧩', c1: '#30D158', c2: '#0A84FF', size: SQ, pad: true, swipe: true, hint: 'Arrows slide tiles into the gap · pick 3×3, 4×4 or 5×5',
    start(env){
        let n = 3, b, g, moves
        const solved = () => b.every((v, i) => v == (i + 1) % (n * n))
        function setup(size){
            n = size; if(g) g.el.remove()
            do { b = [...Array(n * n).keys()]; let e = n * n - 1; for(let k = 0; k < 80 * n; k++){ let x = e % n, y = (e / n) | 0, o = []; if(x > 0) o.push(e - 1); if(x < n - 1) o.push(e + 1); if(y > 0) o.push(e - n); if(y < n - 1) o.push(e + n); let t = env.pick(o); [b[e], b[t]] = [b[t], b[e]]; e = t } } while(solved())
            // b[i] holds the tile number at cell i; 0 is the gap
            b = b.map(v => v); moves = 0
            g = env.grid(n, n, c => { c.style.fontSize = (n == 3 ? 3 : n == 4 ? 2.4 : 1.9) + 'em'; c.style.fontWeight = 800 }, tap, {static: true, css: 'top:3em;gap:.4em;padding:.5em'})
            g.cells.forEach((c, i) => c.onclick = () => tap(i))
            draw()
        }
        const draw = () => g.cells.forEach((c, i) => { let v = b[i]; c.textContent = v || ''; c.style.background = v ? `hsl(${210 + v * (140 / (n * n))} 65% 48%)` : 'transparent'; c.style.visibility = v ? '' : 'hidden' })
        function tap(i){ let e = b.indexOf(0), x = i % n, y = (i / n) | 0, ex = e % n, ey = (e / n) | 0; if(x == ex && Math.abs(y - ey) == 1 || y == ey && Math.abs(x - ex) == 1) step(i) }
        function step(i){
            let e = b.indexOf(0); [b[e], b[i]] = [b[i], b[e]]; moves++; env.sfx('tap'); draw()
            if(solved()){ env.score(Math.max(10, n * 120 - moves), 1); env.over(`Solved in ${moves} moves`, true) }
        }
        env.on('press', k => { // the gap moves opposite to the pressed direction: pressing left slides the tile on the right into the gap
            let e = b.indexOf(0), x = e % n, y = (e / n) | 0
            if(k == 'left' && x < n - 1) step(e + 1); if(k == 'right' && x > 0) step(e - 1); if(k == 'up' && y < n - 1) step(e + n); if(k == 'down' && y > 0) step(e - n)
        })
        let bar = env.buttons(['3 × 3', '4 × 4', '5 × 5'], i => setup(i + 3), {nokeys: true})
        bar.el.style.cssText = 'top:0;bottom:auto'
        bar.el.style.transform = 'scale(.8)'
        setup(3)
    }
},
]

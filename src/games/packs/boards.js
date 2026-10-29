// Classic board games against the computer: chess, checkers, reversi.
const SQ = [100, 100]
const light = '#d9dde3', dark = '#5f7aa8'

const sq = (c, i, v) => { c.style.background = ((i >> 3) + (i & 7)) % 2 ? dark : light }

// ---------- chess ----------
const P0 = 'rnbqkbnrpppppppp' + ' '.repeat(32) + 'PPPPPPPPRNBQKBNR'
const GLYPH = {k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'}
const VAL = {p: 100, n: 320, b: 330, r: 500, q: 900, k: 0}
const white = ch => ch != ' ' && ch == ch.toUpperCase()
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], DG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ST = [[-1, 0], [1, 0], [0, -1], [0, 1]]

function attacks(b, i){
    let ch = b[i], t = ch.toLowerCase(), r = i >> 3, c = i & 7, w = white(ch), out = []
    const slide = (dirs, one) => dirs.forEach(([dr, dc]) => { let R = r + dr, C = c + dc; while(R >= 0 && R < 8 && C >= 0 && C < 8){ out.push(R * 8 + C); if(b[R * 8 + C] != ' ' || one) break; R += dr; C += dc } })
    if(t == 'p'){ let dr = w ? -1 : 1; [-1, 1].forEach(dc => { let R = r + dr, C = c + dc; if(R >= 0 && R < 8 && C >= 0 && C < 8) out.push(R * 8 + C) }) }
    else if(t == 'n') KN.forEach(([dr, dc]) => { let R = r + dr, C = c + dc; if(R >= 0 && R < 8 && C >= 0 && C < 8) out.push(R * 8 + C) })
    else if(t == 'b') slide(DG); else if(t == 'r') slide(ST); else if(t == 'q') slide(DG.concat(ST)); else if(t == 'k') slide(DG.concat(ST), true)
    return out
}
const attacked = (b, sq, byWhite) => b.some((ch, i) => ch != ' ' && white(ch) == byWhite && attacks(b, i).includes(sq))

function gen(s){
    let b = s.b, w = s.turn == 'w', ms = []
    b.forEach((ch, i) => {
        if(ch == ' ' || white(ch) != w) return
        let t = ch.toLowerCase(), r = i >> 3, c = i & 7
        if(t == 'p'){
            let dr = w ? -1 : 1, start = w ? 6 : 1, promo = w ? 0 : 7, one = i + dr * 8
            if(b[one] == ' '){ ms.push({from: i, to: one, promo: (one >> 3) == promo}); if(r == start && b[one + dr * 8] == ' ') ms.push({from: i, to: one + dr * 8}) }
            ;[-1, 1].forEach(dc => { let C = c + dc; if(C < 0 || C > 7) return; let to = one + dc, tc = b[to]; if(tc != ' ' && white(tc) != w) ms.push({from: i, to, promo: (to >> 3) == promo}); else if(to == s.ep) ms.push({from: i, to, ep: true}) })
        } else attacks(b, i).forEach(to => { if(b[to] == ' ' || white(b[to]) != w) ms.push({from: i, to}) })
        if(t == 'k'){
            let base = w ? 56 : 0, K = w ? 'K' : 'k', Q = w ? 'Q' : 'q'
            if(i == base + 4 && !attacked(b, i, !w)){
                if(s.c.includes(K) && b[base + 5] == ' ' && b[base + 6] == ' ' && b[base + 7] == (w ? 'R' : 'r') && !attacked(b, base + 5, !w) && !attacked(b, base + 6, !w)) ms.push({from: i, to: base + 6, castle: 'K'})
                if(s.c.includes(Q) && b[base + 3] == ' ' && b[base + 2] == ' ' && b[base + 1] == ' ' && b[base] == (w ? 'R' : 'r') && !attacked(b, base + 3, !w) && !attacked(b, base + 2, !w)) ms.push({from: i, to: base + 2, castle: 'Q'})
            }
        }
    })
    return ms
}
function apply(s, m){
    let b = s.b.slice(), p = b[m.from], w = white(p), c = s.c, ep = -1
    b[m.to] = m.promo ? (w ? 'Q' : 'q') : p; b[m.from] = ' '
    if(m.ep) b[m.to + (w ? 8 : -8)] = ' '
    if(m.castle){ let base = w ? 56 : 0; if(m.castle == 'K'){ b[base + 5] = b[base + 7]; b[base + 7] = ' ' } else { b[base + 3] = b[base]; b[base] = ' ' } }
    if(p.toLowerCase() == 'p' && Math.abs(m.to - m.from) == 16) ep = (m.to + m.from) / 2
    if(p.toLowerCase() == 'k') c = c.replace(w ? /[KQ]/g : /[kq]/g, '')
    ;[[0, 'q'], [7, 'k'], [56, 'Q'], [63, 'K']].forEach(([sq, f]) => { if(m.from == sq || m.to == sq) c = c.replace(f, '') })
    return {b, turn: s.turn == 'w' ? 'b' : 'w', c, ep}
}
const kingAt = (b, w) => b.indexOf(w ? 'K' : 'k')
const legal = s => gen(s).filter(m => { let n = apply(s, m); return !attacked(n.b, kingAt(n.b, s.turn == 'w'), s.turn != 'w') })
const inCheck = s => attacked(s.b, kingAt(s.b, s.turn == 'w'), s.turn != 'w')
function evalSide(s){
    let v = 0
    s.b.forEach((ch, i) => { if(ch == ' ') return; let t = ch.toLowerCase(), r = i >> 3, c = i & 7, x = VAL[t] + (t == 'p' ? (white(ch) ? 6 - r : r - 1) * 6 : 0) + (t == 'n' || t == 'b' || t == 'p' ? (3.5 - Math.abs(c - 3.5)) * 4 + (3.5 - Math.abs(r - 3.5)) * 3 : 0); v += white(ch) ? x : -x })
    return s.turn == 'w' ? v : -v
}
function search(s, d, a, b){
    if(!d) return evalSide(s)
    let ms = gen(s).sort((x, y) => (VAL[(s.b[y.to] || ' ').toLowerCase()] || 0) - (VAL[(s.b[x.to] || ' ').toLowerCase()] || 0))
    let best = -1e9
    for(const m of ms){
        if((s.b[m.to] || ' ').toLowerCase() == 'k') return 1e5 + d
        let v = -search(apply(s, m), d - 1, -b, -a)
        if(v > best) best = v; if(v > a) a = v; if(a >= b) break
    }
    return best == -1e9 ? 0 : best
}

// ---------- checkers ----------
function jumps(b, i, pc, caps = [], path = [i]){
    let res = [], r = i >> 3, c = i & 7, king = pc == pc.toUpperCase(), up = pc.toLowerCase() == 'r'
    for(const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]){
        if(!king && (dr < 0) != up) continue
        let mr = r + dr, mc = c + dc, lr = r + 2 * dr, lc = c + 2 * dc
        if(lr < 0 || lr > 7 || lc < 0 || lc > 7) continue
        let m = mr * 8 + mc, l = lr * 8 + lc, o = b[m]
        if(o != ' ' && o.toLowerCase() != pc.toLowerCase() && b[l] == ' ' && !caps.includes(m)){
            let nb = b.slice(); nb[i] = ' '; nb[l] = pc
            let crown = !king && (lr == 0 || lr == 7)
            let sub = crown ? [] : jumps(nb, l, pc, [...caps, m], [...path, l])
            if(sub.length) res.push(...sub); else res.push({path: [...path, l], caps: [...caps, m]})
        }
    }
    return res
}
function cmoves(b, side){
    let caps = [], steps = []
    b.forEach((pc, i) => {
        if(pc == ' ' || pc.toLowerCase() != side) return
        caps.push(...jumps(b, i, pc))
        let r = i >> 3, c = i & 7, king = pc != pc.toLowerCase(), up = side == 'r'
        for(const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]){ if(!king && (dr < 0) != up) continue; let R = r + dr, C = c + dc; if(R >= 0 && R < 8 && C >= 0 && C < 8 && b[R * 8 + C] == ' ') steps.push({path: [i, R * 8 + C], caps: []}) }
    })
    return caps.length ? caps : steps
}
function capply(b, m){
    let nb = b.slice(), end = m.path[m.path.length - 1], pc = nb[m.path[0]]
    nb[m.path[0]] = ' '; m.caps.forEach(i => nb[i] = ' ')
    if(pc == 'r' && end >> 3 == 0) pc = 'R'; if(pc == 'b' && end >> 3 == 7) pc = 'B'
    nb[end] = pc; return nb
}
function ceval(b){ let v = 0; b.forEach((pc, i) => { if(pc == ' ') return; let r = i >> 3, x = pc == pc.toUpperCase() ? 170 : 100 + (pc == 'b' ? r : 7 - r) * 4; v += pc.toLowerCase() == 'b' ? x : -x }); return v }
function csearch(b, d, a, be, ai){
    let ms = cmoves(b, ai ? 'b' : 'r')
    if(!d || !ms.length) return !ms.length ? (ai ? -1e4 - d : 1e4 + d) : ceval(b)
    let best = ai ? -1e9 : 1e9
    for(const m of ms){ let v = csearch(capply(b, m), d - 1, a, be, !ai); if(ai){ best = Math.max(best, v); a = Math.max(a, v) } else { best = Math.min(best, v); be = Math.min(be, v) } if(a >= be) break }
    return best
}

// ---------- reversi ----------
const D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const WQ = [[100, -20, 10, 5], [-20, -50, -2, -2], [10, -2, -1, -1], [5, -2, -1, -1]]
const wt = i => { let r = i >> 3, c = i & 7; return WQ[r > 3 ? 7 - r : r][c > 3 ? 7 - c : c] }
function flips(b, i, p){
    if(b[i]) return []
    let out = [], r = i >> 3, c = i & 7
    D8.forEach(([dr, dc]) => { let R = r + dr, C = c + dc, line = []; while(R >= 0 && R < 8 && C >= 0 && C < 8 && b[R * 8 + C] == -p){ line.push(R * 8 + C); R += dr; C += dc } if(line.length && R >= 0 && R < 8 && C >= 0 && C < 8 && b[R * 8 + C] == p) out.push(...line) })
    return out
}
const rmoves = (b, p) => b.map((v, i) => flips(b, i, p).length ? i : -1).filter(i => i >= 0)
function rsearch(b, p, d, a, be){ // from the computer's (p = -1) view
    let ms = rmoves(b, p)
    if(!d || (!ms.length && !rmoves(b, -p).length)) return b.reduce((s, v, i) => s - (v ? v * (wt(i)) : 0) , 0) + b.reduce((s, v) => s - v, 0) * 2
    if(!ms.length) return rsearch(b, -p, d - 1, a, be)
    let best = p == -1 ? -1e9 : 1e9
    for(const m of ms){ let nb = b.slice(); flips(nb, m, p).forEach(i => nb[i] = p); nb[m] = p; let v = rsearch(nb, -p, d - 1, a, be); if(p == -1){ best = Math.max(best, v); a = Math.max(a, v) } else { best = Math.min(best, v); be = Math.min(be, v) } if(a >= be) break }
    return best
}

export default [
{
    id: 'chess', levels: true, modes: [{id: 'cpu', label: 'vs Computer'}, {id: 'two', label: '2 Players'}], title: 'Chess', emoji: '♟️', c1: '#8E8E93', c2: '#1C1C1E', size: SQ, pad: true, hint: 'You play white · select a piece, then a square',
    start(env){
        let s = {b: [...P0], turn: 'w', c: 'KQkq', ep: -1}, sel = -1, targets = [], busy = false, last = null, two = env.mode == 'two'
        let bar = document.createElement('div'); bar.style.cssText = 'position:absolute;left:0;right:0;top:0;height:6%;text-align:center;font-size:1.2em;line-height:2;opacity:.8'; env.el.appendChild(bar)
        let g = env.grid(8, 8, (c, i) => { c.style.borderRadius = 0; c.style.fontSize = '3em'; c.style.lineHeight = 1 }, pick, {css: 'inset:6% 0 0 0;gap:0;padding:0'})
        const draw = () => g.cells.forEach((c, i) => {
            let ch = s.b[i]; c.textContent = ch == ' ' ? '' : GLYPH[ch.toLowerCase()]
            c.style.color = white(ch) ? '#fff' : '#111'; c.style.textShadow = white(ch) ? '0 0 2px #000,0 0 2px #000,0 1px 2px #000' : '0 0 2px rgba(255,255,255,.35)'
            sq(c, i); if(last && (i == last.from || i == last.to)) c.style.background = '#c8d96a'
            if(i == sel) c.style.background = '#C8F542'
            if(targets.includes(i)) c.style.boxShadow = 'inset 0 0 0 .22em rgba(200,245,66,.95)'; else c.style.boxShadow = ''
        })
        const cap = m => VAL[(s.b[m.to] == ' ' ? (m.ep ? 'p' : ' ') : s.b[m.to]).toLowerCase()] || 0
        function after(){
            let ms = legal(s), chk = inCheck(s)
            bar.textContent = ms.length ? (chk ? 'Check!' + (two ? (s.turn == 'w' ? ' White' : ' Black') : '') : two ? (s.turn == 'w' ? 'White to move' : 'Black to move') : s.turn == 'w' ? 'Your move' : 'Computer is thinking…') : ''
            draw()
            if(!ms.length){ if(chk){ if(two) return env.over('Checkmate — ' + (s.turn == 'b' ? 'White' : 'Black') + ' wins', true); env.score(500, 1); return env.over(s.turn == 'b' ? 'Checkmate — you win!' : 'Checkmate — computer wins', s.turn == 'b') } return env.over('Stalemate') }
            if(s.b.filter(c => c != ' ' && c.toLowerCase() != 'k').length == 0) return env.over('Draw')
            if(s.turn == 'b' && !two){ busy = true; env.after(think, 60) }
        }
        function think(){
            let best = -1e9, pick2 = []
            legal(s).forEach(m => { let v = -search(apply(s, m), [1, 2, 3][env.level], -1e9, 1e9); if(v > best + 2){ best = v; pick2 = [m] } else if(Math.abs(v - best) <= 2) pick2.push(m) })
            let m = env.pick(pick2); last = m; s = apply(s, m); busy = false; env.sfx('tap'); after()
        }
        function pick(i){
            if(busy || (!two && s.turn != 'w')) return
            let m = legal(s).find(m => m.from == sel && m.to == i)
            if(m){ if(!two) env.score(cap(m), 1); env.sfx(cap(m) ? 'pop' : 'tap'); last = m; s = apply(s, m); sel = -1; targets = []; return after() }
            if(s.b[i] != ' ' && white(s.b[i]) == (s.turn == 'w')){ sel = i; targets = legal(s).filter(m => m.from == i).map(m => m.to) } else { sel = -1; targets = [] }
            draw()
        }
        g.focus(52); after()
    }
},
{
    id: 'checkers', levels: true, modes: [{id: 'cpu', label: 'vs Computer'}, {id: 'two', label: '2 Players'}], title: 'Checkers', emoji: '🔴', c1: '#FF453A', c2: '#7A1F1F', size: SQ, pad: true, hint: 'Captures are mandatory · reach the far row to crown a king',
    start(env){
        let b = Array(64).fill(' ')
        for(let i = 0; i < 64; i++){ let r = i >> 3, c = i & 7; if((r + c) % 2){ if(r < 3) b[i] = 'b'; else if(r > 4) b[i] = 'r' } }
        let sel = -1, opts = [], busy = false, two = env.mode == 'two', side = 'r'
        let bar = document.createElement('div'); bar.style.cssText = 'position:absolute;left:0;right:0;top:0;height:6%;text-align:center;font-size:1.2em;line-height:2;opacity:.8'; env.el.appendChild(bar)
        let g = env.grid(8, 8, c => { c.style.borderRadius = 0; c.style.fontSize = '2.4em' }, pick, {css: 'inset:6% 0 0 0;gap:0;padding:0', start: 41})
        const draw = () => g.cells.forEach((c, i) => {
            let pc = b[i], r = i >> 3, cc = i & 7
            c.style.background = (r + cc) % 2 ? '#2b2b33' : '#c9ccd3'; c.style.boxShadow = ''
            c.innerHTML = pc == ' ' ? '' : `<div style="width:76%;aspect-ratio:1;border-radius:50%;background:${pc.toLowerCase() == 'r' ? 'radial-gradient(circle at 35% 30%,#ff8a80,#d32f2f)' : 'radial-gradient(circle at 35% 30%,#8e8e93,#1c1c1e)'};box-shadow:0 .1em .3em rgba(0,0,0,.6),inset 0 0 0 .1em rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:.55em;color:#ffd60a">${pc == pc.toUpperCase() ? '♛' : ''}</div>`
            if(i == sel) c.style.boxShadow = 'inset 0 0 0 .2em #C8F542'
            if(opts.some(m => m.path[m.path.length - 1] == i)) c.style.boxShadow = 'inset 0 0 0 .22em rgba(200,245,66,.95)'
        })
        function after(){
            let pm = cmoves(b, side), am = cmoves(b, 'b')
            bar.textContent = !pm.length ? '' : two ? (side == 'r' ? 'Red' : 'Black') + (pm[0].caps.length ? ' must capture' : ' to move') : pm[0].caps.length ? 'You must capture' : 'Your move'
            draw()
            if(two && !pm.length) return env.over((side == 'r' ? 'Black' : 'Red') + ' wins', true)
            if(two) return
            if(!pm.length) return env.over('Computer wins')
            if(!am.length){ env.score(300, 1); return env.over('You win!', true) }
        }
        function ai(){
            let ms = cmoves(b, 'b'), best = -1e9, ch = []
            if(!ms.length) return after()
            ms.forEach(m => { let v = csearch(capply(b, m), [3, 5, 6][env.level], -1e9, 1e9, false); if(v > best){ best = v; ch = [m] } else if(v == best) ch.push(m) })
            b = capply(b, env.pick(ch)); busy = false; env.sfx('tap'); after()
        }
        function pick(i){
            if(busy) return
            let all = cmoves(b, side)
            let m = all.find(m => m.path[0] == sel && m.path[m.path.length - 1] == i)
            if(m){ b = capply(b, m); if(m.caps.length){ env.score(m.caps.length * 20, 1); env.sfx('pop') } else env.sfx('tap'); sel = -1; opts = []; if(two){ side = side == 'r' ? 'b' : 'r'; return after() } busy = true; draw(); if(!cmoves(b, 'b').length) return after(); return env.after(ai, 450) }
            let mine = all.filter(m => m.path[0] == i)
            if(mine.length){ sel = i; opts = mine } else { sel = -1; opts = [] }
            draw()
        }
        after()
    }
},
{
    id: 'reversi', levels: true, modes: [{id: 'cpu', label: 'vs Computer'}, {id: 'two', label: '2 Players'}], title: 'Reversi', emoji: '⚫', c1: '#30D158', c2: '#0B5D2A', size: SQ, pad: true, hint: 'Flank the computer’s discs to flip them',
    start(env){
        let b = Array(64).fill(0); b[27] = b[36] = -1; b[28] = b[35] = 1
        let busy = false, two = env.mode == 'two', cur = 1, bar = document.createElement('div'); bar.style.cssText = 'position:absolute;left:0;right:0;top:0;height:7%;text-align:center;font-size:1.2em;line-height:2;opacity:.85'; env.el.appendChild(bar)
        let g = env.grid(8, 8, c => { c.style.borderRadius = 0 }, pick, {css: 'inset:7% 0 0 0;gap:.12em;padding:.12em;background:#0b3d1d', start: 19})
        const draw = () => {
            let hint = rmoves(b, two ? cur : 1)
            g.cells.forEach((c, i) => {
                c.style.background = '#14803a'
                c.innerHTML = b[i] ? `<div style="width:78%;aspect-ratio:1;border-radius:50%;background:${b[i] == 1 ? 'radial-gradient(circle at 35% 30%,#fff,#bfc3cc)' : 'radial-gradient(circle at 35% 30%,#4a4a52,#050507)'};box-shadow:0 .1em .3em rgba(0,0,0,.6)"></div>` : (!busy && hint.includes(i) ? '<div style="width:22%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.4)"></div>' : '')
            })
            let you = b.filter(v => v == 1).length, cpu = b.filter(v => v == -1).length
            bar.textContent = two ? `White ${you}  ·  Black ${cpu}  ·  ${cur == 1 ? 'White' : 'Black'} to move` : `You ${you}  ·  Computer ${cpu}`; env.score(you)
        }
        function place(i, p){ flips(b, i, p).forEach(k => b[k] = p); b[i] = p }
        function next(p){ // p just moved
            if(two){
                let a = rmoves(b, -p), c = rmoves(b, p), w = b.filter(v => v == 1).length, k = b.filter(v => v == -1).length
                if(!a.length && !c.length){ draw(); return env.over(w > k ? 'White wins' : w < k ? 'Black wins' : 'Draw', w != k) }
                cur = a.length ? -p : p
                return draw()
            }
            draw()
            let me = rmoves(b, 1), cpu = rmoves(b, -1)
            if(!me.length && !cpu.length){ let you = b.filter(v => v == 1).length, c = b.filter(v => v == -1).length; return env.over(you > c ? 'You win!' : you < c ? 'Computer wins' : 'Draw', you > c) }
            if(p == 1 || !me.length){ if(!cpu.length){ busy = false; return draw() } busy = true; draw(); env.after(ai, 500) } else busy = false, draw()
        }
        function ai(){
            let ms = rmoves(b, -1), best = -1e9, ch = []
            ms.forEach(m => { let nb = b.slice(); flips(nb, m, -1).forEach(k => nb[k] = -1); nb[m] = -1; let v = rsearch(nb, 1, [1, 3, 4][env.level], -1e9, 1e9); if(v > best){ best = v; ch = [m] } else if(v == best) ch.push(m) })
            place(env.pick(ch), -1); env.sfx('tap'); next(-1)
        }
        function pick(i){
            let p = two ? cur : 1
            if(busy || !flips(b, i, p).length) return
            place(i, p); env.sfx('pop'); next(p)
        }
        draw()
    }
},
]

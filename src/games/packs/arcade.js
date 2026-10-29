// Real-time canvas games, part 1: classics.
import {C, rr, text, glow, noglow, stars, hit} from '../draw'

// Virtual cursor for games that point: arrows move it (TV remote), a mouse or finger sets it directly.
export function aimer(env, cv, w, h, onTap, speed = 70){
    let a = {x: w / 2, y: h / 2, show: false}
    cv.addEventListener('pointermove', e => { let p = cv.pt(e); a.x = p.x; a.y = p.y; a.show = e.pointerType == 'mouse' })
    cv.addEventListener('pointerdown', e => { let p = cv.pt(e); a.x = p.x; a.y = p.y; onTap(a.x, a.y, true) })
    env.on('press', k => { if(k == 'ok'){ a.show = true; onTap(a.x, a.y, false) } else a.show = true })
    a.step = dt => { let h2 = env.held; a.x = Math.max(0, Math.min(w, a.x + ((h2.right ? 1 : 0) - (h2.left ? 1 : 0)) * speed * dt)); a.y = Math.max(0, Math.min(h, a.y + ((h2.down ? 1 : 0) - (h2.up ? 1 : 0)) * speed * dt)) }
    a.draw = ctx => { if(!a.show) return; ctx.strokeStyle = C.lime; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, 7); ctx.moveTo(a.x - 5, a.y); ctx.lineTo(a.x + 5, a.y); ctx.moveTo(a.x, a.y - 5); ctx.lineTo(a.x, a.y + 5); ctx.stroke() }
    return a
}

export default [
{
    id: 'snake', title: 'Snake', emoji: '🐍', c1: '#30D158', c2: '#0A84FF', size: [100, 100], swipe: true, pad: true, hint: 'Eat, grow, and do not hit yourself',
    start(env){
        const {ctx} = env.canvas(), N = 20, U = 5
        let s = [{x: 10, y: 10}, {x: 9, y: 10}, {x: 8, y: 10}], d = {x: 1, y: 0}, q = [], food, acc = 0, step = .12
        const place = () => { do food = {x: env.rnd(N), y: env.rnd(N)}; while(s.some(c => c.x == food.x && c.y == food.y)) }
        place()
        env.on('press', k => { let n = {left: {x: -1, y: 0}, right: {x: 1, y: 0}, up: {x: 0, y: -1}, down: {x: 0, y: 1}}[k]; if(n) q.push(n) })
        env.loop(dt => {
            acc += dt
            while(acc > step){
                acc -= step
                let last = q.length ? q.shift() : d
                if(last.x != -d.x || last.y != -d.y) d = last
                let h = {x: (s[0].x + d.x + N) % N, y: (s[0].y + d.y + N) % N}
                if(s.some(c => c.x == h.x && c.y == h.y)) return env.over(`Length ${s.length}`)
                s.unshift(h)
                if(h.x == food.x && h.y == food.y){ env.score(10, 1); env.sfx('good'); step = Math.max(.06, step - .002); place() } else s.pop()
            }
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 100)
            ctx.fillStyle = 'rgba(255,255,255,.035)'
            for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) if((i + j) % 2) ctx.fillRect(i * U, j * U, U, U)
            glow(ctx, C.red, 10); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(food.x * U + 2.5, food.y * U + 2.5, 1.9, 0, 7); ctx.fill(); noglow(ctx)
            s.forEach((c, i) => { ctx.fillStyle = i ? `hsl(${140 - i * 1.5} 70% ${55 - Math.min(20, i)}%)` : C.lime; rr(ctx, c.x * U + .3, c.y * U + .3, U - .6, U - .6, 1.6); ctx.fill() })
            let hd = s[0]; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(hd.x * U + 1.7 + d.x, hd.y * U + 1.9 + d.y, .55, 0, 7); ctx.arc(hd.x * U + 3.3 + d.x, hd.y * U + 1.9 + d.y, .55, 0, 7); ctx.fill()
        })
    }
},
{
    id: 'flappy', title: 'Flappy Bird', emoji: '🐤', c1: '#64D2FF', c2: '#30D158', size: [60, 100], pad: true, hint: 'OK, tap or click to flap',
    start(env){
        const {cv, ctx} = env.canvas()
        let b = {y: 45, v: 0}, pipes = [], t = 0, started = false, gap = 26
        const flap = () => { started = true; b.v = -52; env.sfx('tap') }
        env.on('press', k => (k == 'ok' || k == 'up') && flap())
        cv.addEventListener('pointerdown', flap)
        env.loop(dt => {
            if(started){
                b.v += 160 * dt; b.y += b.v * dt; t += dt
                if(!pipes.length || pipes[pipes.length - 1].x < 28) pipes.push({x: 66, g: env.rnd(22, 78 - gap + 6), scored: 0})
                pipes.forEach(p => p.x -= 26 * dt)
                pipes = pipes.filter(p => p.x > -12)
                pipes.forEach(p => { if(!p.scored && p.x + 10 < 14){ p.scored = 1; env.score(1, 1); env.sfx('good') } })
                let dead = b.y < 0 || b.y > 94 || pipes.some(p => 14 + 3 > p.x && 14 - 3 < p.x + 10 && (b.y - 3 < p.g || b.y + 3 > p.g + gap))
                if(dead) return env.over('Crashed')
            } else b.y = 45 + Math.sin(performance.now() / 250) * 3
            let g = ctx.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, '#1b3a5c'); g.addColorStop(1, '#0c0c0f')
            ctx.fillStyle = g; ctx.fillRect(0, 0, 60, 100); stars(ctx, 60, 100, t)
            pipes.forEach(p => { ctx.fillStyle = '#30D158'; rr(ctx, p.x, -4, 10, p.g + 4, 1.5); ctx.fill(); rr(ctx, p.x, p.g + gap, 10, 100, 1.5); ctx.fill(); ctx.fillStyle = '#1f9a3f'; ctx.fillRect(p.x - 1, p.g - 4, 12, 4); ctx.fillRect(p.x - 1, p.g + gap, 12, 4) })
            ctx.save(); ctx.translate(14, b.y); ctx.rotate(Math.max(-.5, Math.min(1.1, b.v / 90)))
            ctx.fillStyle = C.yellow; glow(ctx, C.yellow, 8); ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, 7); ctx.fill(); noglow(ctx)
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1.4, -1, 1.2, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.7, -1, .5, 0, 7); ctx.fill(); ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(6, .8); ctx.lineTo(3, 1.8); ctx.fill()
            ctx.restore()
            if(!started) text(ctx, 'Tap to start', 30, 70, 4, C.dim)
        })
    }
},
{
    id: 'breakout', title: 'Breakout', emoji: '🧱', c1: '#FF375F', c2: '#FF9F0A', size: [100, 72], pad: true, hint: 'Left / right or drag to move the paddle · OK launches',
    start(env){
        const {cv, ctx} = env.canvas()
        let px = 50, pw = 16, ball = {x: 50, y: 62, vx: 0, vy: 0, on: true}, lives = 3, level = 1, bricks = []
        const build = () => { bricks = []; for(let r = 0; r < 4 + Math.min(level, 3); r++) for(let c = 0; c < 10; c++) bricks.push({x: 2 + c * 9.6, y: 8 + r * 4.6, w: 9, h: 3.8, c: ['#FF375F', '#FF9F0A', '#FFD60A', '#30D158', '#0A84FF', '#BF5AF2', '#64D2FF'][r % 7]}) }
        build()
        const launch = () => { if(ball.on){ ball.on = false; let sp = 46 + level * 4, a = -Math.PI / 2 + env.rnd(-.4, .4); ball.vx = Math.cos(a) * sp; ball.vy = Math.sin(a) * sp } }
        env.on('press', k => k == 'ok' && launch())
        cv.addEventListener('pointerdown', launch)
        cv.addEventListener('pointermove', e => { px = cv.pt(e).x })
        env.loop(dt => {
            px = Math.max(pw / 2, Math.min(100 - pw / 2, px + ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * 90 * dt))
            if(ball.on){ ball.x = px; ball.y = 66.5 } else {
                ball.x += ball.vx * dt; ball.y += ball.vy * dt
                if(ball.x < 1.5 || ball.x > 98.5){ ball.vx *= -1; ball.x = Math.max(1.5, Math.min(98.5, ball.x)) }
                if(ball.y < 1.5){ ball.vy = Math.abs(ball.vy) }
                if(ball.vy > 0 && ball.y > 65 && ball.y < 68 && Math.abs(ball.x - px) < pw / 2 + 1){ let o = (ball.x - px) / (pw / 2), sp = Math.hypot(ball.vx, ball.vy); ball.vx = o * sp * .85; ball.vy = -Math.sqrt(Math.max(sp * sp - ball.vx * ball.vx, 100)); env.sfx('tap') }
                let b = bricks.find(b => ball.x > b.x - 1 && ball.x < b.x + b.w + 1 && ball.y > b.y - 1 && ball.y < b.y + b.h + 1)
                if(b){ bricks.splice(bricks.indexOf(b), 1); env.score(10, 1); env.sfx('pop'); let ox = Math.min(ball.x - b.x, b.x + b.w - ball.x), oy = Math.min(ball.y - b.y, b.y + b.h - ball.y); ox < oy ? ball.vx *= -1 : ball.vy *= -1; if(!bricks.length){ level++; ball.on = true; build(); env.sfx('win') } }
                if(ball.y > 74){ lives--; ball.on = true; env.sfx('bad'); if(!lives) return env.over(`Level ${level}`) }
            }
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 72)
            bricks.forEach(b => { ctx.fillStyle = b.c; rr(ctx, b.x, b.y, b.w, b.h, 1); ctx.fill() })
            ctx.fillStyle = '#fff'; rr(ctx, px - pw / 2, 67, pw, 2.4, 1.2); ctx.fill()
            glow(ctx, '#fff', 8); ctx.beginPath(); ctx.arc(ball.x, ball.y, 1.5, 0, 7); ctx.fill(); noglow(ctx)
            text(ctx, '❤'.repeat(lives), 4, 3, 3, C.red, 'left'); text(ctx, 'Level ' + level, 96, 3, 3, C.dim, 'right')
            if(ball.on) text(ctx, 'OK / tap to launch', 50, 45, 3.6, C.dim)
        })
    }
},
{
    id: 'pong', title: 'Ping Pong', emoji: '🏓', c1: '#0A84FF', c2: '#5E5CE6', size: [100, 60], pad: true, hint: 'Up / down or drag to move · first to 7 wins',
    start(env){
        const {cv, ctx} = env.canvas()
        let py = 30, ay = 30, ball, sc = [0, 0], ph = 12
        const serve = d => { ball = {x: 50, y: 30, vx: 48 * d, vy: env.rnd(-22, 22)} }
        serve(1)
        cv.addEventListener('pointermove', e => { py = cv.pt(e).y })
        env.loop(dt => {
            py = Math.max(ph / 2, Math.min(60 - ph / 2, py + ((env.held.down ? 1 : 0) - (env.held.up ? 1 : 0)) * 75 * dt))
            ay += Math.max(-1, Math.min(1, (ball.y - ay) / 4)) * 38 * dt * (ball.vx > 0 ? 1 : .35); ay = Math.max(ph / 2, Math.min(60 - ph / 2, ay))
            ball.x += ball.vx * dt; ball.y += ball.vy * dt
            if(ball.y < 1.5 || ball.y > 58.5) ball.vy *= -1, ball.y = Math.max(1.5, Math.min(58.5, ball.y))
            const bounce = (y, dir) => { let o = (ball.y - y) / (ph / 2); ball.vx = dir * Math.min(95, Math.abs(ball.vx) * 1.06); ball.vy = o * 42; env.sfx('tap') }
            if(ball.vx < 0 && ball.x < 5.5 && ball.x > 2 && Math.abs(ball.y - py) < ph / 2 + 1.5) bounce(py, 1)
            if(ball.vx > 0 && ball.x > 94.5 && ball.x < 98 && Math.abs(ball.y - ay) < ph / 2 + 1.5) bounce(ay, -1)
            if(ball.x < -2){ sc[1]++; env.sfx('bad'); serve(1) } else if(ball.x > 102){ sc[0]++; env.score(sc[0]); env.sfx('good'); serve(-1) }
            if(sc[0] >= 7) return env.over('You win!', true)
            if(sc[1] >= 7) return env.over('Computer wins')
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 60)
            ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(50, 0); ctx.lineTo(50, 60); ctx.stroke(); ctx.setLineDash([])
            text(ctx, sc[0], 38, 8, 8, C.dim); text(ctx, sc[1], 62, 8, 8, C.dim)
            ctx.fillStyle = C.teal; rr(ctx, 3, py - ph / 2, 2.4, ph, 1.2); ctx.fill(); ctx.fillStyle = C.pink; rr(ctx, 94.6, ay - ph / 2, 2.4, ph, 1.2); ctx.fill()
            glow(ctx, '#fff', 8); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 1.6, 0, 7); ctx.fill(); noglow(ctx)
        })
    }
},
{
    id: 'tetris', title: 'Tetris', emoji: '🟦', c1: '#BF5AF2', c2: '#0A84FF', size: [70, 100], swipe: true, pad: true, hint: 'Left / right move · up rotates · down drops · OK hard drop',
    start(env){
        const {cv, ctx} = env.canvas(), W = 10, H = 20, U = 4.5
        const SH = {I: [[0,1],[1,1],[2,1],[3,1]], O: [[1,0],[2,0],[1,1],[2,1]], T: [[1,0],[0,1],[1,1],[2,1]], S: [[1,0],[2,0],[0,1],[1,1]], Z: [[0,0],[1,0],[1,1],[2,1]], J: [[0,0],[0,1],[1,1],[2,1]], L: [[2,0],[0,1],[1,1],[2,1]]}
        const COL = {I: '#64D2FF', O: '#FFD60A', T: '#BF5AF2', S: '#30D158', Z: '#FF453A', J: '#0A84FF', L: '#FF9F0A'}
        let board = Array.from({length: H}, () => Array(W).fill(null)), bag = [], cur, next, lines = 0, acc = 0, level = 1
        const draw7 = () => { if(!bag.length) bag = env.shuffle(Object.keys(SH)); return bag.pop() }
        const spawn = () => { let t = next || draw7(); next = draw7(); cur = {t, c: SH[t].map(a => a.slice()), x: 3, y: 0}; if(!ok(cur.c, cur.x, cur.y)) env.over(`${lines} lines`) }
        const ok = (c, x, y) => c.every(([a, b]) => { let X = a + x, Y = b + y; return X >= 0 && X < W && Y < H && (Y < 0 || !board[Y][X]) })
        const rot = c => { if(cur.t == 'O') return c; let m = cur.t == 'I' ? 3 : 2; return c.map(([a, b]) => [m - b, a]) }
        const lock = () => {
            cur.c.forEach(([a, b]) => { if(cur.y + b >= 0) board[cur.y + b][cur.x + a] = cur.t })
            let full = board.filter(r => r.every(Boolean)).length
            if(full){ board = board.filter(r => !r.every(Boolean)); while(board.length < H) board.unshift(Array(W).fill(null)); lines += full; level = 1 + (lines / 10 | 0); env.score([0, 100, 300, 500, 800][full] * level, 1); env.sfx('good') } else env.sfx('tap')
            spawn()
        }
        const move = dx => ok(cur.c, cur.x + dx, cur.y) && (cur.x += dx, true)
        const drop = () => { if(ok(cur.c, cur.x, cur.y + 1)) cur.y++; else lock() }
        env.on('press', k => {
            if(k == 'left') move(-1); else if(k == 'right') move(1)
            else if(k == 'up'){ let r = rot(cur.c); for(const dx of [0, -1, 1, -2, 2]) if(ok(r, cur.x + dx, cur.y)){ cur.c = r; cur.x += dx; break } }
            else if(k == 'down'){ drop(); acc = 0 }
            else if(k == 'ok'){ while(ok(cur.c, cur.x, cur.y + 1)) cur.y++; lock() }
        })
        env.el.addEventListener('click', e => { if(e.target === cv) env.held.up = 0 })
        spawn()
        const cell = (x, y, c, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = c; rr(ctx, x * U + 12.5 + .25, y * U + 5 + .25, U - .5, U - .5, .9); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x * U + 12.5 + .8, y * U + 5 + .8, U - 1.6, .7); ctx.globalAlpha = 1 }
        env.loop(dt => {
            acc += dt
            if(acc > Math.max(.08, .75 - level * .06)){ acc = 0; drop() }
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 70, 100)
            ctx.fillStyle = 'rgba(255,255,255,.05)'; rr(ctx, 12, 4.5, W * U + 1, H * U + 1, 1.5); ctx.fill()
            board.forEach((r, y) => r.forEach((t, x) => t && cell(x, y, COL[t])))
            let gy = 0; while(ok(cur.c, cur.x, cur.y + gy + 1)) gy++
            cur.c.forEach(([a, b]) => { cell(cur.x + a, cur.y + b + gy, COL[cur.t], .22); cell(cur.x + a, cur.y + b, COL[cur.t]) })
            text(ctx, 'NEXT', 6, 8, 2.6, C.dim); SH[next].forEach(([a, b]) => { ctx.fillStyle = COL[next]; rr(ctx, 1.5 + a * 2.4, 11 + b * 2.4, 2.2, 2.2, .5); ctx.fill() })
            text(ctx, 'LINES', 6, 30, 2.6, C.dim); text(ctx, lines, 6, 34, 4); text(ctx, 'LEVEL', 6, 44, 2.6, C.dim); text(ctx, level, 6, 48, 4)
        })
    }
},
{
    id: 'invaders', title: 'Space Invaders', emoji: '👾', c1: '#30D158', c2: '#5E5CE6', size: [100, 100], pad: true, hint: 'Left / right to move · OK to shoot · hide behind the bunkers',
    start(env){
        const {cv, ctx} = env.canvas()
        let ship = 50, shots = [], bombs = [], al, dir = 1, lives = 3, wave = 1, cd = 0, bk, t = 0, speed
        const build = () => { al = []; for(let r = 0; r < 4; r++) for(let c = 0; c < 8; c++) al.push({x: 14 + c * 9.5, y: 14 + r * 8, r}); dir = 1; speed = 6 + wave * 2; bk = [0, 1, 2, 3].map(i => ({x: 10 + i * 22, y: 78, cells: Array.from({length: 24}, () => 1)})) }
        build()
        const fire = () => { if(cd <= 0){ shots.push({x: ship, y: 90}); cd = .35; env.sfx('pop') } }
        env.on('press', k => k == 'ok' && fire())
        cv.addEventListener('pointerdown', e => { ship = cv.pt(e).x; fire() })
        cv.addEventListener('pointermove', e => { if(e.buttons) ship = cv.pt(e).x })
        const bhit = (x, y) => { for(const b of bk){ let cx = ((x - b.x) / 2.5) | 0, cy = ((y - b.y) / 2.5) | 0; if(x >= b.x && cx < 6 && y >= b.y && cy < 4 && b.cells[cy * 6 + cx]){ b.cells[cy * 6 + cx] = 0; return true } } return false }
        env.loop(dt => {
            t += dt; cd -= dt
            ship = Math.max(5, Math.min(95, ship + ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * 70 * dt))
            let sp = speed * (1 + (32 - al.length) / 12)
            al.forEach(a => a.x += dir * sp * dt)
            if(al.some(a => a.x < 4 || a.x > 96)){ dir *= -1; al.forEach(a => { a.y += 3; a.x += dir * 1 }) }
            shots.forEach(s => s.y -= 80 * dt); bombs.forEach(b => b.y += (30 + wave * 4) * dt)
            if(al.length && Math.random() < dt * (1 + wave * .5)){ let a = env.pick(al); bombs.push({x: a.x, y: a.y + 3}) }
            shots = shots.filter(s => { if(s.y < 0) return false; if(bhit(s.x, s.y)) return false; let a = al.find(a => Math.abs(a.x - s.x) < 4 && Math.abs(a.y - s.y) < 3); if(a){ al.splice(al.indexOf(a), 1); env.score(10 + (3 - a.r) * 5, 1); env.sfx('pop'); return false } return true })
            bombs = bombs.filter(b => { if(b.y > 100) return false; if(bhit(b.x, b.y)) return false; if(b.y > 91 && Math.abs(b.x - ship) < 4.5){ lives--; env.sfx('bad'); return false } return true })
            if(!lives || al.some(a => a.y > 84)) return env.over(`Wave ${wave}`)
            if(!al.length){ wave++; build(); env.sfx('win') }
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 100); stars(ctx, 100, 100, t)
            al.forEach(a => { ctx.fillStyle = ['#FF375F', '#FF9F0A', '#30D158', '#64D2FF'][a.r]; let w = Math.sin(t * 4 + a.r) > 0; ctx.fillRect(a.x - 3.5, a.y - 2, 7, 3.4); ctx.fillRect(a.x - 2, a.y - 3, 4, 1.2); ctx.fillRect(a.x - 4.5, a.y + (w ? 0 : 1), 1.2, 2.4); ctx.fillRect(a.x + 3.3, a.y + (w ? 0 : 1), 1.2, 2.4); ctx.fillStyle = C.bg; ctx.fillRect(a.x - 2, a.y - 1, 1.2, 1.2); ctx.fillRect(a.x + .8, a.y - 1, 1.2, 1.2) })
            bk.forEach(b => b.cells.forEach((c, i) => { if(c){ ctx.fillStyle = '#30D158'; ctx.fillRect(b.x + (i % 6) * 2.5, b.y + ((i / 6) | 0) * 2.5, 2.4, 2.4) } }))
            ctx.fillStyle = C.yellow; shots.forEach(s => ctx.fillRect(s.x - .4, s.y - 2, .8, 3)); ctx.fillStyle = C.red; bombs.forEach(b => ctx.fillRect(b.x - .5, b.y - 1.5, 1, 3))
            ctx.fillStyle = C.lime; glow(ctx, C.lime, 8); ctx.beginPath(); ctx.moveTo(ship - 4.5, 95); ctx.lineTo(ship, 88); ctx.lineTo(ship + 4.5, 95); ctx.closePath(); ctx.fill(); noglow(ctx)
            text(ctx, '❤'.repeat(lives), 3, 4, 3, C.red, 'left'); text(ctx, 'Wave ' + wave, 97, 4, 3, C.dim, 'right')
        })
    }
},
{
    id: 'asteroids', title: 'Asteroids', emoji: '☄️', c1: '#8E8E93', c2: '#0A84FF', size: [100, 100], pad: true, hint: 'Left / right rotate · up thrust · OK fire',
    start(env){
        const {ctx} = env.canvas()
        let ship = {x: 50, y: 50, a: -Math.PI / 2, vx: 0, vy: 0, inv: 2}, rocks = [], shots = [], lives = 3, cd = 0, level = 0, parts = []
        const rock = (x, y, r) => { let a = env.rnd(0, 6.28), s = env.rnd(7, 16) * (1 + level * .08); return {x, y, r, vx: Math.cos(a) * s, vy: Math.sin(a) * s, p: Array.from({length: 10}, (_, i) => env.rnd(.75, 1.2)), rot: env.rnd(-1, 1)} }
        const wave = () => { level++; rocks = []; for(let i = 0; i < 3 + level; i++){ let x, y; do { x = env.rnd(100); y = env.rnd(100) } while(Math.hypot(x - ship.x, y - ship.y) < 28); rocks.push(rock(x, y, 7)) } }
        wave()
        const fire = () => { if(cd <= 0){ shots.push({x: ship.x + Math.cos(ship.a) * 4, y: ship.y + Math.sin(ship.a) * 4, vx: Math.cos(ship.a) * 70 + ship.vx, vy: Math.sin(ship.a) * 70 + ship.vy, life: 1.1}); cd = .22; env.sfx('pop') } }
        env.on('press', k => k == 'ok' && fire())
        const wrap = o => { o.x = (o.x + 100) % 100; o.y = (o.y + 100) % 100 }
        env.loop(dt => {
            cd -= dt; ship.inv -= dt
            ship.a += ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * 3.6 * dt
            if(env.held.up){ ship.vx += Math.cos(ship.a) * 55 * dt; ship.vy += Math.sin(ship.a) * 55 * dt; parts.push({x: ship.x - Math.cos(ship.a) * 3, y: ship.y - Math.sin(ship.a) * 3, l: .3}) }
            ship.vx *= 1 - .4 * dt; ship.vy *= 1 - .4 * dt; ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship)
            rocks.forEach(r => { r.x += r.vx * dt; r.y += r.vy * dt; wrap(r) }); shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; wrap(s) }); shots = shots.filter(s => s.life > 0)
            parts.forEach(p => p.l -= dt); parts = parts.filter(p => p.l > 0)
            shots.forEach(s => rocks.forEach(r => { if(!r.dead && !s.dead && Math.hypot(r.x - s.x, r.y - s.y) < r.r){ r.dead = s.dead = 1; env.score(r.r > 5 ? 20 : r.r > 3 ? 50 : 100, 1); env.sfx('pop'); if(r.r > 3) for(let i = 0; i < 2; i++) rocks.push(rock(r.x, r.y, r.r / 1.8)) } }))
            shots = shots.filter(s => !s.dead); rocks = rocks.filter(r => !r.dead)
            if(ship.inv <= 0 && rocks.some(r => Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 1.5)){ lives--; env.sfx('bad'); ship = {x: 50, y: 50, a: -Math.PI / 2, vx: 0, vy: 0, inv: 2.5}; if(!lives) return env.over(`Level ${level}`) }
            if(!rocks.length) wave()
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 100); ctx.lineWidth = .6; ctx.lineJoin = 'round'
            ctx.strokeStyle = '#c9d1d9'; rocks.forEach(r => { ctx.beginPath(); r.p.forEach((m, i) => { let a = i / 10 * 6.28 + performance.now() / 4000 * r.rot; ctx[i ? 'lineTo' : 'moveTo'](r.x + Math.cos(a) * r.r * m, r.y + Math.sin(a) * r.r * m) }); ctx.closePath(); ctx.stroke() })
            ctx.strokeStyle = C.yellow; parts.forEach(p => { ctx.globalAlpha = p.l * 3; ctx.beginPath(); ctx.arc(p.x, p.y, .6, 0, 7); ctx.stroke() }); ctx.globalAlpha = 1
            ctx.fillStyle = '#fff'; shots.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, .7, 0, 7); ctx.fill() })
            if(ship.inv <= 0 || (ship.inv * 8 | 0) % 2){ ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a); ctx.strokeStyle = C.lime; glow(ctx, C.lime, 6); ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, 2.8); ctx.lineTo(-1.6, 0); ctx.lineTo(-3, -2.8); ctx.closePath(); ctx.stroke(); ctx.restore(); noglow(ctx) }
            text(ctx, '❤'.repeat(lives), 3, 4, 3, C.red, 'left'); text(ctx, 'Level ' + level, 97, 4, 3, C.dim, 'right')
        })
    }
},
{
    id: 'pacman', title: 'Pac-Man', emoji: '🟡', c1: '#FFD60A', c2: '#5E5CE6', size: [95, 105], swipe: true, pad: true, hint: 'Eat every dot · power pellets turn the ghosts blue',
    start(env){
        const {ctx} = env.canvas(), U = 5
        const MAP = [
            '###################', '#........#........#', '#o##.###.#.###.##o#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '####.### # ###.####', '   #.#       #.#   ', '####.# ##-## #.####', '#   .  #GGG#  .   #', '####.# ##### #.####', '   #.#       #.#   ', '####.# ##### #.####', '#........#........#', '#.##.###.#.###.##.#', '#o.#.....P.....#.o#', '##.#.#.#####.#.#.##', '#....#...#...#....#', '#.######.#.######.#', '#.................#', '###################']
        let g = MAP.map(r => [...r]), dots = 0
        g.forEach((r, y) => r.forEach((c, x) => { if(c == '.' || c == 'o') dots++ }))
        const walk = (x, y, ghost) => { let c = (g[y] || [])[((x % 19) + 19) % 19]; return c && c != '#' && (ghost || c != '-') }
        let pac, ghosts, power = 0, lives = 3, want = {x: 0, y: 0}, t = 0, frozen = 0
        const reset = () => {
            pac = {x: 9, y: 15, dx: 0, dy: 0, p: 0}
            ghosts = [['#FF375F', 8, 9], ['#FF9F0A', 9, 9], ['#64D2FF', 10, 9], ['#BF5AF2', 9, 7]].map(([c, x, y], i) => ({c, x, y, dx: 0, dy: -1, p: 0, home: i * 3, eaten: 0}))
            want = {x: 0, y: 0}; frozen = 1.2
        }
        reset()
        env.on('press', k => { let d = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]}[k]; if(d) want = {x: d[0], y: d[1]} })
        // moves an actor along tiles: at every tile centre it may turn; p is progress 0..1 to the next tile
        function advance(a, speed, dt, choose, ghost){
            let left = speed * dt
            while(left > 0){
                if(!a.dx && !a.dy){ choose(a); if(!a.dx && !a.dy) return }
                let step = Math.min(left, 1 - a.p); a.p += step; left -= step
                if(a.p >= 1){ a.x = ((a.x + a.dx) + 19) % 19; a.y += a.dy; a.p = 0; choose(a); if(!walk(a.x + a.dx, a.y + a.dy, ghost) ){ a.dx = a.dy = 0 } }
            }
        }
        const pChoose = a => {
            if((want.x || want.y) && walk(a.x + want.x, a.y + want.y)){ a.dx = want.x; a.dy = want.y }
            if(!walk(a.x + a.dx, a.y + a.dy)) a.dx = a.dy = 0
        }
        const gChoose = (a) => {
            let opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => walk(a.x + dx, a.y + dy, true) && !(dx == -a.dx && dy == -a.dy && a.dx + a.dy != 0 && true))
            if(!opts.length) opts = [[-a.dx, -a.dy]]
            let tx = a.eaten ? 9 : pac.x, ty = a.eaten ? 9 : pac.y
            if(!a.eaten && !power && a.home % 2) { tx = pac.x + pac.dx * 4; ty = pac.y + pac.dy * 4 }
            opts.sort((p, q) => Math.hypot(a.x + p[0] - tx, a.y + p[1] - ty) - Math.hypot(a.x + q[0] - tx, a.y + q[1] - ty))
            let pick = (power && !a.eaten) || Math.random() < .12 ? env.pick(opts) : opts[0]
            a.dx = pick[0]; a.dy = pick[1]
        }
        env.loop(dt => {
            t += dt
            if(frozen > 0) frozen -= dt
            else {
                advance(pac, 6.2, dt, pChoose, false)
                let c = g[pac.y][pac.x]
                if(pac.p < .5 && (c == '.' || c == 'o')){ g[pac.y][pac.x] = ' '; dots--; env.score(c == 'o' ? 50 : 10, 1); if(c == 'o'){ power = 7; ghosts.forEach(g2 => g2.eaten = 0) } env.sfx('tap') }
                power = Math.max(0, power - dt)
                ghosts.forEach(a => {
                    if(a.home > 0){ a.home -= dt; if(a.home <= 0){ a.home = 0; a.x = 9; a.y = 7 } return }
                    advance(a, a.eaten ? 9 : power ? 3.6 : 5.2, dt, gChoose, true)
                    if(a.eaten && a.x == 9 && a.y == 9) a.eaten = 0
                    let gx = a.x + a.dx * a.p, gy = a.y + a.dy * a.p, px = pac.x + pac.dx * pac.p, py = pac.y + pac.dy * pac.p
                    if(Math.hypot(gx - px, gy - py) < .7 && !a.eaten){
                        if(power){ a.eaten = 1; env.score(200, 1); env.sfx('win') } else { lives--; env.sfx('bad'); if(!lives) { env.over(`${env.points} points`); return } reset() }
                    }
                })
                if(!dots){ env.score(500, 1); g = MAP.map(r => [...r]); dots = 0; g.forEach(r => r.forEach(c => { if(c == '.' || c == 'o') dots++ })); reset(); env.sfx('win') }
            }
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 95, 105)
            g.forEach((r, y) => r.forEach((c, x) => {
                if(c == '#'){ ctx.fillStyle = '#16205a'; rr(ctx, x * U + .5, y * U + .5, U - 1, U - 1, 1.2); ctx.fill(); ctx.strokeStyle = '#0A84FF'; ctx.lineWidth = .35; ctx.stroke() }
                else if(c == '.'){ ctx.fillStyle = '#ffd7a8'; ctx.beginPath(); ctx.arc(x * U + 2.5, y * U + 2.5, .55, 0, 7); ctx.fill() }
                else if(c == 'o'){ ctx.fillStyle = '#ffd7a8'; ctx.beginPath(); ctx.arc(x * U + 2.5, y * U + 2.5, 1.4 + Math.sin(t * 8) * .25, 0, 7); ctx.fill() }
                else if(c == '-'){ ctx.fillStyle = '#FF375F'; ctx.fillRect(x * U, y * U + 2, U, 1) }
            }))
            ghosts.forEach(a => {
                let x = (a.x + a.dx * a.p) * U + 2.5, y = (a.y + a.dy * a.p) * U + 2.5
                ctx.fillStyle = a.eaten ? 'transparent' : power ? (power < 2 && (t * 6 | 0) % 2 ? '#fff' : '#0A84FF') : a.c
                ctx.beginPath(); ctx.arc(x, y - .4, 2.2, Math.PI, 0); ctx.lineTo(x + 2.2, y + 2.2); for(let i = 0; i < 3; i++) ctx.lineTo(x + 2.2 - (i + 1) * 1.47, y + (i % 2 ? 2.2 : 1.4)); ctx.closePath(); ctx.fill()
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - .9, y - .6, .7, 0, 7); ctx.arc(x + .9, y - .6, .7, 0, 7); ctx.fill(); ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.arc(x - .9 + a.dx * .3, y - .6 + a.dy * .3, .35, 0, 7); ctx.arc(x + .9 + a.dx * .3, y - .6 + a.dy * .3, .35, 0, 7); ctx.fill()
            })
            let x = (pac.x + pac.dx * pac.p) * U + 2.5, y = (pac.y + pac.dy * pac.p) * U + 2.5, m = (pac.dx || pac.dy) ? Math.abs(Math.sin(t * 14)) * .6 : .25, a0 = Math.atan2(pac.dy, pac.dx || (pac.dy ? 0 : 1))
            ctx.fillStyle = C.yellow; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, 2.3, a0 + m, a0 + Math.PI * 2 - m); ctx.closePath(); ctx.fill()
            text(ctx, '●'.repeat(lives), 2, 102, 3, C.yellow, 'left')
        })
    }
},
]

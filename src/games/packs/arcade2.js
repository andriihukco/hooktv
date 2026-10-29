// Real-time canvas games, part 2: jumpers, hoppers, pointers.
import {C, rr, text, glow, noglow, stars} from '../draw'
import {aimer} from './arcade'

const steer = (env, cv, w, fn) => { cv.addEventListener('pointermove', e => fn(cv.pt(e).x)); return dt => ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * w * dt }

export default [
{
    id: 'doodle', title: 'Doodle Jump', emoji: '🦘', c1: '#C8F542', c2: '#30D158', size: [60, 100], pad: true, hint: 'Left / right or drag to steer · bounce on platforms',
    start(env){
        const {cv, ctx} = env.canvas()
        let p = {x: 30, y: 80, vy: -70, dir: 1}, cam = 0, plats = [], top = 100, best = 0, t = 0
        const add = y => { let kind = Math.random(); plats.push({x: env.rnd(2, 44), y, w: 14, k: y > 70 ? 0 : kind < .1 ? 'spring' : kind < .28 ? 'move' : kind < .38 ? 'break' : 0, d: env.rnd(1) < .5 ? 1 : -1, gone: 0}) }
        plats.push({x: 23, y: 92, w: 14, k: 0, d: 1, gone: 0})
        for(let y = 78; y > -20; y -= 13) add(y)
        top = -20
        const move = steer(env, cv, 62, x => p.x = x)
        env.loop(dt => {
            t += dt
            p.x += move(dt); if(env.held.left) p.dir = -1; if(env.held.right) p.dir = 1
            p.x = (p.x + 60) % 60
            p.vy += 150 * dt; p.y += p.vy * dt
            plats.forEach(pl => { if(pl.k == 'move'){ pl.x += pl.d * 12 * dt; if(pl.x < 0 || pl.x > 46) pl.d *= -1 } })
            if(p.vy > 0) plats.forEach(pl => { if(!pl.gone && p.y + 3 > pl.y && p.y + 3 < pl.y + 4 + p.vy * dt && p.x + 2 > pl.x && p.x - 2 < pl.x + pl.w){ if(pl.k == 'break'){ pl.gone = 1; env.sfx('pop') } else { p.vy = pl.k == 'spring' ? -125 : -78; env.sfx(pl.k == 'spring' ? 'win' : 'tap') } } })
            if(p.y < cam + 40){ cam = p.y - 40 }
            best = Math.max(best, -cam); env.score(Math.floor(best))
            while(top > cam - 20){ top -= 13 + Math.min(10, best / 300); add(top) }
            plats = plats.filter(pl => pl.y < cam + 110 && !(pl.gone && pl.y > p.y + 50))
            if(p.y > cam + 104) return env.over(`${Math.floor(best)} m`)
            let g = ctx.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, '#10243a'); g.addColorStop(1, '#0c0c0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 60, 100)
            ctx.save(); ctx.translate(0, -cam)
            plats.forEach(pl => { if(pl.gone) return; ctx.fillStyle = pl.k == 'break' ? '#b5651d' : pl.k == 'move' ? '#64D2FF' : C.lime; rr(ctx, pl.x, pl.y, pl.w, 2.6, 1.3); ctx.fill(); if(pl.k == 'spring'){ ctx.fillStyle = C.red; ctx.fillRect(pl.x + 5, pl.y - 2.2, 4, 2.2) } })
            ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir, 1); ctx.fillStyle = C.yellow; glow(ctx, C.yellow, 6); rr(ctx, -2.6, -3, 5.2, 6, 2); ctx.fill(); noglow(ctx); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(1, -1.2, 1, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.3, -1.2, .45, 0, 7); ctx.fill(); ctx.fillStyle = C.orange; ctx.fillRect(2.2, -.2, 2.2, 1); ctx.restore()
            ctx.restore()
        })
    }
},
{
    id: 'crossy', title: 'Crossy Road', emoji: '🐔', c1: '#30D158', c2: '#FFD60A', size: [70, 100], swipe: true, pad: true, hint: 'Hop forward · dodge cars · ride the logs',
    start(env){
        const {ctx} = env.canvas(), COLS = 7, U = 10
        let lanes = [], me = {x: 3, y: 0, fx: 3, fy: 0, rx: 3}, cam = 0, best = 0, t = 0, dead = 0, idle = 0
        const lane = y => {
            let r = Math.random(), k = y < 2 ? 'grass' : r < .38 ? 'road' : r < .6 ? 'river' : 'grass', L = {y, k, cars: [], trees: []}
            if(k == 'grass') for(let x = 0; x < COLS; x++) if(y > 1 && Math.random() < .2) L.trees.push(x)
            if(k != 'grass'){ let sp = (1.4 + Math.random() * 2.2 + Math.min(y / 40, 2)) * (Math.random() < .5 ? 1 : -1), n = k == 'road' ? 2 + (Math.random() < .5) : 2, w = k == 'road' ? 1.2 : 2.2 + Math.random(); for(let i = 0; i < n; i++) L.cars.push({x: i * (COLS + 3) / n + Math.random() * 2, w}); L.sp = sp }
            return L
        }
        for(let y = 0; y < 14; y++) lanes.push(lane(y))
        const L = y => { while(lanes.length <= y + 14) lanes.push(lane(lanes.length)); return lanes[y] }
        env.on('press', k => {
            if(dead) return
            let d = {up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0], ok: [0, 1]}[k]; if(!d) return
            let nx = me.x + d[0], ny = me.y + d[1]; if(ny < 0 || nx < 0 || nx >= COLS) return
            if(L(ny).k == 'grass' && L(ny).trees.includes(Math.round(nx))) return
            me.x = nx; me.y = Math.max(0, ny); me.hop = .12; idle = 0; env.sfx('tap')
            if(me.y > best){ best = me.y; env.score(best) }
        })
        env.loop(dt => {
            t += dt; idle += dt
            me.fx += (me.x - me.fx) * Math.min(1, dt * 18); me.fy += (me.y - me.fy) * Math.min(1, dt * 18); me.hop = Math.max(0, (me.hop || 0) - dt)
            lanes.forEach(l => l.cars && l.cars.forEach(c => { c.x += l.sp * dt; if(l.sp > 0 && c.x > COLS + 2) c.x = -c.w - 2; if(l.sp < 0 && c.x < -c.w - 2) c.x = COLS + 2 }))
            let l = L(me.y), on = false
            if(l.k == 'road' && l.cars.some(c => me.fx + .3 > c.x && me.fx - .3 < c.x + c.w - .2)) dead = 1
            if(l.k == 'river'){ let lg = l.cars.find(c => me.fx + .5 > c.x && me.fx + .2 < c.x + c.w); if(lg){ me.x += l.sp * dt; me.fx += l.sp * dt } else dead = 1 }
            if(me.fx < -.4 || me.fx > COLS - .6 || idle > 9 + Math.max(0, 5 - best / 10)) dead = 1
            if(dead){ env.sfx('bad'); return env.over(`${best} hops`) }
            cam += (me.fy - cam) * Math.min(1, dt * 4)
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 70, 100)
            for(let y = Math.max(0, Math.floor(cam) - 4); y < cam + 11; y++){
                let l2 = L(y), py = 78 - (y - cam) * U
                ctx.fillStyle = l2.k == 'road' ? '#2b2b30' : l2.k == 'river' ? '#0e4a8a' : (y % 2 ? '#1f6b3a' : '#24793f'); ctx.fillRect(0, py, 70, U + .3)
                if(l2.k == 'road'){ ctx.fillStyle = 'rgba(255,255,255,.2)'; for(let x = 0; x < 7; x++) ctx.fillRect(x * 10 + 2, py + 4.6, 5, .8) }
                if(l2.trees) l2.trees.forEach(x => { ctx.fillStyle = '#0f4a25'; rr(ctx, x * U + 1.5, py + 1, 7, 8, 2); ctx.fill(); ctx.fillStyle = '#17803a'; ctx.beginPath(); ctx.arc(x * U + 5, py + 4, 3.6, 0, 7); ctx.fill() })
                if(l2.cars) l2.cars.forEach(c => { let cx = c.x * U; if(l2.k == 'river'){ ctx.fillStyle = '#8b5a2b'; rr(ctx, cx, py + 2, c.w * U, U - 4, 2); ctx.fill() } else { ctx.fillStyle = ['#FF375F', '#FF9F0A', '#64D2FF', '#BF5AF2'][y % 4]; rr(ctx, cx, py + 2, c.w * U, U - 4, 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(cx + (l2.sp > 0 ? c.w * U - 3 : 1), py + 3.5, 2, U - 7) } })
            }
            let sx = me.fx * U + 5, sy = 78 - (me.fy - cam) * U + 5 - (me.hop ? 3 : 0)
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sx, sy + 3.5, 3.5, 1.5, 0, 0, 7); ctx.fill()
            ctx.fillStyle = '#fff'; rr(ctx, sx - 3.2, sy - 3.5, 6.4, 7, 2.4); ctx.fill(); ctx.fillStyle = C.red; ctx.fillRect(sx - .7, sy - 5, 1.4, 1.6); ctx.fillStyle = C.orange; ctx.fillRect(sx - .8, sy - 1.8, 1.6, 1.4); ctx.fillStyle = '#000'; ctx.fillRect(sx - 1.9, sy - 2.6, .9, .9); ctx.fillRect(sx + 1, sy - 2.6, .9, .9)
        })
    }
},
{
    id: 'frogger', title: 'Frogger', emoji: '🐸', c1: '#30D158', c2: '#0A84FF', size: [100, 100], swipe: true, pad: true, hint: 'Cross the road and the river · fill all five homes',
    start(env){
        const {ctx} = env.canvas(), U = 100 / 13
        // rows 1-5 river, 6 safe, 7-11 road, 12 start, 0 homes
        let rows = [], f, homes = [0, 0, 0, 0, 0], lives = 3, time = 40, t = 0
        for(let r = 1; r <= 11; r++){ if(r == 6) continue; let river = r < 6, sp = (river ? 4 : 5) + r % 3 * 2.2 + Math.random() * 1.5, dir = r % 2 ? 1 : -1, n = river ? 3 : 3 + (r % 2), w = river ? 3.2 - (r % 2) * .6 : 1.4 + (r % 3) * .35; rows[r] = {river, sp: sp * dir, w, items: Array.from({length: n}, (_, i) => i * (13 / n) + Math.random())} }
        const spawn = () => { f = {x: 6, y: 12}; time = 40 }
        spawn()
        env.on('press', k => {
            let d = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]}[k]; if(!d) return
            f.x = Math.max(0, Math.min(12, Math.round(f.x) + d[0])); f.y = Math.max(0, Math.min(12, f.y + d[1])); env.sfx('tap')
            if(d[1] < 0 && f.y < (f.top || 12)){ f.top = f.y; env.score(10, 1) }
            if(f.y == 0){ let h = Math.floor((f.x + 1) / 2.6); if(h > 4 || homes[h] || f.x < .2) return die(); homes[h] = 1; env.score(100 + Math.floor(time) * 3, 1); env.sfx('win'); if(homes.every(Boolean)){ homes = [0, 0, 0, 0, 0]; env.score(500, 1) } spawn() }
        })
        const die = () => { lives--; env.sfx('bad'); if(!lives) env.over(`${env.points} points`); else spawn() }
        env.loop(dt => {
            t += dt; time -= dt
            rows.forEach(r => r && r.items.forEach((x, i) => { r.items[i] = (x + r.sp * dt + 16 + r.w) % (13 + r.w + 3) - r.w - 1.5 }))
            let r = rows[f.y]
            if(r){
                let on = r.items.some(x => f.x + .5 > x && f.x + .5 < x + r.w)
                if(r.river){ if(on) f.x += r.sp * dt; else return die() } else if(on) return die()
                if(f.x < -.3 || f.x > 12.3) return die()
            }
            if(time <= 0) return die()
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 100)
            ctx.fillStyle = '#0e4a8a'; ctx.fillRect(0, U, 100, U * 5); ctx.fillStyle = '#2b2b30'; ctx.fillRect(0, U * 7, 100, U * 5); ctx.fillStyle = '#1f6b3a'; ctx.fillRect(0, U * 6, 100, U); ctx.fillRect(0, U * 12, 100, U); ctx.fillRect(0, 0, 100, U)
            for(let i = 0; i < 5; i++){ ctx.fillStyle = homes[i] ? C.lime : '#0b3a1c'; rr(ctx, (i * 2.6 + .5) * U, 1, 2 * U, U - 2, 2); ctx.fill(); if(homes[i]) text(ctx, '🐸', (i * 2.6 + 1.5) * U, U / 2, 5) }
            rows.forEach((r, y) => r && r.items.forEach(x => {
                if(r.river){ ctx.fillStyle = y % 2 ? '#8b5a2b' : '#6b4423'; rr(ctx, x * U, y * U + 1.2, r.w * U, U - 2.4, 2.5); ctx.fill() }
                else { ctx.fillStyle = ['#FF375F', '#FF9F0A', '#64D2FF', '#BF5AF2', '#FFD60A'][y % 5]; rr(ctx, x * U, y * U + 1.4, r.w * U, U - 2.8, 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(x * U + (r.sp > 0 ? r.w * U - 2 : .5), y * U + 2.4, 1.4, U - 4.8) }
            }))
            text(ctx, '🐸', (f.x + .5) * U, (f.y + .5) * U + .5, 6)
            ctx.fillStyle = time < 8 ? C.red : C.lime; ctx.fillRect(2, 98.6, time / 40 * 60, 1); text(ctx, '❤'.repeat(lives), 98, 98, 3, C.red, 'right')
        })
    }
},
{
    id: 'tower', title: 'Tower Blocks', emoji: '🏗️', c1: '#FF9F0A', c2: '#FF375F', size: [60, 100], pad: true, hint: 'OK or tap to drop · line the blocks up',
    start(env){
        const {cv, ctx} = env.canvas()
        let stack = [{x: 15, w: 30}], cur, h = 0, cam = 0, falling = [], dirv = 1, t = 0
        const make = () => { let top = stack[stack.length - 1]; cur = {x: -top.w, w: top.w, dir: 1, sp: 28 + h * 1.4} }
        make()
        const drop = () => {
            let top = stack[stack.length - 1], l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ov = r - l
            if(ov <= .4){ falling.push({x: cur.x, w: cur.w, y: 0, v: 0}); return env.after(() => env.over(`${h} floors`), 600) }
            let perfect = Math.abs(cur.x - top.x) < 1
            if(perfect){ ov = top.w; l = top.x; env.sfx('win'); env.score(30, 1) } else { env.sfx('tap'); env.score(10, 1); if(cur.x < top.x) falling.push({x: cur.x, w: top.x - cur.x, y: 0, v: 0}); else falling.push({x: r, w: cur.x + cur.w - r, y: 0, v: 0}) }
            h++; stack.push({x: l, w: ov}); make()
        }
        env.on('press', k => (k == 'ok' || k == 'up' || k == 'down') && cur && drop())
        cv.addEventListener('pointerdown', () => cur && drop())
        env.loop(dt => {
            t += dt
            cur.x += cur.dir * cur.sp * dt; if(cur.x < -cur.w * .5){ cur.dir = 1 } if(cur.x + cur.w > 60 + cur.w * .5){ cur.dir = -1 }
            cam += (Math.max(0, h - 6) - cam) * Math.min(1, dt * 3)
            falling.forEach(f => { f.v += 200 * dt; f.y += f.v * dt }); falling = falling.filter(f => f.y < 120)
            let g = ctx.createLinearGradient(0, 0, 0, 100); g.addColorStop(0, `hsl(${220 + h * 4} 55% 18%)`); g.addColorStop(1, '#0c0c0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 60, 100); stars(ctx, 60, 100, t)
            const by = i => 92 - (i - cam) * 6.4, col = i => `hsl(${(i * 22) % 360} 75% 58%)`
            stack.forEach((b, i) => { ctx.fillStyle = col(i); rr(ctx, b.x, by(i), b.w, 6, 1); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(b.x + .5, by(i) + .4, b.w - 1, 1) })
            falling.forEach(f => { ctx.fillStyle = col(stack.length); rr(ctx, f.x, by(stack.length - 1) + f.y, f.w, 6, 1); ctx.fill() })
            if(cur){ ctx.fillStyle = col(stack.length); glow(ctx, col(stack.length), 6); rr(ctx, cur.x, by(stack.length), cur.w, 6, 1); ctx.fill(); noglow(ctx) }
            text(ctx, h, 30, 10, 9)
        })
    }
},
{
    id: 'archery', title: 'Archery', emoji: '🏹', c1: '#FF9F0A', c2: '#30D158', size: [100, 70], pad: true, hint: 'Aim drifts · OK / tap to loose an arrow · 10 arrows',
    start(env){
        const {cv, ctx} = env.canvas()
        let arrows = [], n = 10, t = 0, amp = 1, flash = 0, last = ''
        const R = [{r: 3, c: '#FFD60A', p: 10}, {r: 6, c: '#FF375F', p: 8}, {r: 9, c: '#0A84FF', p: 6}, {r: 12, c: '#1c1c1e', p: 4}, {r: 15, c: '#f2f2f7', p: 2}]
        const pos = () => ({x: 50 + Math.sin(t * 1.7) * 11 * amp + Math.sin(t * 3.1) * 3, y: 35 + Math.cos(t * 1.3) * 9 * amp + Math.sin(t * 2.3) * 3})
        const shoot = () => {
            if(!n) return; n--
            let a = pos(), d = Math.hypot(a.x - 78, a.y - 35), ring = R.find(r => d <= r.r), pts = ring ? ring.p : 0
            arrows.push({x: a.x, y: a.y}); env.score(pts, 1); last = pts ? `+${pts}` : 'Miss'; flash = .8; env.sfx(pts > 7 ? 'win' : pts ? 'good' : 'bad'); amp = Math.min(1.8, amp + .08)
            if(!n) env.after(() => env.over(`${env.points} / 100`, env.points > 60), 900)
        }
        env.on('press', k => k == 'ok' && shoot())
        cv.addEventListener('pointerdown', shoot)
        env.loop(dt => {
            t += dt; flash -= dt
            let g = ctx.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, '#1d3b2b'); g.addColorStop(1, '#0c0c0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 100, 70)
            ctx.fillStyle = '#4a3320'; ctx.fillRect(77, 48, 2, 22)
            ;[...R].reverse().forEach(r => { ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(78, 35, r.r, 0, 7); ctx.fill() })
            ctx.strokeStyle = '#fff'; ctx.lineWidth = .4; arrows.forEach(a => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - 9, a.y + 2.4); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a.x, a.y, .7, 0, 7); ctx.fill() })
            if(n){ let p = pos(); ctx.strokeStyle = C.lime; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4); ctx.stroke() }
            text(ctx, '🏹'.repeat(Math.min(n, 10)), 3, 66, 3.4, '#fff', 'left'); if(flash > 0){ ctx.globalAlpha = Math.min(1, flash * 2); text(ctx, last, 50, 12, 9, C.lime); ctx.globalAlpha = 1 }
        })
    }
},
{
    id: 'maze', title: 'Tilting Maze', emoji: '🔮', c1: '#5E5CE6', c2: '#BF5AF2', size: [100, 100], pad: true, hint: 'Arrows tilt the board (or tilt your phone) · roll to the green goal',
    start(env){
        const {ctx} = env.canvas()
        let level = 1, N, cells, walls, ball, goal, tilt = {x: 0, y: 0}, U
        function gen(){
            N = 6 + level * 2; if(N > 18) N = 18; U = 100 / N
            walls = Array.from({length: N * N}, () => ({r: 1, b: 1})); let seen = new Set([0]), st = [0]
            while(st.length){ let c = st[st.length - 1], x = c % N, y = (c / N) | 0, o = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([X, Y]) => X >= 0 && X < N && Y >= 0 && Y < N && !seen.has(Y * N + X)); if(!o.length){ st.pop(); continue } let [X, Y, dx, dy] = env.pick(o); if(dx == 1) walls[c].r = 0; if(dx == -1) walls[Y * N + X].r = 0; if(dy == 1) walls[c].b = 0; if(dy == -1) walls[Y * N + X].b = 0; seen.add(Y * N + X); st.push(Y * N + X) }
            for(let i = 0; i < N; i++){ let c = env.rnd(N * N); if(c % N < N - 1 && Math.random() < .5) walls[c].r = 0 } // a few loops
            ball = {x: U / 2, y: U / 2, vx: 0, vy: 0, r: U * .28}; goal = {x: N - .5, y: N - .5}
        }
        gen()
        const wallAt = (cx, cy, side) => cx < 0 || cy < 0 || cx >= N || cy >= N ? true : false
        const rects = () => { let rs = []; for(let i = 0; i < N * N; i++){ let x = i % N, y = (i / N) | 0; if(walls[i].r) rs.push([(x + 1) * U - .7, y * U - .7, 1.4, U + 1.4]); if(walls[i].b) rs.push([x * U - .7, (y + 1) * U - .7, U + 1.4, 1.4]) } rs.push([-1.4, -1.4, 1.4, 102.8], [100, -1.4, 1.4, 102.8], [-1.4, -1.4, 102.8, 1.4], [-1.4, 100, 102.8, 1.4]); return rs }
        let R = rects()
        let off
        if(window.DeviceOrientationEvent){
            const on = e => { if(e.gamma != null){ tilt.x = Math.max(-1, Math.min(1, e.gamma / 25)); tilt.y = Math.max(-1, Math.min(1, (e.beta - 40) / 25)); tilt.dev = 1 } }
            window.addEventListener('deviceorientation', on)
            off = () => window.removeEventListener('deviceorientation', on)
        }
        env.loop(dt => {
            let tx = tilt.dev ? tilt.x : (env.held.right ? 1 : 0) - (env.held.left ? 1 : 0), ty = tilt.dev ? tilt.y : (env.held.down ? 1 : 0) - (env.held.up ? 1 : 0)
            ball.vx += tx * 140 * dt; ball.vy += ty * 140 * dt; ball.vx *= 1 - 2.4 * dt; ball.vy *= 1 - 2.4 * dt
            for(let s = 0; s < 3; s++){
                ball.x += ball.vx * dt / 3; ball.y += ball.vy * dt / 3
                R.forEach(([x, y, w, h]) => { let cx = Math.max(x, Math.min(ball.x, x + w)), cy = Math.max(y, Math.min(ball.y, y + h)), dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy); if(d < ball.r){ let nx = d ? dx / d : 1, ny = d ? dy / d : 0; ball.x = cx + nx * ball.r; ball.y = cy + ny * ball.r; let vn = ball.vx * nx + ball.vy * ny; if(vn < 0){ ball.vx -= 1.5 * vn * nx; ball.vy -= 1.5 * vn * ny } } })
            }
            if(Math.hypot(ball.x - goal.x * U, ball.y - goal.y * U) < U * .45){ env.score(level * 100, 1); env.sfx('win'); level++; gen(); R = rects() }
            ctx.fillStyle = '#14141a'; ctx.fillRect(0, 0, 100, 100)
            ctx.fillStyle = '#5E5CE6'; R.forEach(([x, y, w, h]) => { rr(ctx, x, y, w, h, .7); ctx.fill() })
            glow(ctx, C.green, 10); ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(goal.x * U, goal.y * U, U * .3, 0, 7); ctx.fill(); noglow(ctx)
            let g = ctx.createRadialGradient(ball.x - ball.r / 3, ball.y - ball.r / 3, 0, ball.x, ball.y, ball.r); g.addColorStop(0, '#fff'); g.addColorStop(1, '#BF5AF2'); ctx.fillStyle = g; glow(ctx, '#BF5AF2', 8); ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill(); noglow(ctx)
            text(ctx, 'Level ' + level, 98, 2.4, 2.6, C.dim, 'right')
        })
        return () => off && off()
    }
},
{
    id: 'insects', title: 'Insect Catch', emoji: '🐞', c1: '#FF453A', c2: '#30D158', size: [100, 70], pad: true, hint: 'Tap the bugs before they vanish · arrows + OK on a remote',
    start(env){
        const {cv, ctx} = env.canvas()
        let bugs = [], left = 30, spawn = 0, t = 0
        const a = aimer(env, cv, 100, 70, (x, y) => {
            let b = bugs.find(b => Math.hypot(b.x - x, b.y - y) < 6); if(b){ bugs.splice(bugs.indexOf(b), 1); env.score(10 + Math.max(0, (b.life * 4) | 0), 1); env.sfx('pop'); pops.push({x: b.x, y: b.y, t: .4}) } else env.sfx('bad')
        })
        let pops = []
        env.timer(() => { left--; if(left <= 0) env.over(`${env.points} points`, true) }, 1000)
        env.loop(dt => {
            t += dt; spawn -= dt; a.step(dt)
            if(spawn <= 0){ bugs.push({x: env.rnd(8, 92), y: env.rnd(10, 62), e: env.pick(['🐞', '🐜', '🪲', '🪰', '🦗', '🐛']), life: env.rnd(1.2, 2.4), r: env.rnd(6.28)}); spawn = Math.max(.25, .8 - t / 60) }
            bugs.forEach(b => { b.life -= dt; b.x += Math.cos(b.r) * 8 * dt; b.y += Math.sin(b.r) * 8 * dt; if(Math.random() < dt) b.r += env.rnd(-1.5, 1.5) }); bugs = bugs.filter(b => b.life > 0 && b.x > 3 && b.x < 97 && b.y > 5 && b.y < 67)
            pops.forEach(p => p.t -= dt); pops = pops.filter(p => p.t > 0)
            ctx.fillStyle = '#14301e'; ctx.fillRect(0, 0, 100, 70)
            ctx.fillStyle = 'rgba(255,255,255,.04)'; for(let i = 0; i < 40; i++) ctx.fillRect((i * 37) % 100, (i * 17) % 70, 8, .6)
            bugs.forEach(b => { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r + Math.PI / 2); ctx.globalAlpha = Math.min(1, b.life * 2); text(ctx, b.e, 0, 0, 7); ctx.restore() })
            pops.forEach(p => { ctx.globalAlpha = p.t * 2.5; ctx.strokeStyle = C.lime; ctx.beginPath(); ctx.arc(p.x, p.y, 8 - p.t * 10, 0, 7); ctx.stroke(); ctx.globalAlpha = 1 })
            text(ctx, left + 's', 50, 4, 4, C.dim); a.draw(ctx)
        })
    }
},
{
    id: 'shapes', title: 'Shape Clicker', emoji: '🔷', c1: '#0A84FF', c2: '#BF5AF2', size: [100, 70], pad: true, hint: 'Hit shapes before they shrink away · small ones score more',
    start(env){
        const {cv, ctx} = env.canvas()
        let sh = [], left = 30, sp = 0, t = 0, combo = 0
        const a = aimer(env, cv, 100, 70, (x, y) => {
            let s = sh.filter(s => Math.hypot(s.x - x, s.y - y) < s.r + 1).sort((p, q) => p.r - q.r)[0]
            if(s){ sh.splice(sh.indexOf(s), 1); combo++; env.score(Math.round((14 - s.r) * 2 * (1 + Math.min(combo, 8) / 8)), 1); env.sfx('pop') } else { combo = 0; env.sfx('bad') }
        })
        env.timer(() => { left--; if(left <= 0) env.over(`${env.points} points`, true) }, 1000)
        env.loop(dt => {
            t += dt; sp -= dt; a.step(dt)
            if(sp <= 0){ sh.push({x: env.rnd(10, 90), y: env.rnd(12, 60), r: env.rnd(7, 13), k: env.rnd(3), c: env.pick([C.pink, C.blue, C.orange, C.green, C.purple, C.teal, C.yellow]), life: 2.2}); sp = Math.max(.3, .7 - t / 80) }
            sh.forEach(s => { s.life -= dt; s.r = Math.max(0, s.r - dt * 1.5) }); sh = sh.filter(s => s.life > 0 && s.r > 1.2)
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 70)
            sh.forEach(s => { ctx.fillStyle = s.c; glow(ctx, s.c, 8); ctx.beginPath(); if(s.k == 0) ctx.arc(s.x, s.y, s.r, 0, 7); else if(s.k == 1) rr(ctx, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2, s.r * .25); else { ctx.moveTo(s.x, s.y - s.r); ctx.lineTo(s.x + s.r, s.y + s.r * .8); ctx.lineTo(s.x - s.r, s.y + s.r * .8); ctx.closePath() } ctx.fill(); noglow(ctx) })
            text(ctx, left + 's', 50, 4, 4, C.dim); if(combo > 1) text(ctx, `x${combo}`, 6, 4, 3.4, C.lime, 'left'); a.draw(ctx)
        })
    }
},
{
    id: 'slicer', title: 'Fruit Slicer', emoji: '🍉', c1: '#FF375F', c2: '#FFD60A', size: [100, 70], pad: true, hint: 'Swipe through fruit · avoid bombs · three misses and it is over',
    start(env){
        const {cv, ctx} = env.canvas()
        let fr = [], halves = [], trail = [], lives = 3, sp = 0, t = 0, cur = {x: 50, y: 35, down: 0}
        const kinds = ['🍉', '🍊', '🍎', '🍍', '🥝', '🍋', '🍓']
        const cut = (x0, y0, x1, y1) => fr.forEach(f => {
            if(f.dead) return
            let d = Math.hypot(x1 - x0, y1 - y0) || 1, u = ((f.x - x0) * (x1 - x0) + (f.y - y0) * (y1 - y0)) / d / d, px = x0 + (x1 - x0) * Math.max(0, Math.min(1, u)), py = y0 + (y1 - y0) * Math.max(0, Math.min(1, u))
            if(Math.hypot(f.x - px, f.y - py) < 6){ f.dead = 1; if(f.bomb){ env.sfx('bad'); env.over(`${env.points} points`) } else { env.score(10, 1); env.sfx('pop'); halves.push({...f, vx: f.vx - 12, vr: -3, h: 0}, {...f, vx: f.vx + 12, vr: 3, h: 1}) } }
        })
        cv.addEventListener('pointerdown', e => { let p = cv.pt(e); cur = {x: p.x, y: p.y, down: 1}; trail = [p] })
        cv.addEventListener('pointermove', e => { if(!cur.down && e.buttons == 0) return; let p = cv.pt(e); cut(cur.x, cur.y, p.x, p.y); cur.x = p.x; cur.y = p.y; trail.push(p); if(trail.length > 10) trail.shift() })
        window.addEventListener('pointerup', () => cur.down = 0)
        env.on('press', k => { if(k == 'ok') cur.kb = 1 })
        env.loop(dt => {
            t += dt; sp -= dt
            // remote: the cursor moves with arrows and slices while OK is held
            let mx = (env.held.right ? 1 : 0) - (env.held.left ? 1 : 0), my = (env.held.down ? 1 : 0) - (env.held.up ? 1 : 0)
            if(mx || my){ let nx = Math.max(0, Math.min(100, cur.x + mx * 110 * dt)), ny = Math.max(0, Math.min(70, cur.y + my * 110 * dt)); cut(cur.x, cur.y, nx, ny); cur.x = nx; cur.y = ny; trail.push({x: nx, y: ny}); if(trail.length > 10) trail.shift() } else if(trail.length && !cur.down) trail.shift()
            if(sp <= 0){ let n = 1 + (Math.random() < .35); for(let i = 0; i < n; i++){ let bomb = Math.random() < .16 + Math.min(.1, t / 400); fr.push({x: env.rnd(15, 85), y: 76, vx: env.rnd(-12, 12), vy: -env.rnd(58, 78), r: 0, vr: env.rnd(-2, 2), e: bomb ? '💣' : env.pick(kinds), bomb}) } sp = Math.max(.7, 1.4 - t / 60) }
            fr.forEach(f => { f.vy += 70 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.vr * dt; if(f.y > 78 && f.vy > 0 && !f.dead){ f.dead = 1; if(!f.bomb){ lives--; env.sfx('bad'); if(lives <= 0) env.over(`${env.points} points`) } } })
            fr = fr.filter(f => !f.dead)
            halves.forEach(h => { h.vy += 70 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += h.vr * dt }); halves = halves.filter(h => h.y < 80)
            let g = ctx.createLinearGradient(0, 0, 0, 70); g.addColorStop(0, '#2a1630'); g.addColorStop(1, '#0c0c0f'); ctx.fillStyle = g; ctx.fillRect(0, 0, 100, 70)
            fr.forEach(f => { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.r); text(ctx, f.e, 0, 0, 9); ctx.restore() })
            halves.forEach(h => { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.r); ctx.beginPath(); ctx.rect(h.h ? 0 : -9, -9, 9, 18); ctx.clip(); text(ctx, h.e, 0, 0, 9); ctx.restore() })
            if(trail.length > 1){ ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; for(let i = 1; i < trail.length; i++){ ctx.globalAlpha = i / trail.length; ctx.lineWidth = i / trail.length * 1.8; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke() } ctx.globalAlpha = 1 }
            text(ctx, '❤'.repeat(Math.max(0, lives)), 97, 4, 3.4, C.red, 'right')
        })
    }
},
{
    id: 'emoji', title: 'Emoji Catcher', emoji: '😎', c1: '#FFD60A', c2: '#FF9F0A', size: [70, 100], pad: true, hint: 'Slide the basket · catch the good, dodge the bombs',
    start(env){
        const {cv, ctx} = env.canvas()
        let bx = 35, items = [], lives = 3, sp = 0, t = 0
        const good = ['😀', '😍', '🥳', '🤩', '😎', '⭐', '💎', '🍕']
        const move = steer(env, cv, 80, x => bx = x)
        env.loop(dt => {
            t += dt; sp -= dt; bx = Math.max(7, Math.min(63, bx + move(dt)))
            if(sp <= 0){ let bad = Math.random() < .22 + Math.min(.15, t / 200); items.push({x: env.rnd(6, 64), y: -4, v: env.rnd(22, 34) + t / 5, e: bad ? '💣' : env.pick(good), bad}); sp = Math.max(.35, .85 - t / 90) }
            items.forEach(i => i.y += i.v * dt)
            items = items.filter(i => {
                if(i.y > 86 && i.y < 94 && Math.abs(i.x - bx) < 8){ if(i.bad){ lives--; env.sfx('bad'); if(!lives) env.over(`${env.points} points`) } else { env.score(10, 1); env.sfx('good') } return false }
                if(i.y > 104){ return false }
                return true
            })
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 70, 100)
            let g = ctx.createRadialGradient(35, 100, 0, 35, 100, 80); g.addColorStop(0, 'rgba(255,214,10,.16)'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(0, 0, 70, 100)
            items.forEach(i => text(ctx, i.e, i.x, i.y, 8))
            ctx.fillStyle = C.lime; ctx.beginPath(); ctx.moveTo(bx - 8, 87); ctx.lineTo(bx + 8, 87); ctx.lineTo(bx + 6, 95); ctx.quadraticCurveTo(bx, 97, bx - 6, 95); ctx.closePath(); ctx.fill()
            text(ctx, '❤'.repeat(lives), 3, 4, 3.4, C.red, 'left')
        })
    }
},
{
    id: 'mole', title: 'Whack-A-Mole', emoji: '🔨', c1: '#A2845E', c2: '#30D158', size: [100, 100], pad: true, hint: 'Hit the moles as they pop up · 30 seconds',
    start(env){
        let left = 30, up = new Set(), g = env.grid(3, 3, c => { c.style.cssText += ';font-size:4.6em;background:radial-gradient(ellipse at 50% 80%,#2a1f14,#14100b 70%);border-radius:50%/40%;overflow:hidden' }, hitCell, {css: 'gap:1em;padding:1em'}), t = 0
        function hitCell(i){
            if(up.has(i)){ up.delete(i); g.cells[i].textContent = '💥'; env.score(10, 1); env.sfx('pop'); env.after(() => g.cells[i].textContent = '', 200) } else env.sfx('bad')
        }
        function pop(){
            let free = [...Array(9).keys()].filter(i => !up.has(i)); if(!free.length) return
            let i = env.pick(free); up.add(i); g.cells[i].textContent = '🐹'
            env.after(() => { if(up.delete(i)) g.cells[i].textContent = '' }, Math.max(500, 1100 - t * 12))
        }
        env.timer(() => { left--; t++; if(left <= 0) env.over(`${env.points} points`, true) }, 1000)
        env.timer(pop, 520)
        env.el.insertAdjacentHTML('afterbegin', '<div style="position:absolute;left:0;right:0;top:1.5%;text-align:center;opacity:.5;z-index:2" class="mole-t">30s</div>')
        env.timer(() => { let e = env.el.querySelector('.mole-t'); if(e) e.textContent = left + 's' }, 250)
    }
},
{
    id: 'wordrain', title: 'Word Rain', emoji: '🌧️', c1: '#64D2FF', c2: '#5E5CE6', size: [70, 100], hint: 'Type the falling words before they hit the ground · Enter clears the field',
    start(env){
        const {ctx} = env.canvas()
        const POOL = 'moon star fire wind rain snow wave leaf rose lake rock gold wolf bear frog bird jump play game cake road tree ship apple brave candy dream eagle flame ghost heart ivory joker lemon magic night ocean pearl queen river storm tiger whale bridge castle dragon flower garden hunter island jungle knight marble nature orange planet rocket silver tunnel violet window'.split(' ')
        let words = [], sp = 0, t = 0, lives = 3, inp = env.input('Type a word')
        const target = () => { let v = inp.value.trim().toLowerCase(); return v && words.filter(w => w.t.startsWith(v)).sort((a, b) => b.y - a.y)[0] }
        inp.oninput = () => {
            let v = inp.value.trim().toLowerCase(), w = words.find(w => w.t == v)
            if(w){ words.splice(words.indexOf(w), 1); env.score(w.t.length * 10, 1); env.sfx('pop'); inp.value = '' }
        }
        env.loop(dt => {
            t += dt; sp -= dt
            if(sp <= 0){ words.push({t: env.pick(POOL), x: env.rnd(12, 58), y: -3, v: env.rnd(7, 10) + t / 14}); sp = Math.max(.9, 2.4 - t / 40) }
            words.forEach(w => w.y += w.v * dt)
            words = words.filter(w => { if(w.y > 86){ lives--; env.sfx('bad'); inp.value = ''; if(lives <= 0) env.over(`${env.points} points`); return false } return true })
            let tg = target()
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 70, 100)
            let g = ctx.createLinearGradient(0, 80, 0, 100); g.addColorStop(0, 'transparent'); g.addColorStop(1, 'rgba(255,55,95,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 80, 70, 20)
            words.forEach(w => { let typed = tg === w ? inp.value.trim().length : 0; ctx.font = '700 4.6px -apple-system, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let tw = ctx.measureText(w.t).width; ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(ctx, w.x - tw / 2 - 1.6, w.y - 3, tw + 3.2, 6, 3); ctx.fill(); ctx.textAlign = 'left'; ctx.fillStyle = C.lime; ctx.fillText(w.t.slice(0, typed), w.x - tw / 2, w.y); ctx.fillStyle = '#fff'; ctx.fillText(w.t.slice(typed), w.x - tw / 2 + ctx.measureText(w.t.slice(0, typed)).width, w.y) })
            text(ctx, '❤'.repeat(lives), 3, 4, 3.4, C.red, 'left')
        })
    }
},
{
    id: 'bubbles', title: 'Bubble Shooter', emoji: '🫧', c1: '#64D2FF', c2: '#BF5AF2', size: [70, 100], pad: true, hint: 'Left / right or drag to aim · OK to shoot · match three',
    start(env){
        const {cv, ctx} = env.canvas(), R = 3.5, W = 10, COL = [C.red, C.blue, C.green, C.yellow, C.purple, C.orange]
        let grid = [], ang = -Math.PI / 2, shot = null, cur = env.rnd(4), next = env.rnd(4), shots = 0, drop = 0
        const cx = (r, c) => R + c * R * 2 + (r % 2 ? R : 0), cy = r => R + r * R * 1.75 + drop * R * 1.75
            for(let r = 0; r < 6; r++) grid.push(Array.from({length: W}, (_, c) => r % 2 && c == W - 1 ? -1 : env.rnd(5)))
        const nbs = (r, c) => (r % 2 ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]).map(([dr, dc]) => [r + dr, c + dc]).filter(([r2, c2]) => r2 >= 0 && c2 >= 0 && c2 < (r2 % 2 ? W - 1 : W) && r2 < grid.length)
        const val = (r, c) => grid[r] && grid[r][c] != null && grid[r][c] >= 0 ? grid[r][c] : -1
        const fire = () => { if(shot) return; shot = {x: 35, y: 93, vx: Math.cos(ang) * 130, vy: Math.sin(ang) * 130, c: cur}; cur = next; next = env.rnd(5); env.sfx('tap') }
        env.on('press', k => k == 'ok' && fire())
        cv.addEventListener('pointermove', e => { let p = cv.pt(e); ang = Math.max(-3, Math.min(-.14, Math.atan2(p.y - 93, p.x - 35))) })
        cv.addEventListener('pointerdown', e => { let p = cv.pt(e); ang = Math.max(-3, Math.min(-.14, Math.atan2(p.y - 93, p.x - 35))); fire() })
        function land(){
            let best = null
            for(let r = 0; r <= grid.length; r++) for(let c = 0; c < (r % 2 ? W - 1 : W); c++){ if(grid[r] && grid[r][c] >= 0) continue; let d = Math.hypot(cx(r, c) - shot.x, cy(r) - shot.y); if(d < R * 1.3 && (!best || d < best.d) && (r == 0 || nbs(r, c).some(([a, b]) => val(a, b) >= 0))) best = {r, c, d} }
            if(!best) return false
            while(grid.length <= best.r) grid.push(Array(W).fill(-1))
            grid[best.r][best.c] = shot.c
            let seen = new Set([best.r * 99 + best.c]), st = [[best.r, best.c]]
            while(st.length){ let [r, c] = st.pop(); nbs(r, c).forEach(([a, b]) => { if(val(a, b) == shot.c && !seen.has(a * 99 + b)){ seen.add(a * 99 + b); st.push([a, b]) } }) }
            if(seen.size >= 3){ seen.forEach(k => grid[(k / 99) | 0][k % 99] = -1); env.score(seen.size * 10, 1); env.sfx('pop')
                let anch = new Set(), q = []; for(let c = 0; c < W; c++) if(val(0, c) >= 0){ anch.add(c); q.push([0, c]) }
                while(q.length){ let [r, c] = q.pop(); nbs(r, c).forEach(([a, b]) => { if(val(a, b) >= 0 && !anch.has(a * 99 + b)){ anch.add(a * 99 + b); q.push([a, b]) } }) }
                grid.forEach((row, r) => row.forEach((v, c) => { if(v >= 0 && !anch.has(r * 99 + c) && !(r == 0)){ grid[r][c] = -1; env.score(15, 1) } }))
            } else if(++shots % 5 == 0){ grid.unshift(Array.from({length: W}, () => env.rnd(5))); grid.forEach((row, r) => { if(r % 2) row[W - 1] = -1 }) }
            return true
        }
        env.loop(dt => {
            ang = Math.max(-3, Math.min(-.14, ang + ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * 1.8 * dt))
            if(shot){
                shot.x += shot.vx * dt; shot.y += shot.vy * dt
                if(shot.x < R){ shot.x = R; shot.vx *= -1 } if(shot.x > 70 - R){ shot.x = 70 - R; shot.vx *= -1 }
                let hitTop = shot.y < cy(0) + R * .2, hitB = grid.some((row, r) => row.some((v, c) => v >= 0 && Math.hypot(cx(r, c) - shot.x, cy(r) - shot.y) < R * 1.75))
                if(hitTop || hitB){ if(!land()){ shot = null } else shot = null }
                while(grid.length && grid[grid.length - 1].every(v => v < 0)) grid.pop()
                if(!grid.length){ env.score(200, 1); env.sfx('win'); for(let r = 0; r < 5; r++) grid.push(Array.from({length: W}, (_, c) => r % 2 && c == W - 1 ? -1 : env.rnd(5))) }
                if(grid.some((row, r) => row.some(v => v >= 0) && cy(r) > 80)) return env.over(`${env.points} points`)
            }
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 70, 100)
            grid.forEach((row, r) => row.forEach((v, c) => { if(v < 0 || (r % 2 && c >= W - 1)) return; let x = cx(r, c), y = cy(r); let g = ctx.createRadialGradient(x - 1, y - 1, .3, x, y, R); g.addColorStop(0, '#fff'); g.addColorStop(.25, COL[v]); g.addColorStop(1, COL[v]); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R - .2, 0, 7); ctx.fill() }))
            ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.setLineDash([1, 2]); ctx.beginPath(); ctx.moveTo(0, 80); ctx.lineTo(70, 80); ctx.stroke(); ctx.setLineDash([])
            ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(35, 93); ctx.lineTo(35 + Math.cos(ang) * 14, 93 + Math.sin(ang) * 14); ctx.stroke()
            let bub = (x, y, c) => { let g = ctx.createRadialGradient(x - 1, y - 1, .3, x, y, R); g.addColorStop(0, '#fff'); g.addColorStop(.25, COL[c]); g.addColorStop(1, COL[c]); ctx.fillStyle = g; glow(ctx, COL[c], 6); ctx.beginPath(); ctx.arc(x, y, R - .2, 0, 7); ctx.fill(); noglow(ctx) }
            if(shot) bub(shot.x, shot.y, shot.c); else bub(35, 93, cur); bub(8, 94, next); text(ctx, 'next', 8, 88, 2.4, C.dim)
        })
    }
},
]

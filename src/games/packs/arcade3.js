// Real-time canvas games, part 3: first-person and side-on action in the TV's black, white and lime.
// Astray and Hook Racer draw their 3D with a raycaster and a projected road on a plain 2D canvas, so no engine or asset is loaded.
import {C, rr, text, glow, noglow} from '../draw'

const W = 100, H = 56

// a maze of n × n rooms as a grid of walls (1) and floor (0), carved by a depth-first walk
export function maze(n, rnd = Math.random){
    const size = n * 2 + 1, g = Array.from({length: size}, () => Array(size).fill(1)), stack = [[1, 1]]

    g[1][1] = 0

    while(stack.length){
        const [x, y] = stack[stack.length - 1]
        const next = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] === 1).sort(() => rnd() - .5)

        if(!next.length){ stack.pop(); continue }

        const [dx, dy] = next[0]

        g[y + dy / 2][x + dx / 2] = 0
        g[y + dy][x + dx] = 0
        stack.push([x + dx, y + dy])
    }

    return g
}

export default [
{
    id: 'astray', title: 'Astray', emoji: '🧭', c1: '#8E8E93', c2: '#2C2C2E', size: [W, H], pad: true, hint: 'Up / down to walk · left / right to turn · find the lime light',
    start(env){
        const {ctx} = env.canvas()
        let level = 0, grid, px, py, ang, goal, left, seen

        const build = () => {
            const n = 4 + level
            grid = maze(n, Math.random)
            px = 1.5; py = 1.5; ang = grid[2][1] === 0 ? Math.PI / 2 : 0
            goal = {x: n * 2 - .5, y: n * 2 - .5}
            seen = grid.map(r => r.map(() => 0))
            left = 30 + n * 8
        }
        const solid = (x, y) => !grid[Math.floor(y)] || grid[Math.floor(y)][Math.floor(x)] !== 0
        build()

        env.loop(dt => {
            left -= dt
            if(left <= 0) return env.over(`${level} mazes`)

            ang += ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * 2.2 * dt

            const run = ((env.held.up ? 1 : 0) - (env.held.down ? 1 : 0)) * 2.6 * dt, nx = px + Math.cos(ang) * run, ny = py + Math.sin(ang) * run

            if(!solid(nx + Math.sign(nx - px) * .3, py)) px = nx
            if(!solid(px, ny + Math.sign(ny - py) * .3)) py = ny
            seen[Math.floor(py)][Math.floor(px)] = 1

            if(Math.hypot(goal.x - px, goal.y - py) < .6){
                level++; env.score(1, 1); env.sfx('win'); build()
            }

            // ceiling and floor
            let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#050506'); g.addColorStop(.5, '#17171b'); g.addColorStop(.5, '#0c0c0f'); g.addColorStop(1, '#2a2a30')
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)

            // walls, one column of the screen per ray
            const cols = 200, fov = Math.PI / 3, goalDist = Math.hypot(goal.x - px, goal.y - py)

            for(let i = 0; i < cols; i++){
                const a = ang - fov / 2 + fov * i / cols, dx = Math.cos(a), dy = Math.sin(a)
                let d = 0, side = 0, mx = Math.floor(px), my = Math.floor(py)
                const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9))
                let sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1
                let tx = (dx < 0 ? px - mx : mx + 1 - px) * ddx, ty = (dy < 0 ? py - my : my + 1 - py) * ddy

                for(let s = 0; s < 80; s++){
                    if(tx < ty){ d = tx; tx += ddx; mx += sx; side = 0 } else { d = ty; ty += ddy; my += sy; side = 1 }
                    if(!grid[my] || grid[my][mx] !== 0) break
                }

                d *= Math.cos(a - ang)
                const h = Math.min(H * 1.4, H * .9 / Math.max(d, .1)), shade = Math.max(.04, 1 - d / 6) * (side ? .62 : .85) * .55, v = Math.round(255 * shade)

                ctx.fillStyle = `rgb(${v},${v},${v + 6})`
                ctx.fillRect(i * W / cols, (H - h) / 2, W / cols + .05, h)
            }

            // the lime light, a pillar that shows through the dark
            let da = Math.atan2(goal.y - py, goal.x - px) - ang
            da = Math.atan2(Math.sin(da), Math.cos(da))

            if(Math.abs(da) < fov / 2 + .2){
                const sxp = W / 2 + da / fov * W, hh = Math.min(H, H * .5 / Math.max(goalDist, .2))

                glow(ctx, C.lime, 14); ctx.fillStyle = C.lime; ctx.globalAlpha = .85
                ctx.fillRect(sxp - hh * .08, (H - hh) / 2, hh * .16, hh); ctx.globalAlpha = 1; noglow(ctx)
            }

            // the map in the corner: only rooms already walked
            const cell = 1.4, ox = 3, oy = 3

            ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, ox - 1, oy - 1, grid.length * cell + 2, grid.length * cell + 2, 1); ctx.fill()
            grid.forEach((r, y) => r.forEach((c, x) => { if(!c && seen[y][x]){ ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell) } }))
            ctx.fillStyle = C.lime; ctx.fillRect(ox + px * cell - .7, oy + py * cell - .7, 1.4, 1.4)
            text(ctx, `${Math.ceil(left)}s`, W - 8, 5, 4, left < 10 ? C.red : '#fff', 'right')
        })
    }
},
{
    id: 'racer', title: 'Hook Racer', emoji: '🚀', c1: '#C8F542', c2: '#2C2C2E', size: [W, H], pad: true, levels: true, hint: 'Left / right to steer · OK for turbo · stay on the track',
    start(env){
        const {cv, ctx} = env.canvas()
        const SEG = 2, VIEW = 70, ROAD = 1.1
        const segs = []
        // a track of bends and hills, then repeated; pads (lime) boost, blocks (white) cost shield
        for(let i = 0, bend = 0; i < 400; i++){
            if(i % 20 == 0) bend = [0, 0, .5, -.5, 1, -1][Math.floor(Math.random() * 6)] * (1 + env.level * .35)
            segs.push({curve: bend, pad: i % 37 == 11 ? Math.floor(Math.random() * 3) - 1 : null, block: i > 15 && i % 11 == 4 ? (Math.random() * 1.4 - .7) : null})
        }
        const speedMax = [1, 1.2, 1.4][env.level]
        let z = 0, x = 0, speed = .3, shield = 100, turbo = 0, cool = 0, dist = 0

        const go = () => { if(cool <= 0){ turbo = 1.2; cool = 4; env.sfx('win') } }
        env.on('press', k => k == 'ok' && go())
        cv.addEventListener('pointerdown', go)

        env.loop(dt => {
            cool -= dt; turbo -= dt
            const cap = (turbo > 0 ? speedMax * 1.7 : speedMax)
            speed += (cap - speed) * Math.min(1, dt * .8)
            const idx = Math.floor(z / SEG) % segs.length, cur = segs[idx]
            const steer = (env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)

            x += steer * 1.7 * dt * (.5 + speed) - cur.curve * speed * dt * .45
            z += speed * 30 * dt
            dist += speed * 30 * dt
            env.score(Math.floor(dist / 3))

            if(Math.abs(x) > ROAD){ shield -= 22 * dt; speed *= 1 - dt * 1.4; x = Math.max(-ROAD * 1.25, Math.min(ROAD * 1.25, x)) }

            // the segment just passed: a pad speeds up, a block hits
            const p = segs[Math.floor(Math.max(0, z - 1) / SEG) % segs.length], lap = Math.floor(z / (SEG * segs.length))

            if(p.pad !== null && Math.abs(x - p.pad * .7) < .3 && p.done !== lap){ p.done = lap; speed = speedMax * 1.5; turbo = Math.max(turbo, .6); env.sfx('good') }
            if(p.block !== null && Math.abs(x - p.block) < .22 && p.done !== lap){ p.done = lap; shield -= 26; speed *= .45; env.sfx('bad') }
            if(shield <= 0) return env.over(`${Math.floor(dist / 3)} m`)

            // sky
            let g = ctx.createLinearGradient(0, 0, 0, H * .55); g.addColorStop(0, '#000'); g.addColorStop(1, '#202026')
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
            ctx.fillStyle = 'rgba(255,255,255,.6)'
            for(let i = 0; i < 24; i++) ctx.fillRect((i * 37 - x * 8 - cur.curve * 3 + 400) % W, (i * 13) % (H * .45), .5, .5)

            // road, drawn far to near; every segment is a strip that leans by the bends before it
            const horizon = H * .42, S = 36, frac = z / SEG - Math.floor(z / SEG)
            ctx.fillStyle = '#070709'; ctx.fillRect(0, horizon, W, H - horizon)
            let hz = ctx.createLinearGradient(0, horizon - 6, 0, horizon); hz.addColorStop(0, 'rgba(200,245,66,0)'); hz.addColorStop(1, 'rgba(200,245,66,.18)'); ctx.fillStyle = hz; ctx.fillRect(0, horizon - 6, W, 6)
            let bend = 0, off = 0
            const strips = []

            for(let n = 0; n < VIEW; n++){
                const s = segs[(idx + n) % segs.length], d = n + 1 - frac, k = 1 / d

                bend += s.curve * .012
                off += bend
                strips.push({s, n, k, y: horizon + (H - horizon) * k, cx: W / 2 + (off - x) * S * k, hw: ROAD * S * k})
            }

            for(let i = strips.length - 1; i > 0; i--){
                const a = strips[i], b = strips[i - 1]

                if(b.y <= a.y) continue
                const stripe = (idx + a.n) % 6 < 3

                ctx.fillStyle = stripe ? '#2b2b31' : '#35353c'
                ctx.beginPath(); ctx.moveTo(a.cx - a.hw, a.y); ctx.lineTo(a.cx + a.hw, a.y); ctx.lineTo(b.cx + b.hw, b.y); ctx.lineTo(b.cx - b.hw, b.y); ctx.fill()
                // the rails glow white, red when the craft is off the track
                ctx.fillStyle = stripe ? '#fff' : '#8E8E93'
                const r = Math.max(.2, a.hw * .06)
                ctx.beginPath(); ctx.moveTo(a.cx - a.hw - r, a.y); ctx.lineTo(a.cx - a.hw, a.y); ctx.lineTo(b.cx - b.hw, b.y); ctx.lineTo(b.cx - b.hw - r * 1.4, b.y); ctx.fill()
                ctx.beginPath(); ctx.moveTo(a.cx + a.hw, a.y); ctx.lineTo(a.cx + a.hw + r, a.y); ctx.lineTo(b.cx + b.hw + r * 1.4, b.y); ctx.lineTo(b.cx + b.hw, b.y); ctx.fill()

                if(stripe){ ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(a.cx - a.hw * .02, a.y, a.hw * .04, b.y - a.y) }
            }

            // pads and blocks, far to near
            for(let i = strips.length - 1; i > 0; i--){
                const a = strips[i], s = a.s

                if(s.pad !== null && s.done !== lap){
                    ctx.fillStyle = C.lime; ctx.globalAlpha = .9
                    ctx.fillRect(a.cx + s.pad * .7 * a.hw / ROAD - a.hw * .22, a.y, a.hw * .44, Math.max(.4, a.hw * .08)); ctx.globalAlpha = 1
                }
                if(s.block !== null && s.done !== lap){
                    const bw = a.hw * .3, bh = a.hw * .3

                    ctx.fillStyle = '#fff'; rr(ctx, a.cx + s.block * a.hw / ROAD - bw / 2, a.y - bh, bw, bh, bw * .15); ctx.fill()
                }
            }

            // the craft: a sleek wedge that banks with the steering
            ctx.save(); ctx.translate(W / 2, H - 9); ctx.rotate(steer * .16)
            glow(ctx, turbo > 0 ? C.lime : '#fff', turbo > 0 ? 12 : 5)
            ctx.fillStyle = '#f2f2f5'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(6, 4); ctx.lineTo(0, 2); ctx.lineTo(-6, 4); ctx.fill(); noglow(ctx)
            ctx.fillStyle = '#2C2C2E'; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(2, 1.5); ctx.lineTo(-2, 1.5); ctx.fill()
            if(turbo > 0){ ctx.fillStyle = C.lime; ctx.fillRect(-1.4, 4, 2.8, 2 + Math.random() * 3) }
            ctx.restore()

            // shield and speed
            ctx.fillStyle = 'rgba(255,255,255,.15)'; rr(ctx, 4, H - 5, 30, 2, 1); ctx.fill()
            ctx.fillStyle = shield > 30 ? '#fff' : C.red; rr(ctx, 4, H - 5, Math.max(1, 30 * shield / 100), 2, 1); ctx.fill()
            text(ctx, `${Math.round(speed * 200)} km/h`, W - 4, H - 4, 3.4, '#fff', 'right')
            if(cool > 0) text(ctx, 'TURBO ' + Math.ceil(cool), W - 4, H - 9, 2.6, C.dim, 'right')
            else text(ctx, 'TURBO READY', W - 4, H - 9, 2.6, C.lime, 'right')
        })
    }
},
{
    id: 'duel', title: 'Hook Duel', emoji: '🥊', c1: '#F2F2F7', c2: '#2C2C2E', size: [W, H], pad: true, levels: true, hint: 'Left / right to move · OK to strike · hold down to block · up to jump',
    start(env){
        const {cv, ctx} = env.canvas()
        const FLOOR = 46, REACH = 12
        const mk = (x, dir) => ({x, y: 0, vy: 0, dir, hp: 100, hit: 0, blocking: false, swing: 0, stun: 0, cool: 0})
        let me, cpu, round = 1, wins = 0, losses = 0, ko = 0, pause = 0, banner = ''
        const power = [7, 9, 12][env.level], think = [.55, .38, .22][env.level]

        const reset = () => { me = mk(25, 1); cpu = mk(75, -1); pause = 1.2; banner = `Round ${round}` }
        reset()

        const strike = f => { if(f.swing <= 0 && f.stun <= 0 && f.cool <= 0){ f.swing = .22; f.cool = .5; env.sfx('tap') } }
        env.on('press', k => { if(k == 'ok' && pause <= 0) strike(me) })
        cv.addEventListener('pointerdown', e => { if(pause <= 0) strike(me) })

        const land = (a, b, dmg) => {
            if(a.swing > .1 || a.swing <= 0 || a.done) return
            if(Math.abs(a.x - b.x) > REACH || Math.abs(a.y - b.y) > 9) return
            if((b.x - a.x) * a.dir < 0) return

            a.done = true
            if(b.blocking){ dmg *= .15; env.sfx('pop') } else { b.stun = .25; b.x += a.dir * 3; env.sfx('bad') }
            b.hp = Math.max(0, b.hp - dmg); b.hit = .15
        }

        const phys = (f, dt) => {
            f.swing -= dt; f.cool -= dt; f.stun -= dt; f.hit -= dt
            if(f.swing <= 0) f.done = false
            f.vy += 220 * dt; f.y += f.vy * dt
            if(f.y > 0){ f.y = 0; f.vy = 0 }
            f.x = Math.max(8, Math.min(W - 8, f.x))
        }

        env.loop(dt => {
            if(pause > 0){ pause -= dt }
            else {
                // the player
                me.blocking = !!env.held.down && me.y == 0 && me.swing <= 0
                if(me.stun <= 0 && !me.blocking){
                    const m = (env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)

                    me.x += m * 26 * dt
                    if(env.held.up && me.y == 0){ me.vy = -75; env.sfx('tap') }
                }
                me.dir = cpu.x > me.x ? 1 : -1

                // the computer: close in, strike on a beat, sometimes block a strike coming at it
                cpu.dir = me.x > cpu.x ? 1 : -1
                cpu.think = (cpu.think || 0) - dt
                const gap = Math.abs(me.x - cpu.x)

                cpu.blocking = me.swing > 0 && gap < REACH + 4 && Math.random() < (.35 + env.level * .2)
                if(cpu.stun <= 0 && !cpu.blocking && cpu.swing <= 0){
                    if(gap > REACH - 3) cpu.x += cpu.dir * (16 + env.level * 6) * dt
                    else if(gap < REACH - 8) cpu.x -= cpu.dir * 12 * dt
                    if(cpu.think <= 0){ cpu.think = think + Math.random() * .4; if(gap < REACH + 1) strike(cpu); else if(Math.random() < .1 && cpu.y == 0) cpu.vy = -70 }
                }

                land(me, cpu, power + 3); land(cpu, me, power)
                if(Math.abs(me.x - cpu.x) < 7){ const push = (7 - Math.abs(me.x - cpu.x)) / 2 * Math.sign(me.x - cpu.x || 1); me.x += push; cpu.x -= push }

                if(me.hp <= 0 || cpu.hp <= 0){
                    const won = cpu.hp <= 0

                    if(won){ wins++; env.score(Math.round(me.hp) + 50, 1); env.sfx('win') } else { losses++; env.sfx('bad') }
                    if(wins == 2) return env.over('K.O.', true)
                    if(losses == 2) return env.over('K.O.')

                    round++; reset(); banner = won ? 'K.O.!' : 'Down'
                    pause = 1.4
                }
            }
            phys(me, dt); phys(cpu, dt)

            // arena
            let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#000'); g.addColorStop(.8, '#19191d'); g.addColorStop(1, '#0c0c0f')
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
            ctx.fillStyle = 'rgba(255,255,255,.07)'
            for(let i = 0; i < 6; i++) ctx.fillRect(8 + i * 17, 8, 7, FLOOR - 8)
            ctx.fillStyle = '#2C2C2E'; ctx.fillRect(0, FLOOR, W, H - FLOOR)
            ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, FLOOR, W, .4)

            // fighters
            const body = (f, color, accent) => {
                ctx.save(); ctx.translate(f.x, FLOOR + f.y); ctx.scale(f.dir, 1)
                if(f.hit > 0) ctx.translate(-1 * Math.sin(f.hit * 60), 0)
                ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, -f.y, 5, 1, 0, 0, 7); ctx.fill()
                ctx.fillStyle = f.hit > 0 ? '#fff' : color
                rr(ctx, -3, -17, 6, 10, 2); ctx.fill()                       // torso
                ctx.beginPath(); ctx.arc(0, -21, 3.4, 0, 7); ctx.fill()      // head
                ctx.fillRect(-2.8, -7, 2.2, 7); ctx.fillRect(.6, -7, 2.2, 7) // legs
                ctx.fillStyle = accent; ctx.fillRect(-3, -11.5, 6, 1.2)       // belt
                // arm: out when striking, up when blocking
                ctx.strokeStyle = f.hit > 0 ? '#fff' : color; ctx.lineWidth = 2.2; ctx.lineCap = 'round'
                ctx.beginPath(); ctx.moveTo(1, -15)
                if(f.blocking) ctx.lineTo(4, -19); else if(f.swing > 0) ctx.lineTo(1 + REACH * .8, -15); else ctx.lineTo(4, -11)
                ctx.stroke()
                if(f.swing > 0){ ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(1 + REACH * .8, -15, 1.8, 0, 7); ctx.fill() }
                if(f.blocking){ ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(5, -15, 9, -1.2, 1.2); ctx.stroke() }
                ctx.restore()
            }
            body(cpu, '#8E8E93', '#fff'); body(me, '#F2F2F7', C.lime)

            // health bars and rounds
            const bar = (x, hp, right, tag) => {
                ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, x, 4, 36, 3, 1.5); ctx.fill()
                ctx.fillStyle = hp > 30 ? '#fff' : C.red
                const w = 36 * hp / 100

                rr(ctx, right ? x + 36 - w : x, 4, Math.max(0, w), 3, 1.5); ctx.fill()
                text(ctx, tag, right ? x + 36 : x, 10, 2.8, C.dim, right ? 'right' : 'left')
            }
            bar(5, me.hp, false, 'YOU' + ' ' + '●'.repeat(wins))
            bar(W - 41, cpu.hp, true, '●'.repeat(losses) + ' CPU')
            text(ctx, 'ROUND ' + round, W / 2, 5.5, 3, C.dim)
            if(pause > 0) text(ctx, banner, W / 2, 24, 9, '#fff')
        })
    }
}
]

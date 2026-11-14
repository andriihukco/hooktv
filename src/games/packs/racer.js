// Hook Racer: a side-on lane racer drawn with a projected road on a plain 2D canvas.
import {C, rr, text, glow, noglow} from '../draw'

const W = 100, H = 56

export default {
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
}

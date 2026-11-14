// Real-time arcade games, part 3: a runner, a lane racer and a catcher. Our own rules and art;
// the ideas come from the sample games list (Patel230/sample-games), not from their code.
import {C, rr, text, glow, noglow} from '../draw'

import astray from './astray'
import racer from './racer'

export {maze} from './maze'

export default [
    astray,
    racer,
{
    id: 'beatrun', title: 'Beat Runner', emoji: '🏃', c1: '#64D2FF', c2: '#BF5AF2', size: [100, 60], pad: true, hint: 'OK or tap to jump · clear the blocks · the pace keeps rising',
    start(env){
        const {cv, ctx} = env.canvas()
        const GROUND = 48, GRAVITY = 150, JUMP = 62
        let p, obs, speed, dist, next, t
        const reset = () => { p = {y: GROUND, vy: 0}; obs = []; speed = 34; dist = 0; next = 30; t = 0 }
        const jump = () => { if(p.y >= GROUND){ p.vy = -JUMP; env.sfx('tap') } }
        reset()
        env.on('press', k => { if(k == 'ok' || k == 'up') jump() })
        cv.addEventListener('pointerdown', jump)
        env.loop(dt => {
            t += dt
            speed = Math.min(80, 34 + t * 1.2)
            p.vy += GRAVITY * dt
            p.y = Math.min(GROUND, p.y + p.vy * dt)
            if(p.y >= GROUND) p.vy = 0
            dist += speed * dt
            next -= speed * dt
            if(next <= 0){ obs.push({x: 104, w: env.rnd(4, 9), h: env.rnd(5, 11)}); next = env.rnd(46, 66) }
            obs.forEach(o => o.x -= speed * dt)
            obs = obs.filter(o => o.x + o.w > -2)
            env.score(Math.floor(dist / 4))
            // the player box is 6 wide and 8 tall, standing on the ground line
            if(obs.some(o => o.x < 16 && o.x + o.w > 10 && p.y > GROUND - o.h)) return env.over('Crashed')
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 100, 60)
            ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, GROUND, 100, 1)
            ctx.fillStyle = 'rgba(255,255,255,.12)'
            for(let i = 0; i < 8; i++) ctx.fillRect(((i * 15 - dist) % 120 + 120) % 120, GROUND + 4, 6, 1)
            glow(ctx, C.pink, 8); ctx.fillStyle = C.pink
            obs.forEach(o => rr(ctx, o.x, GROUND - o.h, o.w, o.h, 1)); ctx.fill(); noglow(ctx)
            glow(ctx, C.teal, 10); ctx.fillStyle = C.teal; rr(ctx, 10, p.y - 8, 6, 8, 1.5); ctx.fill(); noglow(ctx)
            text(ctx, String(Math.floor(dist / 4)), 92, 6, 5, C.dim, 'right')
        })
    }
},
{
    id: 'neonlanes', title: 'Neon Lanes', emoji: '🏎', c1: '#FF6AD5', c2: '#5E5CE6', size: [60, 100], pad: true, hint: 'Left / right or drag to switch lanes · dodge the traffic',
    start(env){
        const {cv, ctx} = env.canvas()
        const LANES = [15, 30, 45], CAR_Y = 86
        let lane = 1, cx = 30, traffic, spawn, speed, dist, road
        const reset = () => { lane = 1; cx = 30; traffic = []; spawn = 0.4; speed = 34; dist = 0; road = 0 }
        const side = x => x < 22 ? 0 : x < 38 ? 1 : 2
        reset()
        env.on('press', k => { if(k == 'left') lane = Math.max(0, lane - 1); else if(k == 'right') lane = Math.min(2, lane + 1) })
        const pointer = e => { lane = side(cv.pt(e).x) }
        cv.addEventListener('pointerdown', pointer)
        cv.addEventListener('pointermove', pointer)
        env.loop(dt => {
            speed = Math.min(90, speed + 1.5 * dt)
            dist += speed * dt; road += speed * dt
            cx += (LANES[lane] - cx) * Math.min(1, dt * 14)
            spawn -= dt
            if(spawn <= 0){ traffic.push({lane: env.rnd(3), y: -14}); spawn = env.rnd(.5, .95) * 34 / speed + .15 }
            traffic.forEach(c => c.y += speed * dt)
            traffic = traffic.filter(c => c.y < 110)
            env.score(Math.floor(dist / 5))
            // a car hits when it shares the player's lane and overlaps its box
            if(traffic.some(c => Math.abs(LANES[c.lane] - cx) < 7 && c.y + 12 > CAR_Y && c.y < CAR_Y + 12)) return env.over('Crash')
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 60, 100)
            ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(5, 0, 1, 100); ctx.fillRect(54, 0, 1, 100)
            ctx.fillStyle = 'rgba(255,255,255,.22)'
            for(let y = -12 + road % 12; y < 100; y += 12){ ctx.fillRect(22, y, 1, 6); ctx.fillRect(37, y, 1, 6) }
            glow(ctx, C.pink, 8); ctx.fillStyle = C.pink
            traffic.forEach(c => rr(ctx, LANES[c.lane] - 4, c.y, 8, 12, 2.5)); ctx.fill(); noglow(ctx)
            glow(ctx, C.teal, 12); ctx.fillStyle = C.teal; rr(ctx, cx - 4, CAR_Y, 8, 12, 2.5); ctx.fill(); noglow(ctx)
        })
    }
},
{
    id: 'fruitcatch', title: 'Fruit Catch', emoji: '🍎', c1: '#8BE35A', c2: '#1E9E4A', size: [60, 90], pad: true, hint: 'Left / right or drag to move the basket · catch the fruit, dodge the rotten ones',
    start(env){
        const {cv, ctx} = env.canvas()
        const BASKET_Y = 80
        let bx, target, items, spawn, speed, lives, points
        const reset = () => { bx = 30; target = null; items = []; spawn = 0.8; speed = 22; lives = 3; points = 0 }
        reset()
        const aim = e => { target = Math.max(8, Math.min(52, cv.pt(e).x)) }
        cv.addEventListener('pointerdown', aim)
        cv.addEventListener('pointermove', aim)
        env.loop(dt => {
            if(target != null) bx += (target - bx) * Math.min(1, dt * 12)
            else bx = Math.max(8, Math.min(52, bx + ((env.held.right ? 1 : 0) - (env.held.left ? 1 : 0)) * 70 * dt))
            speed = Math.min(58, speed + 0.6 * dt)
            spawn -= dt
            if(spawn <= 0){ items.push({x: env.rnd(6, 54), y: -4, rotten: env.rnd(4) == 0, c: env.rnd(2)}); spawn = Math.max(.38, env.rnd(.6, 1.1) - points / 3000) }
            items.forEach(it => it.y += speed * dt)
            items = items.filter(it => {
                let caught = it.y > BASKET_Y - 3 && it.y < BASKET_Y + 4 && Math.abs(it.x - bx) < 8
                if(caught){
                    if(it.rotten){ lives--; env.sfx('bad') } else { points += 10; env.score(points); env.sfx('good') }
                    return false
                }
                if(it.y > 96){ if(!it.rotten) lives--; return false }
                return true
            })
            if(lives <= 0) return env.over('Out of lives')
            ctx.fillStyle = C.bg; ctx.fillRect(0, 0, 60, 90)
            items.forEach(it => {
                ctx.fillStyle = it.rotten ? C.purple : it.c ? C.green : C.red
                ctx.beginPath(); ctx.arc(it.x, it.y, 2.8, 0, 7); ctx.fill()
            })
            glow(ctx, C.lime, 10); ctx.fillStyle = C.lime; rr(ctx, bx - 8, BASKET_Y, 16, 5, 2); ctx.fill(); noglow(ctx)
            for(let i = 0; i < 3; i++){ ctx.fillStyle = i < lives ? C.pink : 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(50 - i * 5, 5, 1.6, 0, 7); ctx.fill() }
            text(ctx, String(points), 6, 6, 5, C.dim, 'left')
        })
    }
}
]

// Astray: a first-person maze walk, drawn with a raycaster on a plain 2D canvas.
import {C, rr, text, glow, noglow} from '../draw'
import {maze} from './maze'

const W = 100, H = 56

export default {
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
}

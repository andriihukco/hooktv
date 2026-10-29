// Canvas helpers shared by the action games.
export const C = {bg: '#0c0c0f', lime: '#C8F542', blue: '#0A84FF', pink: '#FF375F', orange: '#FF9F0A', purple: '#BF5AF2', teal: '#64D2FF', yellow: '#FFD60A', green: '#30D158', red: '#FF453A', white: '#fff', dim: 'rgba(255,255,255,.55)'}

export function rr(ctx, x, y, w, h, r){
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

export function text(ctx, t, x, y, size, color = '#fff', align = 'center', weight = 700){
    ctx.font = `${weight} ${size}px -apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillText(t, x, y)
}

export function glow(ctx, color, blur = 14){
    ctx.shadowColor = color
    ctx.shadowBlur = blur
}

export function noglow(ctx){
    ctx.shadowBlur = 0
}

export function stars(ctx, w, h, t = 0){
    ctx.fillStyle = 'rgba(255,255,255,.5)'
    for(let i = 0; i < 40; i++){
        let x = (i * 97.3) % w, y = (i * 53.7 + t * (6 + i % 5)) % h
        ctx.fillRect(x, y, 1 + i % 2, 1 + i % 2)
    }
}

export const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

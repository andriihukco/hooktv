// Card and tile games: solitaire, blackjack, poker, mahjong solitaire.
const SU = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const red = s => s == 1 || s == 2
const deck = env => env.shuffle(SU.flatMap((_, s) => RK.map((_, r) => ({s, r}))))
const face = (c, extra = '') => `<div style="position:absolute;inset:0;border-radius:.45em;background:#f6f6f8;color:${red(c.s) ? '#d6283a' : '#16161a'};box-shadow:0 .1em .35em rgba(0,0,0,.55);font-weight:800;line-height:1;${extra}"><div style="position:absolute;left:9%;top:5%;font-size:.95em">${RK[c.r]}<br><span style="font-size:.9em">${SU[c.s]}</span></div><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.9em;opacity:.9">${SU[c.s]}</div></div>`
const back = (extra = '') => `<div style="position:absolute;inset:0;border-radius:.45em;background:repeating-linear-gradient(45deg,#2c4fa3 0 .35em,#233f85 .35em .7em);box-shadow:0 .1em .3em rgba(0,0,0,.55),inset 0 0 0 .18em #f6f6f8;${extra}"></div>`

// ---- poker hand ranking: [category, ...tiebreak ranks] ----
function rankHand(cs){
    let r = cs.map(c => c.r == 0 ? 14 : c.r + 1).sort((a, b) => b - a), flush = cs.every(c => c.s == cs[0].s)
    let uniq = [...new Set(r)], straight = uniq.length == 5 && (r[0] - r[4] == 4 || r.join() == '14,5,4,3,2'), hi = r.join() == '14,5,4,3,2' ? 5 : r[0]
    let cnt = {}; r.forEach(x => cnt[x] = (cnt[x] || 0) + 1)
    let groups = Object.entries(cnt).map(([k, v]) => [v, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]), shape = groups.map(g => g[0]).join(''), ks = groups.map(g => g[1])
    if(straight && flush) return [8, hi]
    if(shape == '41') return [7, ...ks]
    if(shape == '32') return [6, ...ks]
    if(flush) return [5, ...r]
    if(straight) return [4, hi]
    if(shape == '311') return [3, ...ks]
    if(shape == '221') return [2, ...ks]
    if(shape == '2111') return [1, ...ks]
    return [0, ...r]
}
const cmp = (a, b) => { for(let i = 0; i < Math.max(a.length, b.length); i++){ if((a[i] || 0) != (b[i] || 0)) return (a[i] || 0) - (b[i] || 0) } return 0 }
const HN = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush']

export default [
{
    id: 'solitaire', title: 'Solitaire', emoji: '♠️', c1: '#0B8F4D', c2: '#064E2B', size: [100, 86], pad: true, hint: 'OK selects and places · OK twice on a card sends it up · arrows move, up / down walk a pile',
    start(env){
        let draw3, passes, maxPass, stock, waste, found, tab, sel = null, cur = {col: 0, row: 0, d: 0}, won = false
        const deal = () => { let d = deck(env); tab = Array.from({length: 7}, (_, i) => d.splice(0, i + 1).map((c, k, a) => ({...c, up: k == a.length - 1}))); stock = d.map(c => ({...c, up: false})); waste = []; found = [[], [], [], []]; passes = 0 }
        const stage = document.createElement('div'); stage.style.cssText = 'position:absolute;inset:0;font-size:1.3em'; env.el.appendChild(stage)
        const W = 11, H = 15.4, X = c => 1.6 + c * 14.1
        const slotCards = (c, r) => r == 0 ? (c == 0 ? stock : c == 1 ? waste : c >= 3 ? found[c - 3] : []) : tab[c]
        const canOnFound = (c, f) => f.length ? (f[f.length - 1].s == c.s && f[f.length - 1].r == c.r - 1) : c.r == 0
        const canOnTab = (c, p) => p.length ? (p[p.length - 1].up && red(p[p.length - 1].s) != red(c.s) && p[p.length - 1].r == c.r + 1) : c.r == 12
        function html(){
            let out = ''
            const box = (x, y, inner, z = 1, cls = '', cl = '') => `<div class="${cls}" ${cl} style="position:absolute;left:${x}%;top:${y / 86 * 100}%;width:${W}%;height:${H / 86 * 100}%;z-index:${z}">${inner}</div>`
            const mark = (c, r, d) => { let on = cur.col == c && cur.row == r && (r == 0 || cur.d == d), picked = sel && sel.col == c && sel.row == r && (r == 0 || d >= 0 && sel.from <= (tab[c].length - 1 - d)); return `${on ? 'box-shadow:0 0 0 .22em #C8F542;' : ''}${picked ? 'transform:translateY(-.4em);' : ''}` }
            // stock, waste, foundations
            out += box(X(0), 2, stock.length ? back(mark(0, 0)) : `<div style="position:absolute;inset:0;border-radius:.45em;border:.15em dashed rgba(255,255,255,.3);${mark(0, 0)}"></div>`, 1, '', 'data-s="0,0,0"')
            out += box(X(1), 2, waste.length ? face(waste[waste.length - 1], mark(1, 0)) : `<div style="position:absolute;inset:0;border-radius:.45em;border:.15em dashed rgba(255,255,255,.18);${mark(1, 0)}"></div>`, 1, '', 'data-s="1,0,0"')
            for(let f = 0; f < 4; f++) out += box(X(f + 3), 2, found[f].length ? face(found[f][found[f].length - 1], mark(f + 3, 0)) : `<div style="position:absolute;inset:0;border-radius:.45em;border:.15em dashed rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:2em;color:rgba(255,255,255,.3);${mark(f + 3, 0)}">${SU[f]}</div>`, 1, '', `data-s="${f + 3},0,0"`)
            tab.forEach((p, c) => {
                let down = p.filter(x => !x.up).length, up = p.length - down, avail = 86 - 22 - H - 1, off = up > 1 ? Math.max(2.4, Math.min(4.4, (avail - down * 1.6) / (up - 1))) : 4.4, y = 22
                if(!p.length) out += box(X(c), y, `<div style="position:absolute;inset:0;border-radius:.45em;border:.15em dashed rgba(255,255,255,.18);${mark(c, 1, 0)}"></div>`, 1, '', `data-s="${c},1,0"`)
                p.forEach((card, k) => { let d = p.length - 1 - k; out += box(X(c), y, card.up ? face(card, mark(c, 1, d)) : back(), k + 2, '', `data-s="${c},1,${card.up ? d : 0}"`); y += card.up ? off : 1.6 })
            })
            stage.innerHTML = out
            stage.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { let [c, r, d] = el.dataset.s.split(',').map(Number); cur = {col: c, row: r, d}; act() })
            env.score(found.reduce((a, f) => a + f.length, 0) * 10 + extra)
        }
        let extra = 0
        function take(from){ // from = {col,row,from?}
            if(from.row == 0) return from.col == 1 ? [waste.pop()] : [found[from.col - 3].pop()]
            return tab[from.col].splice(from.from)
        }
        function flipTop(c){ let p = tab[c]; if(p.length && !p[p.length - 1].up){ p[p.length - 1].up = true; extra += 5 } }
        function win(){ if(found.every(f => f.length == 13)){ won = true; env.sfx('win'); env.score(env.points + 500); env.over('You cleared it!', true) } }
        function act(){
            let {col, row, d} = cur
            if(sel){
                let cards = sel.row == 0 ? [sel.col == 1 ? waste[waste.length - 1] : found[sel.col - 3][found[sel.col - 3].length - 1]] : tab[sel.col].slice(sel.from)
                let same = sel.col == col && sel.row == row
                if(same){ // second OK on the same card: try to send it up
                    let f = found.findIndex(f => cards.length == 1 && canOnFound(cards[0], f))
                    if(f >= 0){ take(sel); found[f].push(cards[0]); if(sel.row == 1) flipTop(sel.col); env.sfx('good'); sel = null; html(); return win() }
                    sel = null; return html()
                }
                let ok = false
                if(row == 1 && canOnTab(cards[0], tab[col])){ take(sel); tab[col].push(...cards); if(sel.row == 1) flipTop(sel.col); ok = true; env.sfx('tap') }
                else if(row == 0 && col >= 3 && cards.length == 1 && canOnFound(cards[0], found[col - 3])){ take(sel); found[col - 3].push(cards[0]); if(sel.row == 1) flipTop(sel.col); ok = true; env.sfx('good') }
                sel = null
                if(ok){ html(); return win() }
                if(!(row == 0 && col < 3)) pickUp(); else html()
                return
            }
            if(row == 0 && col == 0){
                if(stock.length){ for(let i = 0; i < (draw3 ? 3 : 1) && stock.length; i++){ let c = stock.pop(); c.up = true; waste.push(c) } env.sfx('tap') }
                else if(waste.length && passes < maxPass){ stock = waste.reverse().map(c => ({...c, up: false})); waste = []; passes++ ; env.sfx('tap') }
                return html()
            }
            pickUp()
        }
        function pickUp(){
            let {col, row, d} = cur
            if(row == 0){ if(col == 1 && waste.length) sel = {col, row} ; else if(col >= 3 && found[col - 3].length) sel = {col, row} }
            else if(tab[col].length){ let from = tab[col].length - 1 - d; if(tab[col][from] && tab[col][from].up) sel = {col, row, from} ; else if(d == 0){ flipTop(col) } }
            html()
        }
        env.on('press', k => {
            if(won) return
            if(k == 'left'){ cur.col = (cur.col + 6) % 7; if(cur.row == 0 && cur.col == 2) cur.col = 1; cur.d = 0 }
            else if(k == 'right'){ cur.col = (cur.col + 1) % 7; if(cur.row == 0 && cur.col == 2) cur.col = 3; cur.d = 0 }
            else if(k == 'up'){ if(cur.row == 1){ let ups = tab[cur.col].filter(c => c.up).length; if(cur.d < ups - 1) cur.d++; else { cur.row = 0; if(cur.col == 2) cur.col = 3 } } }
            else if(k == 'down'){ if(cur.row == 0){ cur.row = 1; cur.d = 0 } else if(cur.d > 0) cur.d-- }
            else if(k == 'ok') return act()
            html()
        })
        let menu = env.buttons(['Easy · draw 1', 'Medium · draw 3', 'Hard · draw 3, 3 passes'], i => { menu.remove(); draw3 = i > 0; maxPass = i == 2 ? 2 : 1e9; deal(); html() }, {modal: true})
        stage.innerHTML = ''
    }
},
{
    id: 'blackjack', title: 'Blackjack', emoji: '🃏', c1: '#1C1C1E', c2: '#B8860B', size: [100, 80], pad: true, hint: 'Beat the dealer without going over 21 · blackjack pays 3:2',
    start(env){
        let bank = 500, bet = 0, d, dealer, player, menu
        const val = h => { let t = h.reduce((a, c) => a + (c.r == 0 ? 11 : Math.min(10, c.r + 1)), 0), aces = h.filter(c => c.r == 0).length; while(t > 21 && aces--) t -= 10; return t }
        const stage = document.createElement('div'); stage.style.cssText = 'position:absolute;inset:0;font-size:1.3em;background:radial-gradient(ellipse at 50% 40%,#0f6b3a,#08301b)'; env.el.appendChild(stage)
        const row = (h, y, hide) => `<div style="position:absolute;left:0;right:0;top:${y}%;height:30%;display:flex;justify-content:center;gap:2%">${h.map((c, i) => `<div style="position:relative;width:11%;height:100%">${i == 1 && hide ? back() : face(c)}</div>`).join('')}</div>`
        const label = (t, y) => `<div style="position:absolute;left:0;right:0;top:${y}%;text-align:center;font-size:1em;opacity:.7">${t}</div>`
        function paint(hide = false, msg = ''){
            stage.innerHTML = label(`Dealer ${hide ? '' : val(dealer)}`, 2) + row(dealer, 9, hide) + label(`You ${player.length ? val(player) : ''}`, 44) + row(player, 51, false) +
                `<div style="position:absolute;left:3%;bottom:2%;font-size:1.3em;font-weight:800">$${bank}${bet ? ` · bet $${bet}` : ''}</div><div style="position:absolute;left:0;right:0;top:41%;text-align:center;font-size:1.8em;font-weight:800;color:#C8F542;text-shadow:0 .1em .3em #000">${msg}</div>`
            env.score(bank)
        }
        const draw = () => { if(d.length < 10) d = deck(env); return d.pop() }
        function bets(){
            player = []; dealer = []; bet = 0; paint()
            if(bank < 10) return env.over('Out of chips')
            let amounts = [10, 25, 50, 100].filter(a => a <= bank)
            menu && menu.remove(); menu = env.buttons(amounts.map(a => `Bet $${a}`), i => { bet = amounts[i]; bank -= bet; menu.remove(); deal() }, {modal: true})
        }
        function deal(){
            d = d && d.length > 15 ? d : deck(env); player = [draw(), draw()]; dealer = [draw(), draw()]; paint(true)
            if(val(player) == 21) return finish(true)
            turn()
        }
        function turn(){
            let opts = ['Hit', 'Stand'].concat(bank >= bet && player.length == 2 ? ['Double'] : [])
            menu = env.buttons(opts, i => {
                menu.remove()
                if(opts[i] == 'Hit'){ player.push(draw()); env.sfx('tap'); paint(true); if(val(player) > 21) return finish(); if(val(player) == 21) return finish(); turn() }
                else if(opts[i] == 'Double'){ bank -= bet; bet *= 2; player.push(draw()); finish() }
                else finish()
            }, {modal: true})
        }
        function finish(natural){
            let p = val(player)
            if(p <= 21 && !natural) while(val(dealer) < 17) dealer.push(draw())
            let dv = val(dealer), msg, pay = 0
            if(natural && val(dealer) != 21){ msg = 'Blackjack!'; pay = bet * 2.5 } else if(p > 21){ msg = 'Bust' } else if(dv > 21 || p > dv){ msg = 'You win'; pay = bet * 2 } else if(p == dv){ msg = 'Push'; pay = bet } else msg = 'Dealer wins'
            bank += pay; env.sfx(pay > bet ? 'win' : pay == bet ? 'tap' : 'bad'); bet = 0; paint(false, msg)
            env.after(bets, 1800)
        }
        bets()
    }
},
{
    id: 'poker', title: 'Poker', emoji: '♦️', c1: '#FF375F', c2: '#5E5CE6', size: [100, 80], pad: true, hint: 'Five-card draw · mark the cards to keep, then pick Draw',
    start(env){
        let bank = 500, ANTE = 25, d, mine, foe, hold = [0, 0, 0, 0, 0], phase = 'idle'
        const stage = document.createElement('div'); stage.style.cssText = 'position:absolute;inset:0;font-size:1.3em;background:radial-gradient(ellipse at 50% 40%,#5a1230,#220714)'; env.el.appendChild(stage)
        let info = document.createElement('div'); info.style.cssText = 'position:absolute;left:0;right:0;top:38%;text-align:center;font-size:1.6em;font-weight:800;color:#C8F542;text-shadow:0 .1em .3em #000'; stage.appendChild(info)
        let hand = document.createElement('div'); hand.style.cssText = 'position:absolute;left:0;right:0;top:6%;height:30%;display:flex;justify-content:center;gap:2%'; stage.appendChild(hand)
        let g = env.grid(6, 1, (c, i) => { c.style.background = 'transparent'; c.style.padding = 0; c.style.overflow = 'visible' }, pick, {css: 'inset:auto 4% 4% 4%;height:36%;gap:2%;padding:0', start: 5})
        const show = (reveal) => {
            hand.innerHTML = foe ? foe.map(c => `<div style="position:relative;width:11%;height:100%">${reveal ? face(c) : back()}</div>`).join('') : ''
            g.cells.forEach((c, i) => {
                if(i < 5){ c.innerHTML = mine ? `<div style="position:relative;width:100%;height:100%;transform:${hold[i] ? 'translateY(-.8em)' : 'none'};transition:transform .15s">${face(mine[i])}${hold[i] ? '<div style="position:absolute;left:0;right:0;bottom:-1.9em;text-align:center;font-size:.8em;color:#C8F542">HELD</div>' : ''}</div>` : '' }
                else { c.innerHTML = `<div class="games__btn ${phase == 'swap' || phase == 'idle' ? 'focus' : ''}" style="font-size:.8em;padding:.7em 1em;margin:0 auto;white-space:nowrap">${phase == 'swap' ? 'Draw' : phase == 'idle' ? 'Deal' : '…'}</div>` }
            })
            env.score(bank)
        }
        const label = t => info.textContent = t
        function pick(i){
            if(phase == 'idle' && i == 5) return deal()
            if(phase != 'swap') return
            if(i < 5){ hold[i] ^= 1; env.sfx('tap'); show(false) } else drawCards()
        }
        function deal(){
            if(bank < ANTE) return env.over('Out of chips')
            bank -= ANTE; d = deck(env); mine = d.splice(0, 5); foe = d.splice(0, 5); hold = [0, 0, 0, 0, 0]; phase = 'swap'; env.sfx('tap'); label(`Ante $${ANTE} · ${HN[rankHand(mine)[0]]}`); show(false)
        }
        function drawCards(){
            phase = 'busy'
            mine = mine.map((c, i) => hold[i] ? c : d.pop())
            // computer keeps pairs or better, otherwise its two highest cards
            let cnt = {}; foe.forEach(c => cnt[c.r] = (cnt[c.r] || 0) + 1)
            let rk = rankHand(foe), keep = rk[0] >= 4 ? foe.map(() => 1) : rk[0] >= 1 ? foe.map(c => cnt[c.r] > 1 ? 1 : 0) : (() => { let hi = foe.map(c => c.r == 0 ? 14 : c.r + 1).sort((a, b) => b - a).slice(0, 2); return foe.map(c => hi.includes(c.r == 0 ? 14 : c.r + 1) ? 1 : 0) })()
            foe = foe.map((c, i) => keep[i] ? c : d.pop())
            let a = rankHand(mine), b = rankHand(foe), r = cmp(a, b)
            show(true)
            if(r > 0){ bank += ANTE * 2; env.sfx('win'); label(`You win with ${HN[a[0]]}`) } else if(r < 0){ env.sfx('bad'); label(`Computer wins with ${HN[b[0]]}`) } else { bank += ANTE; label('Split pot') }
            env.after(() => { phase = 'idle'; show(true); if(bank < ANTE) env.over('Out of chips') }, 1200)
            show(true)
        }
        phase = 'idle'; label('Press Deal to start'); show(false)
    }
},
]

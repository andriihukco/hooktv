import {t} from './shell'

// The shared quiz engine: one multiple-choice round for a solo player, two players taking turns, or teams taking turns.
// A question goes to the next player in the line; a right answer scores 50–100 depending on how much time was left.

export const LIMITS = [20000, 15000, 10000]

export const COUNTS = {id: 'count', label: 'Questions', def: 0, values: [{id: 10, label: '10'}, {id: 15, label: '15'}, {id: 20, label: '20'}]}
export const TEAMS = {id: 'teams', label: 'Teams', when: {id: 'mode', value: 'teams'}, def: 0, values: [{id: 2, label: '2 teams'}, {id: 3, label: '3 teams'}, {id: 4, label: '4 teams'}]}
export const MODES = [{id: 'solo', label: 'Solo'}, {id: 'duo', label: 'Duo'}, {id: 'teams', label: 'Teams'}]

const COLORS = ['#0A84FF', '#FF375F', '#30D158', '#FF9F0A']
const NAMES = ['Team A', 'Team B', 'Team C', 'Team D']

/** who plays: one player, two, or the chosen number of teams */
export function roster(env){
    if(env.mode == 'duo') return [1, 2].map((n, i) => ({name: t('hooktv_game_player', 'Player') + ' ' + n, color: COLORS[i], score: 0, right: 0}))
    if(env.mode == 'teams') return NAMES.slice(0, +env.opts.teams || 2).map((name, i) => ({name, color: COLORS[i], score: 0, right: 0}))

    return [{name: t('hooktv_game_you', 'You'), color: COLORS[0], score: 0, right: 0}]
}

/** "Team A wins · 650 : 520", or a draw */
export function verdict(players){
    let sorted = players.slice().sort((a, b) => b.score - a.score)

    if(sorted.length > 1 && sorted[0].score == sorted[1].score) return {text: t('hooktv_game_draw', 'Draw') + ' · ' + sorted.map(p => p.score).join(' : '), win: false}

    return {text: sorted[0].name + ' ' + t('hooktv_game_wins_word', 'wins') + ' · ' + sorted.map(p => p.score).join(' : '), win: true}
}

/** a strip with every player's score; the one on turn is lit */
export function scoreboard(env, players){
    let el = document.createElement('div')

    el.style.cssText = 'position:absolute;left:3%;right:3%;top:1.2%;display:flex;gap:.5em;justify-content:center;font-size:.9em'
    env.el.appendChild(el)

    return {
        el,
        draw(turn){
            el.innerHTML = players.length < 2 ? '' : players.map((p, i) => `<div style="padding:.25em .8em;border-radius:99em;background:${i == turn ? p.color : 'rgba(255,255,255,.08)'};color:#fff;font-weight:700;opacity:${i == turn ? 1 : .7}">${p.name} · ${p.score}</div>`).join('')
        }
    }
}

/**
 * Runs a quiz round on the game's board.
 * @param {object} env game environment
 * @param {object} cfg {bank: [[prompt, right, ...wrong]], count, emoji, prompt, cols, rows, css}
 */
export function run(env, cfg){
    let limit = LIMITS[env.level == null ? 1 : env.level]
    let count = Math.min(+env.opts.count || cfg.count || 10, cfg.bank.length)
    let qs = env.shuffle(cfg.bank).slice(0, count), qi = 0, t0, order, locked
    let players = roster(env), multi = players.length > 1, board = scoreboard(env, players)

    let q = document.createElement('div')
    q.style.cssText = `position:absolute;left:5%;right:5%;top:${multi ? 9 : 6}%;text-align:center;font-size:1.7em;font-weight:700;min-height:3.4em`
    let bar = document.createElement('div')
    bar.style.cssText = 'position:absolute;left:5%;right:5%;top:0;height:.4em;background:var(--accent,#C8F542);transform-origin:left;transition:transform .1s linear;border-radius:99em'
    env.el.append(q, bar)

    let g = env.grid(cfg.cols || 2, cfg.rows || 2, c => { c.style.fontSize = '1.15em'; c.style.padding = '.5em'; c.style.textAlign = 'center' }, pick, {css: cfg.css || 'inset:auto 4% 4% 4%;height:46%;gap:.5em;padding:0'})

    const turn = () => players[qi % players.length]

    function ask(){
        let [text, ...a] = qs[qi]

        order = env.shuffle(a.map((v, i) => i))
        q.innerHTML = (cfg.emoji ? `<div style="font-size:3em;line-height:1.2">${text}</div><div style="font-size:.6em;opacity:.6;margin-top:.2em">${cfg.prompt || ''}</div>` : text) + `<div style="font-size:.55em;opacity:.55;margin-top:.3em">${qi + 1}/${qs.length}${multi ? ' · ' + turn().name : ''}</div>`
        g.cells.forEach((c, i) => { c.textContent = a[order[i]]; c.style.background = '' })
        board.draw(qi % players.length)
        t0 = Date.now(); locked = false
    }

    function pick(i){
        if(locked) return
        locked = true

        let ok = i >= 0 && order[i] == 0, left = Math.max(0, limit - (Date.now() - t0)) / limit, p = turn()

        if(g.cells[i]) g.cells[i].style.background = ok ? '#2f9e44' : '#a82a2a'
        if(!ok) g.cells[order.indexOf(0)].style.background = '#2f9e44'

        if(ok){
            p.score += 50 + (left * 50 | 0)
            p.right++
            env.sfx('good')
        }
        else env.sfx('bad')

        env.score(multi ? Math.max(...players.map(x => x.score)) : p.score)
        board.draw(qi % players.length)

        env.after(() => {
            if(++qi < qs.length) return ask()

            if(multi){
                let v = verdict(players)

                env.over(v.text, v.win)
            }
            else env.over(`${p.right}/${qs.length} · ${p.score} ${t('hooktv_game_points', 'points')}`, p.right >= qs.length * .6)
        }, 900)
    }

    env.timer(() => {
        let l = 1 - (Date.now() - t0) / limit

        bar.style.transform = `scaleX(${Math.max(0, locked ? 0 : l)})`
        if(l <= 0 && !locked) pick(-1)
    }, 100)

    ask()
}

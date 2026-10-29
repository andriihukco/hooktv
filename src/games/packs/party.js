// Party games for a couch: Alias and Act It Out (words in rounds, solo, duo or teams) and Higher or Lower.
import {ALIAS, ACT} from '../data/words'
import {SETS} from '../data/facts'
import {t} from '../shell'
import {roster, verdict, MODES, TEAMS} from '../quizkit'

const TIMES = [90, 60, 45]
const ROUNDS = {id: 'rounds', label: 'Turns each', def: 1, values: [{id: 2, label: '2'}, {id: 3, label: '3'}, {id: 5, label: '5'}]}
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))

const themes = (list, all) => ({id: 'theme', label: 'Theme', def: 0, values: [{id: 'all', label: all}].concat(list.map(s => ({id: s.id, label: s.title})))})

const btn = (act, text, color) => `<div class="games__btn" data-act="${act}" style="background:${color};font-size:1.3em;padding:.7em 1.4em">${text}</div>`

/**
 * One word game in turns. A player or team explains (Alias) or acts out (Act It Out) the words on screen while
 * the others guess; the one holding the device marks each word as guessed or skipped before the clock runs out.
 * @param {object} env game environment
 * @param {object} cfg {sets, penalty: skipping costs a point, verb}
 */
function wordParty(env, cfg){
    let players = roster(env), multi = players.length > 1
    let pool = env.opts.theme == 'all' ? cfg.sets.reduce((all, s) => all.concat(s.words), []) : cfg.sets.find(s => s.id == env.opts.theme).words
    let deck = env.shuffle(pool), at = 0
    let turns = players.length * (+env.opts.rounds || 3), turn = 0, left = 0, state = 'ready', run = null
    let el = document.createElement('div')

    el.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7em;text-align:center;padding:4%;box-sizing:border-box'
    env.el.appendChild(el)

    const word = () => { if(at >= deck.length){ deck = env.shuffle(pool); at = 0 } return deck[at++] }
    const who = () => players[turn % players.length]
    const total = p => p.score

    const strip = () => multi ? `<div style="display:flex;gap:.5em;font-size:.8em;margin-bottom:.4em">${players.map(p => `<div style="padding:.25em .8em;border-radius:99em;background:${p == who() ? p.color : 'rgba(255,255,255,.08)'};font-weight:700">${esc(p.name)} · ${total(p)}</div>`).join('')}</div>` : ''

    function ready(){
        state = 'ready'
        let round = Math.floor(turn / players.length) + 1

        el.innerHTML = `${strip()}
            <div style="font-size:.8em;opacity:.55;letter-spacing:.1em;text-transform:uppercase">${t('hooktv_game_turn', 'Turn')} ${turn + 1}/${turns}</div>
            <div style="font-size:2.4em;font-weight:800;color:${who().color}">${esc(who().name)}</div>
            <div style="opacity:.65;max-width:24em;line-height:1.4">${cfg.verb}</div>
            ${btn('go', t('hooktv_game_start', 'Start') + ' · ' + TIMES[env.level] + 's', 'var(--accent,#C8F542);color:#0B0F00')}`
        env.score(multi ? Math.max(...players.map(total)) : who().score)
    }

    function begin(){
        state = 'play'
        left = TIMES[env.level]
        run = {right: [], skipped: [], word: word()}
        paint()
    }

    function paint(){
        if(state != 'play') return

        el.innerHTML = `${strip()}
            <div data-t style="font-size:1.6em;font-weight:800;font-variant-numeric:tabular-nums;color:${left <= 10 ? '#FF453A' : '#fff'}">${Math.ceil(left)}</div>
            <div style="font-size:3em;font-weight:800;line-height:1.1;margin:.2em 0;max-width:90%">${esc(run.word)}</div>
            <div style="opacity:.55;font-size:.9em">${t('hooktv_game_guessed', 'Guessed')}: ${run.right.length}${cfg.penalty ? ' · ' + t('hooktv_game_skipped', 'Skipped') + ': ' + run.skipped.length : ''}</div>
            <div style="display:flex;gap:.8em;margin-top:.4em">${btn('skip', '✗ ' + t('hooktv_game_skip', 'Skip'), 'rgba(255,255,255,.14)')}${btn('ok', '✓ ' + t('hooktv_game_got', 'Got it'), '#2f9e44')}</div>`
    }

    function mark(right){
        if(state != 'play') return

        ;(right ? run.right : run.skipped).push(run.word)
        env.sfx(right ? 'good' : 'tap')
        run.word = word()
        paint()
    }

    function finish(){
        state = 'summary'

        let p = who(), gained = run.right.length - (cfg.penalty ? run.skipped.length : 0)

        p.score = Math.max(0, p.score + gained)
        env.sfx('win')
        el.innerHTML = `${strip()}
            <div style="font-size:.8em;opacity:.55;letter-spacing:.1em;text-transform:uppercase">${t('hooktv_game_time_up', 'Time is up')}</div>
            <div style="font-size:2.2em;font-weight:800;color:${p.color}">${esc(p.name)}: ${gained >= 0 ? '+' : ''}${gained}</div>
            <div style="max-width:90%;font-size:.85em;opacity:.7;line-height:1.5">${run.right.map(w => '✓ ' + esc(w)).join(' &nbsp; ')}${run.skipped.length ? '<br>' + run.skipped.map(w => '✗ ' + esc(w)).join(' &nbsp; ') : ''}</div>
            ${btn('next', ++turn < turns ? t('hooktv_game_next', 'Next') : t('hooktv_game_results', 'Results'), 'var(--accent,#C8F542);color:#0B0F00')}`
        env.score(multi ? Math.max(...players.map(total)) : p.score)
    }

    function next(){
        if(turn < turns) return ready()

        if(multi){
            let v = verdict(players)

            env.over(v.text, v.win)
        }
        else env.over(`${players[0].score} ${t('hooktv_game_points', 'points')}`, players[0].score >= turns * 5)
    }

    const action = name => {
        if(name == 'go' && state == 'ready') begin()
        else if(name == 'ok') mark(true)
        else if(name == 'skip') mark(false)
        else if(name == 'next' && state == 'summary') next()
    }

    el.addEventListener('click', e => {
        let b = e.target.closest('[data-act]')

        if(b) action(b.dataset.act)
    })
    env.on('press', k => {
        if(state == 'ready' && k == 'ok') action('go')
        else if(state == 'summary' && k == 'ok') action('next')
        else if(state == 'play' && (k == 'ok' || k == 'right' || k == 'up')) mark(true)
        else if(state == 'play' && (k == 'left' || k == 'down')) mark(false)
    })

    // the clock only runs while the game is not paused
    env.loop(dt => {
        if(state != 'play') return

        let before = Math.ceil(left)

        left -= dt
        if(left <= 0) return finish()
        if(Math.ceil(left) != before){
            let n = el.querySelector('[data-t]')

            if(n){ n.textContent = Math.ceil(left); n.style.color = left <= 10 ? '#FF453A' : '#fff' }
        }
    })

    ready()
}

/** Higher or Lower: is the next fact bigger or smaller? A wrong guess costs a life; in a duo the players take turns. */
function higherLower(env){
    let sets = env.opts.set == 'all' ? SETS : SETS.filter(s => s.id == env.opts.set)
    let set, a, b, locked = false
    let players = roster(env), multi = players.length > 1, turn = 0
    let lives = [3, 2, 1][env.level]

    players.forEach(p => p.lives = lives)

    let el = document.createElement('div')

    el.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5em;text-align:center;padding:4%;box-sizing:border-box'
    env.el.appendChild(el)

    const fmt = v => v >= 100 ? Math.round(v).toLocaleString('en') : String(v)
    const pickPair = () => {
        set = env.pick(sets)
        a = env.pick(set.items)
        do b = env.pick(set.items); while(b[1] == a[1])
    }
    const hearts = p => '❤'.repeat(p.lives) + '·'.repeat(lives - p.lives)

    function draw(reveal, ok){
        let p = players[turn]

        el.innerHTML = `<div style="display:flex;gap:.6em;font-size:.85em;margin-bottom:.3em">${players.map((q, i) => `<div style="padding:.25em .8em;border-radius:99em;background:${i == turn ? q.color : 'rgba(255,255,255,.08)'};font-weight:700">${multi ? esc(q.name) + ' · ' : ''}${q.score} · ${hearts(q)}</div>`).join('')}</div>
            <div style="opacity:.55;font-size:.8em;text-transform:uppercase;letter-spacing:.1em">${esc(set.title)} · ${esc(set.unit)}</div>
            <div style="font-size:1.9em;font-weight:800">${esc(a[0])}</div>
            <div style="font-size:2.4em;font-weight:800;color:#64D2FF">${fmt(a[1])}</div>
            <div style="opacity:.5;font-size:.9em">${t('hooktv_game_vs', 'compared to')}</div>
            <div style="font-size:1.9em;font-weight:800">${esc(b[0])}</div>
            <div style="font-size:2.4em;font-weight:800;color:${reveal ? (ok ? '#30D158' : '#FF453A') : '#fff'}">${reveal ? fmt(b[1]) : '?'}</div>
            ${reveal ? '' : `<div style="display:flex;gap:.8em;margin-top:.3em">${btn('up', '▲ ' + t('hooktv_game_higher', 'Higher'), '#2f9e44')}${btn('down', '▼ ' + t('hooktv_game_lower', 'Lower'), '#a82a2a')}</div>`}`
    }

    function guess(higher){
        if(locked) return
        locked = true

        let p = players[turn], ok = (b[1] > a[1]) == higher

        if(ok){ p.score++; env.sfx('good') }
        else { p.lives--; env.sfx('bad') }

        env.score(multi ? Math.max(...players.map(x => x.score)) : p.score)
        draw(true, ok)

        env.after(() => {
            let out = players.find(x => x.lives <= 0)

            if(out){
                if(!multi) return env.over(`${t('hooktv_game_streak', 'Correct')} ${p.score}`, p.score >= 10)

                let rest = players.filter(x => x.lives > 0)

                if(rest.length == 1) return env.over(`${rest[0].name} ${t('hooktv_game_wins_word', 'wins')} · ${players.map(x => x.score).join(' : ')}`, true)
            }

            a = b
            locked = false
            turn = (turn + 1) % players.length
            while(players[turn].lives <= 0) turn = (turn + 1) % players.length
            do b = env.pick(set.items); while(b[1] == a[1])
            draw()
        }, 1300)
    }

    el.addEventListener('click', e => {
        let n = e.target.closest('[data-act]')

        if(n) guess(n.dataset.act == 'up')
    })
    env.on('press', k => {
        if(k == 'up' || k == 'right') guess(true)
        else if(k == 'down' || k == 'left') guess(false)
    })

    pickPair()
    draw()
}

export default [
    {
        id: 'alias', title: 'Alias', emoji: '🗣️', c1: '#FF9F0A', c2: '#FF375F', size: [100, 78], levels: true, modes: MODES,
        hint: 'Explain the word without saying it · your team guesses before the clock runs out',
        options: [themes(ALIAS, 'Everything'), ROUNDS, TEAMS],
        start: env => wordParty(env, {sets: ALIAS, penalty: true, verb: t('hooktv_game_alias_how', 'Explain each word with other words. Do not say the word itself — skipping costs a point.')})
    },
    {
        id: 'charades', title: 'Act It Out', emoji: '🎭', c1: '#BF5AF2', c2: '#FF375F', size: [100, 78], levels: true, modes: MODES,
        hint: 'Act it out without a sound · your team guesses before the clock runs out',
        options: [themes(ACT, 'Everything'), ROUNDS, TEAMS],
        start: env => wordParty(env, {sets: ACT, penalty: false, verb: t('hooktv_game_act_how', 'Show each prompt with gestures only. No sounds, no words.')})
    },
    {
        id: 'higher_lower', title: 'Higher or Lower', emoji: '📊', c1: '#64D2FF', c2: '#5E5CE6', size: [100, 80], levels: true,
        modes: [{id: 'solo', label: 'Solo'}, {id: 'duo', label: 'Duo'}],
        hint: 'Is the next one higher or lower? Wrong guesses cost a life',
        options: [{id: 'set', label: 'Topic', def: 0, values: [{id: 'all', label: 'Mixed'}].concat(SETS.map(s => ({id: s.id, label: s.title})))}],
        start: higherLower
    }
]

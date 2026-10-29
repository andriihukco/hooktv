import Controller from '../core/controller'
import Lang from '../core/lang'
import Platform from '../core/platform'
import catalog, {gameTitle, gameHint, setTranslator} from './catalog'
import {iconHTML} from './icons'
import {best, history, sound, config, duration, ago} from './store'
import {lobby, menu, t, levelName, levelMult, modeName} from './shell'
import {C} from './draw'
import {SKINS, skinById, skinName, ending, film, award} from './cinema'
import {rulesOf} from './rules'
import Screensaver from '../interaction/screensaver'

// the games show the interface language; a key the pack lacks keeps the English title
setTranslator((key, fallback)=>{
    let text = Lang.translate(key)

    return text == key ? fallback : text
})

// Full-screen game player. Games get `env` (see start() below) and never touch the app's controller:
// while a game is open this module owns the keyboard, so TV remotes, keyboards, touch and mouse all reach the game.
const KEYS = {37: 'left', 38: 'up', 39: 'right', 40: 'down', 65: 'left', 87: 'up', 68: 'right', 83: 'down', 13: 'ok', 32: 'ok', 29443: 'ok', 117: 'ok', 65385: 'ok', 29460: 'up', 29461: 'down', 4: 'left', 5: 'right'}
const BACK = [27, 461, 10009]
// shared shortcuts. Letters only work in games that do not take typing; the remote's colour and media keys always do.
//   red = restart · green = pause · yellow = help · blue = the game's own switch (flag mode, ...)
const ACT = {82: ['restart', 1], 80: ['pause', 1], 72: ['help', 1], 191: ['help', 1], 77: ['mute', 1], 403: ['restart'], 404: ['pause'], 405: ['help'], 457: ['help'], 406: ['alt'], 19: ['pause'], 415: ['pause'], 10252: ['pause'], 179: ['pause']}

let root, play, current, session, prev, settings
const basePalette = Object.assign({}, C)

// a film skin: the canvas games take its palette, everything else its CSS (tint, vignette, grain, accent)
function applySkin(id){
    let skin = skinById(id)

    SKINS.forEach(s => root.removeClass('games--skin-' + s.id))
    root.addClass('games--skin-' + skin.id)
    root[0].style.setProperty('--accent', skin.accent || '')
    if(!skin.accent) root[0].style.removeProperty('--accent')
    Object.assign(C, basePalette, skin.palette || {})
}
let muted = sound.get()

let audio
function sfx(kind){
    if(muted) return

    try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)()
        let [f, d, t] = {tap: [520, .05, 'sine'], good: [760, .09, 'triangle'], bad: [140, .2, 'sawtooth'], win: [980, .3, 'triangle'], pop: [340, .06, 'square']}[kind] || [440, .05, 'sine']
        let o = audio.createOscillator(), g = audio.createGain()
        o.type = t; o.frequency.value = f
        g.gain.setValueAtTime(.06, audio.currentTime)
        g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + d)
        o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + d)
    } catch(e){}
}

// how this device is played: a phone / tablet (touch), a TV (remote) or a computer (keyboard and mouse)
function mode(){
    // a finger on the glass first: some phones' user agents look like a TV box
    if(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return 'touch'
    if(Platform.tv()) return 'tv'

    return 'desk'
}

const cap = t => `<kbd>${t}</kbd>`
const dot = c => `<i class="games__dot games__dot--${c}"></i>`

// the instructions page: one row per thing the player can do, with the keys for the device in hand
function helpHTML(game, kind){
    let rows = {
        desk: [
            ['move', cap('←') + cap('↑') + cap('↓') + cap('→') + `<span>/</span>` + cap('W') + cap('A') + cap('S') + cap('D')],
            ['action', cap('Enter') + cap('Space') + `<span>/ ${Lang.translate('hooktv_help_click')}</span>`],
            ['restart', cap('R')], ['pause', cap('P')], ['help', cap('H') + cap('?')], ['mute', cap('M')], ['back', cap('Esc')]
        ],
        tv: [
            ['move', cap('◀') + cap('▲') + cap('▼') + cap('▶')],
            ['action', cap('OK')],
            ['restart', dot('red')], ['pause', dot('green')], ['help', dot('yellow')], ['alt', dot('blue')], ['back', cap('Back')]
        ],
        touch: [
            ['move', `<span>${Lang.translate(game.swipe ? 'hooktv_help_swipe' : 'hooktv_help_tap')}</span>` + (game.pad ? cap('✥') : '')],
            ['action', `<span>${Lang.translate('hooktv_help_tap')}</span>`],
            ['restart', cap('↻')], ['pause', cap('❚❚')], ['help', cap('?')], ['back', cap('‹')]
        ]
    }[kind]

    return `<div class="games__sheet-t">${gameTitle(game)}</div>
        <div class="games__sheet-s">${gameHint(game)}</div>
        <div class="games__sheet-h">${Lang.translate('hooktv_help_title')} · ${Lang.translate('hooktv_help_' + (kind == 'tv' ? 'remote' : kind == 'touch' ? 'touch' : 'keyboard'))}</div>
        ${rows.map(([name, keys]) => `<div class="games__sheet-r"><span>${Lang.translate('hooktv_help_' + name)}</span><div>${keys}</div></div>`).join('')}`
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))

// the scores page: the award won so far, the record and the latest runs
function scoresHTML(game){
    let s = history.stats(game.id), runs = history.of(game.id, 6)
    let stat = (label, value) => `<div class="games__score-card"><b>${esc(value)}</b><span>${esc(label)}</span></div>`
    const runRow = r => `<div class="games__run${r.win ? ' games__run--win' : ''}"><b>${esc(r.score)}</b><span>${esc(levelName(r.level == null ? 1 : r.level))}${r.mode && r.mode != 'solo' ? ' · ' + esc(modeName(r.mode)) : ''}</span><i>${esc(ago(r.at))}</i></div>`

    return `<div class="games__sheet-t">${t('hooktv_game_scores', 'Scores')}</div>
        <div class="games__award">${esc(award(s.plays, s.wins))}</div>
        <div class="games__scores">
            ${stat(t('hooktv_best', 'Best'), s.best)}
            ${stat(t('hooktv_game_played', 'Played'), s.plays)}
            ${stat(t('hooktv_game_wins', 'Wins'), s.wins)}
            ${stat(t('hooktv_game_time', 'Time'), duration(s.ms))}
        </div>
        <div class="games__runs">
            <div class="games__runs-t">${t('hooktv_game_recent', 'Recent runs')}</div>
            ${runs.length ? runs.map(runRow).join('') : `<div class="games__runs-none">${t('hooktv_game_no_runs', 'No runs yet — go set the first score')}</div>`}
        </div>`
}

// the strip under the board: keycaps for the device in hand
function keysHTML(kind){
    if(kind == 'touch') return ''

    if(kind == 'tv') return `${cap('◀▲▼▶')} ${Lang.translate('hooktv_help_move')} ${cap('OK')} ${Lang.translate('hooktv_help_action')} ${dot('red')} ${Lang.translate('hooktv_help_restart')} ${dot('green')} ${Lang.translate('hooktv_help_pause')} ${dot('yellow')} ${Lang.translate('hooktv_help_help')}`

    return `${cap('←↑↓→')} ${Lang.translate('hooktv_help_move')} ${cap('Space')} ${Lang.translate('hooktv_help_action')} ${cap('R')} ${Lang.translate('hooktv_help_restart')} ${cap('P')} ${Lang.translate('hooktv_help_pause')} ${cap('H')} ${Lang.translate('hooktv_help_help')}`
}

function build(){
    root = $(`<div class="games">
        <div class="games__bar">
            <div class="games__menu-btn selector" data-act="menu" title="${t('hooktv_game_menu', 'Menu')}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>${t('hooktv_game_menu', 'Menu')}</span></div>
            <div class="games__icon"></div>
            <div class="games__title"></div>
            <div class="games__tag"></div>
            <div class="games__stat"><span>${Lang.translate('hooktv_score')}</span><b class="games__score">0</b></div>
            <div class="games__stat"><span>${Lang.translate('hooktv_best')}</span><b class="games__best">0</b></div>
        </div>
        <div class="games__wrap"><div class="games__play"></div></div>
        <div class="games__hint"></div>
        <div class="games__keys"></div>
        <div class="games__sheet"></div>
        <div class="games__pad">
            <div class="games__dpad"><i data-k="up"></i><i data-k="left"></i><i data-k="ok"></i><i data-k="right"></i><i data-k="down"></i></div>
        </div>
    </div>`)
    root.on('click', '[data-act]', function(){
        let act = this.dataset.act

        if(act == 'close') close()
        else if(act == 'restart') session ? session.act('restart') : launch(current)
        else if(session) session.act(act)
    })
    // a tap on the dark backdrop goes back a page, or closes the menu; taps inside the panel stay in it
    root.on('click', '.games__sheet', function(e){ if(e.target === this && session) session.back() })
}

// Arcade games with a world of their own (lanes, a sky, a field) fill the whole screen once they start;
// the grid games keep a framed board so the play area stays readable.
const FRAMED = ["tetris", "snake", "pacman"]
const fills = game => game.kind == "arcade" && FRAMED.indexOf(game.id) < 0

function fit(){
    if(!play || !current) return
    let wrap = root.find('.games__wrap')[0], [w, h] = current.size
    let s = Math.min(wrap.clientWidth / w, wrap.clientHeight / h)
    play.style.width = w * s + 'px'
    play.style.height = h * s + 'px'
    play.style.fontSize = Math.max(8, w * s / 36) + 'px'
    play.style.setProperty('--s', s)
    session && session.resize && session.resize()
}

// cfg: the settings to play with right away; without it the lobby opens first and the player chooses
function launch(game, cfg){
    teardown()
    current = game
    play = root.find('.games__play').empty()[0]
    root.find('.games__icon').html(iconHTML(game.id))
    root.find('.games__title').text(gameTitle(game))
    root.find('.games__hint').text(gameHint(game))
    root.find('.games__keys').html(keysHTML(mode()))
    root.find('.games__sheet').removeClass('games__sheet--on').empty()
    root.toggleClass('games--pad', !!game.pad)
    root.find('.games__score').text(0)
    root.find('.games__best').text(best.get(game.id))
    root.find('.games__tag').text('')
    root.find('.games__lobby').remove()
    root.removeClass('games--fill')
    root.toggleClass('games--lobby', !cfg)
    applySkin(cfg ? cfg.skin : config.get(game).skin)
    fit()

    let listeners = [], rafs = 0, held = {}, dead = false, score = 0, paused = false, loopFn, last = 0, finished = false, overlay = null
    let handlers = {press: [], key: [], resize: [], alt: []}, modal = null
    let ui = null, lobbyUi = null, began = false, started = 0, bestAtStart = best.get(game.id), stopFn, recorded = false, starting = false

    let env = {
        el: play, held, game,
        on: (type, fn) => handlers[type].push(fn),
        sfx,
        rnd: (n, m) => m === undefined ? Math.floor(Math.random() * n) : n + Math.random() * (m - n),
        pick: a => a[Math.floor(Math.random() * a.length)],
        shuffle: a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ let j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a },
        score(n, add){
            score = add ? score + n : n
            root.find('.games__score').text(score)
            if(score > best.get(game.id)){ best.set(game.id, score); root.find('.games__best').text(score) }
            return score
        },
        get points(){ return score },
        timer(fn, ms){ let t = setInterval(fn, ms); listeners.push(() => clearInterval(t)); return t },
        after(fn, ms){ let t = setTimeout(() => !dead && fn(), ms); listeners.push(() => clearTimeout(t)); return t },
        loop(fn){
            loopFn = fn; last = performance.now()
            const tick = t => {
                if(dead) return
                rafs = requestAnimationFrame(tick)
                let dt = Math.min(.05, (t - last) / 1000); last = t
                if(!paused) fn(dt)
            }
            rafs = requestAnimationFrame(tick)
        },
        // a canvas drawn in the game's logical size, sharp on any screen; cv.pt(e) maps pointer to logical units
        canvas(){
            let [w, h] = game.size, cv = document.createElement('canvas'), ctx = cv.getContext('2d')
            const size = () => {
                let r = Math.min(2, window.devicePixelRatio || 1), px = play.clientWidth * r
                cv.width = Math.round(px); cv.height = Math.round(px * h / w)
                ctx.setTransform(cv.width / w, 0, 0, cv.height / h, 0, 0)
            }
            cv.className = 'games__canvas'
            cv.pt = e => { let b = cv.getBoundingClientRect(); return {x: (e.clientX - b.left) / b.width * w, y: (e.clientY - b.top) / b.height * h} }
            play.appendChild(cv); size(); handlers.resize.push(size)
            return {cv, ctx, w, h}
        },
        // DOM grid of selectable cells: arrows move the focus, OK / click picks. Returns {cells, focus(i), set}
        grid(cols, rows, make, pick, opts = {}){
            let el = document.createElement('div'), cells = [], at = opts.start || 0
            el.className = 'games__grid ' + (opts.cls || '')
            el.style.cssText = `grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);${opts.css || ''}`
            for(let i = 0; i < cols * rows; i++){
                let c = document.createElement('div'); c.className = 'games__cell'; make && make(c, i); c.onclick = () => { api.focus(i); pick && pick(i) }
                el.appendChild(c); cells.push(c)
            }
            const api = {
                el, cells, cols, rows, at: () => at,
                focus(i){ cells[at].classList.remove('focus'); at = i; cells[at].classList.add('focus') }
            }
            if(!opts.static) cells[at].classList.add('focus')
            ;(opts.parent || play).appendChild(el)
            if(!opts.static) handlers.press.push(k => {
                if(opts.off && opts.off()) return
                let x = at % cols, y = Math.floor(at / cols)
                if(k == 'left') x = (x + cols - 1) % cols
                else if(k == 'right') x = (x + 1) % cols
                else if(k == 'up') y = (y + rows - 1) % rows
                else if(k == 'down') y = (y + 1) % rows
                else if(k == 'ok') return pick && pick(at)
                api.focus(y * cols + x)
            })
            return api
        },
        // a row of buttons (menus, choices); arrows move, OK picks
        buttons(items, pick, opts = {}){
            let el = document.createElement('div'), at = 0, bs = []
            el.className = 'games__buttons ' + (opts.cls || '')
            items.forEach((t, i) => {
                let b = document.createElement('div'); b.className = 'games__btn'; b.innerHTML = t; b.onclick = () => { api.focus(i); pick(i) }
                el.appendChild(b); bs.push(b)
            })
            const api = {el, bs, focus(i){ bs[at].classList.remove('focus'); at = i; bs[at].classList.add('focus') }, close(){ el.style.display = 'none'; if(modal === api) modal = null }, remove(){ api.close(); el.remove(); modal = modal === api ? null : modal; handlers.press = handlers.press.filter(f => f !== api.key) }}
            bs[0].classList.add('focus')
            ;(opts.parent || play).appendChild(el)
            // modal buttons take every key until closed (a start menu); others only react to touch / mouse
            if(opts.modal) modal = api
            api.key = k => {
                if(k == 'left' || k == 'up') api.focus((at + bs.length - 1) % bs.length)
                else if(k == 'right' || k == 'down') api.focus((at + 1) % bs.length)
                else if(k == 'ok') pick(at)
            }
            if(!opts.nokeys && !opts.modal) handlers.press.push(api.key)
            return api
        },
        // a text field for typing games: always focused on desktop, tap to open the keyboard on phones
        input(placeholder){
            let i = document.createElement('input')
            i.className = 'games__input'; i.placeholder = placeholder || ''
            i.autocomplete = 'off'; i.autocapitalize = 'off'; i.spellcheck = false
            play.appendChild(i)
            let fine = window.matchMedia('(pointer: fine)').matches
            if(fine){ i.onblur = () => setTimeout(() => !dead && i.isConnected && i.focus(), 30); i.focus() }
            return i
        },
        // ends the round: records the run and shows the result card (play again, settings, exit)
        over(text, win){
            if(dead || finished) return
            if(overlay) hideSheet()
            paused = true; modal = null; finished = true
            sfx(win ? 'win' : 'bad')
            record(win)
            let fresh = score > bestAtStart && score > 0
            let card = document.createElement('div')
            card.className = 'games__over'
            card.innerHTML = `${ending(skinById(settings.skin), win) ? `<div class="games__end">${ending(skinById(settings.skin), win)}</div>` : ''}<div class="games__over-t">${text || Lang.translate('hooktv_game_over')}</div><div class="games__over-s">${Lang.translate('hooktv_score')} ${score} · ${Lang.translate('hooktv_best')} ${best.get(game.id)}</div>${fresh ? `<div class="games__badge">${t('hooktv_game_new_best', 'New best!')}</div>` : ''}`
            let m = menu([Lang.translate('hooktv_play_again'), t('hooktv_game_settings', 'Settings'), t('hooktv_game_exit', 'Exit')], i => i == 0 ? launch(game, settings) : i == 1 ? launch(game) : close())
            card.appendChild(m.el)
            play.appendChild(card)
            handlers.press.length = 0; handlers.key.length = 0
            ui = m
        },
        pause: v => paused = v,
        resize: fn => handlers.resize.push(fn)
    }

    // the menu over the board: one panel with everything the player can do. Scores, hints, instructions and
    // rules open their own page with a Back button; while the menu is up, the keys and taps go to it, not the game
    let view = 'main', saved = null
    const MAIN = [
        ['resume', t('hooktv_game_resume', 'Resume')],
        ['restart', Lang.translate('hooktv_help_restart')],
        ['settings', t('hooktv_game_settings', 'Settings')],
        ['scores', t('hooktv_game_scores', 'Scores')],
        ['hints', t('hooktv_game_hints', 'Hints')],
        ['help', t('hooktv_game_instructions', 'Instructions')],
        ['rules', t('hooktv_game_rules', 'Rules')],
        ['exit', t('hooktv_game_leave', 'Leave game')]
    ]
    const page = name => {
        if(name == 'scores') return scoresHTML(game)
        if(name == 'hints') return `<div class="games__sheet-t">${t('hooktv_game_hints', 'Hints')}</div><div class="games__sheet-s">${gameHint(game)}</div><div class="games__sheet-s">${film(game).line}</div>`
        if(name == 'rules') return `<div class="games__sheet-t">${t('hooktv_game_rules', 'Rules')}</div><div class="games__sheet-s">${rulesOf(game)}</div>`
        if(name == 'help') return helpHTML(game, mode())

        return `<div class="games__sheet-t">${gameTitle(game)}</div><div class="games__sheet-s">${film(game).genre} · ${Lang.translate('hooktv_paused')}</div>`
    }
    const openMenu = (name = 'main') => {
        let el = root.find('.games__sheet')

        // the lobby's controls come back when the menu closes
        if(!overlay) saved = ui

        overlay = 'menu'; view = name
        paused = true
        el.empty()

        let card = $('<div class="games__sheet-card games__sheet-card--menu"></div>').html(page(name))
        let items = name == 'main' ? MAIN.map(([, label]) => label) : [t('hooktv_game_back', 'Back')]
        let m = menu(items, i => {
            if(view != 'main') return openMenu('main')

            let id = MAIN[i][0]

            if(id == 'resume') hideSheet()
            else if(id == 'restart') launch(game, settings)
            else if(id == 'settings') launch(game)
            else if(id == 'exit') close()
            else openMenu(id)
        })

        card.append(m.el)
        el.append(card).addClass('games__sheet--on')
        ui = m
    }
    const hideSheet = () => {
        if(!overlay) return false

        overlay = null; view = 'main'
        ui = saved; saved = null
        paused = finished
        last = performance.now()
        root.find('.games__sheet').removeClass('games__sheet--on').empty()

        return true
    }
    const act = name => {
        if(dead) return
        if(name == 'mute'){ muted = !muted; sound.set(muted); return }
        // the menu opens from the lobby too (to leave, to read the rules), but never over the title card
        if(name == 'menu' || name == 'pause' || name == 'help'){
            if(starting || (finished && !overlay)) return
            if(overlay) return hideSheet()
            return openMenu(name == 'help' ? 'help' : 'main')
        }
        if(name == 'restart') return launch(game, settings)
        if(!began || starting) return
        if(name == 'alt') return handlers.alt.forEach(f => f())
        if(finished) return
    }
    // games that read the keyboard (letters, numbers, a text field) keep the letter shortcuts for themselves
    const typing = () => handlers.key.length > 0 || !!play.querySelector('input')

    const press = k => { if(dead) return; if(ui) return ui.key(k); if(overlay) return k == 'ok' && hideSheet(); if(modal) modal.key(k); else handlers.press.slice().forEach(f => f(k)) }
    const down = e => {
        if(BACK.indexOf(e.keyCode) > -1) return
        e.stopImmediatePropagation()
        let field = e.target && e.target.tagName == 'INPUT'
        let a = ACT[e.keyCode]

        if(a && !e.repeat && !(field && a[1]) && !(a[1] && typing()) && !e.ctrlKey && !e.metaKey && !e.altKey){
            e.preventDefault()
            return act(a[0])
        }

        // typing in a text field: the field keeps the key; the game only sees it
        if(field){ handlers.key.forEach(f => f(e)); return }
        let k = KEYS[e.keyCode]
        if(e.keyCode == 32 || k) e.preventDefault()
        if(ui || overlay){ if(k) press(k); else if(e.keyCode == 13 && overlay && !ui) hideSheet(); return }
        if(k) held[k] = 1
        if(k && !e.repeat) press(k)
        else if(k && e.repeat && game.repeat !== false) press(k)
        handlers.key.forEach(f => f(e))
    }
    const up = e => { if(BACK.indexOf(e.keyCode) > -1) return; e.stopImmediatePropagation(); if(e.target && e.target.tagName == 'INPUT') return; let k = KEYS[e.keyCode]; if(k) held[k] = 0 }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    listeners.push(() => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true) })

    // touch: swipes and the on-screen pad
    if(game.swipe){
        let sx, sy
        const ts = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
        const te = e => {
            let t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy
            if(Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
            press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'))
        }
        play.addEventListener('touchstart', ts, {passive: true}); play.addEventListener('touchend', te, {passive: true})
    }
    root.find('.games__dpad i').off().on('pointerdown', function(e){ e.preventDefault(); held[this.dataset.k] = 1; press(this.dataset.k) })
        .on('pointerup pointerleave pointercancel', function(){ held[this.dataset.k] = 0 })

    // a run that ends in the game's own over() is recorded there; one that is left half way is recorded here
    const record = win => {
        if(!began || recorded) return
        recorded = true
        history.add({game: game.id, score, level: settings.level, mode: settings.mode || 'solo', win: !!win, ms: Date.now() - started})
    }

    session = {
        act,
        // Back: a menu page goes back to the menu, the menu closes, and only then does the game get left
        back: () => { if(overlay && view != 'main'){ openMenu('main'); return true } return hideSheet() },
        resize: () => handlers.resize.forEach(f => f()),
        stop(){
            if(began && !finished && score > 0 && Date.now() - started > 5000) record(false)
            dead = true
            cancelAnimationFrame(rafs)
            listeners.forEach(f => f())
            try { stopFn && stopFn() } catch(e){}
        }
    }

    // the lobby is done: a title card in the skin's voice, then the game starts with the chosen settings
    const begin = chosen => {
        settings = chosen
        began = true
        ui = null
        if(lobbyUi) lobbyUi.destroy()
        lobbyUi = null
        root.removeClass('games--lobby')
        root.toggleClass('games--fill', fills(game))
        root[0].style.setProperty('--game-c1', game.c1)
        root[0].style.setProperty('--game-c2', game.c2)
        applySkin(chosen.skin)
        root.find('.games__tag').text([levelName(chosen.level), chosen.mode && chosen.mode != 'solo' ? modeName(chosen.mode) : '', chosen.skin != 'classic' ? skinName(skinById(chosen.skin)) : ''].filter(Boolean).join(' · '))
        fit()
        env.opts = chosen
        env.level = chosen.level
        env.mult = levelMult(chosen.level)
        env.mode = chosen.mode || 'solo'

        const go = () => {
            if(dead || !starting) return
            starting = false
            ui = null
            card.remove()
            started = Date.now()
            stopFn = game.start(env)
        }
        let card = document.createElement('div')

        if(chosen.intro == 'off'){ starting = true; return go() }

        let skin = skinById(chosen.skin), poster = film(game)

        card.className = 'games__card'
        card.innerHTML = `<i class="games__card-bar"></i><div class="games__card-c">${t('hooktv_skin_chapter_' + skin.id, skin.chapter)}</div><div class="games__card-t">${gameTitle(game)}</div><div class="games__card-s">${poster.line}</div><i class="games__card-bar"></i>`
        card.addEventListener('click', go)
        play.appendChild(card)
        starting = true
        ui = {key: () => go()}
        let timer = setTimeout(go, 2400)
        listeners.push(() => clearTimeout(timer))
    }

    if(cfg) begin(cfg)
    else {
        lobbyUi = lobby(game, begin, {change: c => applySkin(c.skin)})
        ui = lobbyUi
        root.find('.games__bar').after(lobbyUi.el)
    }
}

function teardown(){
    if(session){ session.stop(); session = null }
}

function open(id){
    let game = catalog.find(g => g.id == id)
    if(!game) return
    if(!root) build()
    prev = Controller.enabled().name
    $('body').append(root)
    root.addClass('games--on')
    Controller.add('games', {toggle(){}, back: () => { if(!(session && session.back())) close() }})
    Controller.toggle('games')
    window.addEventListener('resize', fit)
    // the screen belongs to the game while it is open: the screensaver waits for the player to leave
    Screensaver.suspend()
    goFullscreen(true)
    launch(game)
}

// the browser's own full screen while a game is open (where the browser allows it); the page is full-screen either way
function goFullscreen(on){
    try {
        let el = document.documentElement

        if(on && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(()=>{})
        if(!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{})
    } catch(e){}
}

function close(){
    teardown()
    Screensaver.resume()
    goFullscreen(false)
    Object.assign(C, basePalette)
    window.removeEventListener('resize', fit)
    root.removeClass('games--on').detach()
    root.find('.games__play').empty()
    current = null
    Controller.toggle(prev || 'content')
}

const api = {open, close, best, ids: catalog.map(g => g.id)}

// handy for the console and smoke tests: HookGames.open('snake')
window.HookGames = api

export default api

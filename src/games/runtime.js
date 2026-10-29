import Controller from '../core/controller'
import Lang from '../core/lang'
import Platform from '../core/platform'
import catalog from './catalog'
import {iconHTML} from './icons'

// Full-screen game player. Games get `env` (see start() below) and never touch the app's controller:
// while a game is open this module owns the keyboard, so TV remotes, keyboards, touch and mouse all reach the game.
const KEYS = {37: 'left', 38: 'up', 39: 'right', 40: 'down', 65: 'left', 87: 'up', 68: 'right', 83: 'down', 13: 'ok', 32: 'ok', 29443: 'ok', 117: 'ok', 65385: 'ok', 29460: 'up', 29461: 'down', 4: 'left', 5: 'right'}
const BACK = [27, 461, 10009]
// shared shortcuts. Letters only work in games that do not take typing; the remote's colour and media keys always do.
//   red = restart · green = pause · yellow = help · blue = the game's own switch (flag mode, ...)
const ACT = {82: ['restart', 1], 80: ['pause', 1], 72: ['help', 1], 191: ['help', 1], 77: ['mute', 1], 403: ['restart'], 404: ['pause'], 405: ['help'], 457: ['help'], 406: ['alt'], 19: ['pause'], 415: ['pause'], 10252: ['pause'], 179: ['pause']}

let root, play, current, session, prev
let muted = false
try { muted = localStorage.getItem('hooktv_game_muted') == '1' } catch(e){}

const best = {
    get: id => { try { return +localStorage.getItem('hooktv_game_' + id) || 0 } catch(e){ return 0 } },
    set: (id, n) => { try { localStorage.setItem('hooktv_game_' + id, n) } catch(e){} }
}

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

// the help sheet: one row per thing the player can do, with the keys for the device in hand
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

    return `<div class="games__sheet-card">
        <div class="games__sheet-t">${game.title}</div>
        <div class="games__sheet-s">${game.hint || ''}</div>
        <div class="games__sheet-h">${Lang.translate('hooktv_help_title')} · ${Lang.translate('hooktv_help_' + (kind == 'tv' ? 'remote' : kind == 'touch' ? 'touch' : 'keyboard'))}</div>
        ${rows.map(([name, keys]) => `<div class="games__sheet-r"><span>${Lang.translate('hooktv_help_' + name)}</span><div>${keys}</div></div>`).join('')}
        <div class="games__sheet-f">${Lang.translate('hooktv_help_resume')}</div>
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
            <div class="games__back selector" data-act="close"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <div class="games__icon"></div>
            <div class="games__title"></div>
            <div class="games__stat"><span>${Lang.translate('hooktv_score')}</span><b class="games__score">0</b></div>
            <div class="games__stat"><span>${Lang.translate('hooktv_best')}</span><b class="games__best">0</b></div>
            <div class="games__back selector" data-act="help" title="${Lang.translate('hooktv_help_help')}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M9.2 9.2a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.1-1.5 2.1M12 17.6v.2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <div class="games__back selector" data-act="pause" title="${Lang.translate('hooktv_help_pause')}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M9 6v12M15 6v12" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></div>
            <div class="games__back selector" data-act="restart" title="${Lang.translate('hooktv_help_restart')}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
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
        else if(act == 'restart') launch(current)
        else if(session) session.act(act)
    })
    // a tap on the sheet closes it
    root.on('click', '.games__sheet', () => session && session.back())
}

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

function launch(game){
    teardown()
    current = game
    play = root.find('.games__play').empty()[0]
    root.find('.games__icon').html(iconHTML(game.id))
    root.find('.games__title').text(game.title)
    root.find('.games__hint').text(game.hint || '')
    root.find('.games__keys').html(keysHTML(mode()))
    root.find('.games__sheet').removeClass('games__sheet--on').empty()
    root.toggleClass('games--pad', !!game.pad)
    root.find('.games__score').text(0)
    root.find('.games__best').text(best.get(game.id))
    fit()

    let listeners = [], rafs = 0, held = {}, dead = false, score = 0, paused = false, loopFn, last = 0, finished = false, overlay = null
    let handlers = {press: [], key: [], resize: [], alt: []}, modal = null

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
        // ends the round: shows the result and a Play again button
        over(text, win){
            if(dead) return
            paused = true; modal = null; finished = true
            sfx(win ? 'win' : 'bad')
            let card = document.createElement('div')
            card.className = 'games__over'
            card.innerHTML = `<div class="games__over-t">${text || Lang.translate('hooktv_game_over')}</div><div class="games__over-s">${Lang.translate('hooktv_score')} ${score} · ${Lang.translate('hooktv_best')} ${best.get(game.id)}</div><div class="games__btn focus">${Lang.translate('hooktv_play_again')}</div>`
            card.lastChild.onclick = () => launch(game)
            play.appendChild(card)
            handlers.press.length = 0; handlers.key.length = 0
            handlers.press.push(k => { if(k == 'ok') launch(game) })
        },
        pause: v => paused = v,
        resize: fn => handlers.resize.push(fn)
    }

    // the sheet over the board: Help, or Paused. While it is up, OK / tap closes it and nothing reaches the game.
    const sheet = kind => {
        let el = root.find('.games__sheet')

        if(overlay == kind) return hideSheet()

        overlay = kind
        paused = true
        el.html(kind == 'help' ? helpHTML(game, mode()) : `<div class="games__sheet-card games__sheet-card--pause"><div class="games__sheet-t">${Lang.translate('hooktv_paused')}</div><div class="games__sheet-f">${Lang.translate('hooktv_help_resume')}</div></div>`).addClass('games__sheet--on')
    }
    const hideSheet = () => {
        if(!overlay) return false

        overlay = null
        paused = finished
        last = performance.now()
        root.find('.games__sheet').removeClass('games__sheet--on').empty()

        return true
    }
    const act = name => {
        if(dead) return
        if(name == 'restart') return launch(game)
        if(name == 'mute'){ muted = !muted; try { localStorage.setItem('hooktv_game_muted', muted ? '1' : '0') } catch(e){} return }
        if(name == 'alt') return handlers.alt.forEach(f => f())
        if(finished) return
        if(name == 'pause') sheet('pause')
        else if(name == 'help') sheet('help')
    }
    // games that read the keyboard (letters, numbers, a text field) keep the letter shortcuts for themselves
    const typing = () => handlers.key.length > 0 || !!play.querySelector('input')

    const press = k => { if(dead) return; if(overlay) return k == 'ok' && hideSheet(); if(modal) modal.key(k); else handlers.press.slice().forEach(f => f(k)) }
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
        if(overlay){ if(k == 'ok' || e.keyCode == 13) hideSheet(); return }
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

    session = {
        act,
        // Back: closes the sheet first, then leaves the game
        back: () => hideSheet(),
        resize: () => handlers.resize.forEach(f => f()),
        stop(){
            dead = true
            cancelAnimationFrame(rafs)
            listeners.forEach(f => f())
            try { stopFn && stopFn() } catch(e){}
        }
    }
    let stopFn = game.start(env)
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
    launch(game)
}

function close(){
    teardown()
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

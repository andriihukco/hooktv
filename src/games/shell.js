import {iconHTML, uiIcon} from './icons'
import {t, gameTitle, gameHint} from './i18n'
import {config, history, duration, ago} from './store'
import {SKINS, skinName} from './cinema'

// The console around a game: the lobby before it starts (mode, difficulty, options, your history),
// and the small menus on the pause and result cards. Everything here is DOM + a key handler;
// the runtime owns the keyboard and hands keys to whichever of these is up.

export {t}

export const LEVELS = [
    {id: 0, key: 'hooktv_level_easy', text: 'Easy', mult: .75},
    {id: 1, key: 'hooktv_level_normal', text: 'Normal', mult: 1},
    {id: 2, key: 'hooktv_level_hard', text: 'Hard', mult: 1.4}
]

export const levelName = level => t(LEVELS[level].key, LEVELS[level].text)
export const levelMult = level => LEVELS[level].mult

const MODE_TEXT = {solo: 'Solo', duo: 'Duo', teams: 'Teams', cpu: 'vs Computer', two: '2 Players', party: 'Party'}

export const modeName = mode => t('hooktv_mode_' + mode, MODE_TEXT[mode] || mode)

/** a game's settings as rows: [{id, label, values: [{id, text}], value}] */
export function rows(game, cfg){
    let list = []

    if(game.modes && game.modes.length > 1) list.push({
        id: 'mode', label: t('hooktv_game_mode', 'Mode'),
        values: game.modes.map(m => ({id: m.id, text: m.label || modeName(m.id)}))
    })

    if(game.levels) list.push({
        id: 'level', label: t('hooktv_game_level', 'Difficulty'),
        values: LEVELS.map(l => ({id: l.id, text: levelName(l.id)}))
    })

    ;(game.options || []).forEach(o => list.push({
        id: o.id, label: o.label, when: o.when,
        values: o.values.map(v => ({id: v.id, text: v.label}))
    }))

    list.push({
        id: 'skin', minor: true, label: t('hooktv_game_skin', 'Cinema style'),
        values: SKINS.map(s => ({id: s.id, text: skinName(s)}))
    }, {
        id: 'intro', minor: true, label: t('hooktv_game_intro', 'Title card'),
        values: [{id: 'on', text: t('hooktv_on', 'On')}, {id: 'off', text: t('hooktv_off', 'Off')}]
    })

    return list.map(r => Object.assign(r, {value: cfg[r.id]}))
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))

/**
 * The lobby: the game on the left (icon, name, its kind, the record), its settings and Play on the right.
 * Arrows move between rows and change values, OK on a row steps to its next value, OK on Play starts.
 * @param {object} game
 * @param {function} start called with the chosen settings
 * @param {{category: string, reset: boolean, change: function}} extra the folder's name, a reset link, a change listener
 * @returns {{el: HTMLElement, key: function, destroy: function}}
 */
export function lobby(game, start, extra = {}){
    let cfg = config.get(game)
    let all = rows(game, cfg), list = all
    // a row can depend on another one's value (the number of teams only matters in Teams mode)
    const visible = () => all.filter(r => !r.when || cfg[r.when.id] === r.when.value)
    let at = all.length, stats = history.stats(game.id)
    let el = document.createElement('div')

    el.className = 'games__lobby'

    // the record, no labels: a star for the best score, a play mark for rounds played, a cup for wins (the words are the tooltip)
    const stat = (icon, label, value) => `<div class="games__stat-i" title="${esc(label)}" aria-label="${esc(label)}: ${esc(value)}">${uiIcon(icon)}<b>${esc(value)}</b></div>`

    el.innerHTML = `
        <div class="games__hero">
            <div class="games__hero-icon">${iconHTML(game.id)}</div>
            <div class="games__hero-title">${esc(gameTitle(game))}</div>
            ${extra.category ? `<div class="games__hero-meta"><span class="games__pill">${esc(extra.category)}</span></div>` : ''}
            <div class="games__hero-hint">${esc(gameHint(game))}</div>
            <div class="games__stats">
                ${stat('star', t('hooktv_best', 'Best'), stats.best)}
                ${stats.plays ? stat('play_arrow', t('hooktv_game_played', 'Played'), stats.plays) : ''}
                ${stats.wins ? stat('emoji_events', t('hooktv_game_wins', 'Wins'), stats.wins) : ''}
                ${stats.ms ? stat('schedule', t('hooktv_game_time', 'Time'), duration(stats.ms)) : ''}
            </div>
        </div>
        <div class="games__side">
            <div class="games__settings"></div>
            <div class="games__play-btn" data-i="play">${uiIcon('play_arrow')}<span>${t('hooktv_game_play', 'Play')}</span></div>
            ${extra.reset ? `<div class="games__link" data-i="reset">${t('hooktv_game_reset', 'Reset history')}</div>` : ''}
        </div>`

    let box = el.querySelector('.games__settings'), play = el.querySelector('.games__play-btn')

    const paint = () => {
        list = visible()
        at = Math.min(at, list.length)
        box.innerHTML = list.map((r, i) => `<div class="games__row${i == at ? ' focus' : ''}${r.minor ? ' games__row--minor' : ''}${r.minor && (i == 0 || !list[i - 1].minor) ? ' games__row--first-minor' : ''}" data-i="${i}">
            <span>${esc(r.label)}</span>
            <div class="games__row-v"><i data-step="-1">‹</i><b>${esc(r.values.find(v => v.id === r.value).text)}</b><i data-step="1">›</i></div>
        </div>`).join('')
        play.classList.toggle('focus', at == list.length)
    }
    const step = (i, d) => {
        let r = list[i], n = r.values.length, k = r.values.findIndex(v => v.id === r.value)

        r.value = r.values[(k + d + n) % n].id
        cfg[r.id] = r.value
        config.set(game, cfg)
        if(extra.change) extra.change(cfg)
        paint()
    }
    const go = () => start(Object.assign({}, cfg))

    box.addEventListener('click', e => {
        let row = e.target.closest('.games__row')

        if(!row) return

        at = +row.dataset.i
        step(at, e.target.dataset.step ? +e.target.dataset.step : 1)
    })
    play.addEventListener('click', go)

    paint()

    return {
        el,
        key(k){
            if(k == 'up') at = (at + list.length + 1 - 1) % (list.length + 1)
            else if(k == 'down') at = (at + 1) % (list.length + 1)
            else if(k == 'left' && at < list.length) step(at, -1)
            else if(k == 'right' && at < list.length) step(at, 1)
            else if(k == 'ok') return at == list.length ? go() : step(at, 1)

            paint()
        },
        destroy(){ el.remove() }
    }
}

/**
 * A vertical menu on a card: items are strings, OK / tap picks. Returns the element and a key handler.
 */
export function menu(items, pick){
    let el = document.createElement('div'), at = 0

    el.className = 'games__menu'
    el.innerHTML = items.map((text, i) => `<div class="games__btn${i == 0 ? ' focus' : ''}" data-i="${i}">${esc(text)}</div>`).join('')

    const focus = i => {
        at = i
        Array.from(el.children).forEach((b, n) => b.classList.toggle('focus', n == i))
    }

    el.addEventListener('click', e => {
        let b = e.target.closest('.games__btn')

        if(b) pick(+b.dataset.i)
    })

    return {
        el,
        key(k){
            if(k == 'up' || k == 'left') focus((at + items.length - 1) % items.length)
            else if(k == 'down' || k == 'right') focus((at + 1) % items.length)
            else if(k == 'ok') pick(at)
        }
    }
}


/**
 * The console's panel of buttons (pause menu, result card): a row of round icon buttons with no labels, then one wide
 * primary button and a quiet ghost button. The icon row has one highlight that glides (and stretches) to the focused
 * icon, and a tooltip above it that names it. A finger can rest on the row and slide: the label follows, lifting the
 * finger picks. Up / down move between the rows, left / right inside the icons, OK / tap picks.
 * @param {Array<{id: string, icon: string, label: string, kind: 'primary'|'icon'|'ghost'}>} items
 * @param {function} pick called with the item's index
 * @returns {{el: HTMLElement, key: function}}
 */
export function panel(items, pick){
    let el = document.createElement('div')
    let icons = items.map((it, i) => it.kind == 'icon' ? i : -1).filter(i => i >= 0)
    let rest = items.map((it, i) => it.kind == 'icon' ? -1 : i).filter(i => i >= 0)
    // the visual order is the key order: icons, then the primary button, then the ghost one
    let lines = [icons, ...rest.sort((a, b) => (items[a].kind == 'primary' ? 0 : 1) - (items[b].kind == 'primary' ? 0 : 1)).map(i => [i])].filter(l => l.length)
    let at = rest.find(i => items[i].kind == 'primary')

    if(at === undefined) at = lines[0][0]

    let still = 0, lastTouch = 0, dragging = false
    const btn = (it, i) => `<div class="games__pbtn games__pbtn--${it.kind}" data-i="${i}" title="${esc(it.label)}" aria-label="${esc(it.label)}">${uiIcon(it.icon)}${it.kind == 'icon' ? '' : `<span>${esc(it.label)}</span>`}</div>`

    el.className = 'games__panel'
    el.innerHTML = lines.map(line => items[line[0]].kind == 'icon'
        ? `<div class="games__prow" style="--n:${line.length}"><i class="games__pind"><b></b></i><div class="games__ptip"><span></span></div>${line.map(i => btn(items[i], i)).join('')}</div>`
        : btn(items[line[0]], line[0])).join('')

    const row = el.querySelector('.games__prow'), ind = el.querySelector('.games__pind'), tip = el.querySelector('.games__ptip')
    const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let col = -1

    // the highlight slides to the new column, stretching into a pill half way (the morph), then settles
    const glide = to => {
        if(!row) return

        if(to < 0){ row.classList.remove('games__prow--on'); col = -1; return }

        let from = col, at2 = `translateX(${to * 100}%)`

        row.classList.add('games__prow--on')
        tip.style.transform = at2
        tip.firstElementChild.textContent = items[icons[to]].label

        if(from >= 0 && from != to && !calm && ind.animate) ind.animate([
            {transform: `translateX(${from * 100}%) scaleX(1)`},
            {transform: `translateX(${(from + to) / 2 * 100}%) scaleX(${1 + Math.min(1.2, Math.abs(to - from) * .5)})`, offset: .5},
            {transform: `translateX(${to * 100}%) scaleX(1)`}
        ], {duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)'})

        ind.style.transform = at2
        col = to
    }
    const focus = i => {
        at = i
        el.querySelectorAll('.games__pbtn').forEach(b => b.classList.toggle('focus', +b.dataset.i == i))
        glide(icons.indexOf(i))
    }
    const lineOf = i => lines.findIndex(l => l.includes(i))
    const under = e => {
        let r = row.getBoundingClientRect()

        return icons[Math.max(0, Math.min(icons.length - 1, Math.floor((e.clientX - r.left) / r.width * icons.length)))]
    }

    el.addEventListener('click', e => {
        let b = e.target.closest('.games__pbtn')

        // a finger already picked on lift: the click that follows must not pick twice
        if(b && Date.now() - lastTouch > 500) pick(+b.dataset.i)
    })
    el.addEventListener('pointerover', e => {
        let b = e.target.closest('.games__pbtn')

        if(b && e.pointerType == 'mouse' && +b.dataset.i != at) focus(+b.dataset.i)
    })

    if(row){
        row.addEventListener('pointerdown', e => {
            if(e.pointerType == 'mouse') return

            dragging = true
            try { row.setPointerCapture(e.pointerId) } catch(err){}
            focus(under(e))
        })
        row.addEventListener('pointermove', e => {
            if(!dragging || e.pointerType == 'mouse') return

            let i = under(e)

            if(i != at) focus(i)
        })
        const lift = e => {
            if(!dragging) return

            dragging = false
            lastTouch = Date.now()
            if(e.type == 'pointerup') pick(at)
        }
        row.addEventListener('pointerup', lift)
        row.addEventListener('pointercancel', lift)
    }

    // the highlight needs the row on screen to show where it is; it starts where focus starts, without a slide
    focus(at)

    return {
        el,
        key(k){
            let n = lineOf(at), line = lines[n]

            if(k == 'up' || k == 'down'){
                let next = lines[(n + (k == 'down' ? 1 : lines.length - 1)) % lines.length]

                focus(next[Math.min(line.indexOf(at), next.length - 1)])
            }
            else if((k == 'left' || k == 'right') && line.length > 1) focus(line[(line.indexOf(at) + (k == 'right' ? 1 : line.length - 1)) % line.length])
            else if(k == 'ok') pick(at)
        }
    }
}

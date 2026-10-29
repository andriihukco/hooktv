import {iconHTML} from './icons'
import {t, gameTitle, gameHint} from './i18n'
import {config, history, duration, ago} from './store'
import {SKINS, skinName, film} from './cinema'

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
        id: 'skin', label: t('hooktv_game_skin', 'Cinema style'),
        values: SKINS.map(s => ({id: s.id, text: skinName(s)}))
    }, {
        id: 'intro', label: t('hooktv_game_intro', 'Title card'),
        values: [{id: 'on', text: t('hooktv_on', 'On')}, {id: 'off', text: t('hooktv_off', 'Off')}]
    })

    return list.map(r => Object.assign(r, {value: cfg[r.id]}))
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))

/**
 * The lobby: hero with the game's record on the left, its settings and Play on the right.
 * Arrows move between rows and change values, OK on a row steps to its next value, OK on Play starts.
 * @param {object} game
 * @param {function} start called with the chosen settings
 * @returns {{el: HTMLElement, key: function, destroy: function}}
 */
export function lobby(game, start, extra = {}){
    let poster = film(game)
    let cfg = config.get(game)
    let all = rows(game, cfg), list = all
    // a row can depend on another one's value (the number of teams only matters in Teams mode)
    const visible = () => all.filter(r => !r.when || cfg[r.when.id] === r.when.value)
    let at = all.length, stats = history.stats(game.id), runs = history.of(game.id, 5)
    let el = document.createElement('div')

    el.className = 'games__lobby'

    const statChip = (label, value) => `<div class="games__chip"><b>${esc(value)}</b><span>${esc(label)}</span></div>`
    const runRow = r => `<div class="games__run${r.win ? ' games__run--win' : ''}"><b>${esc(r.score)}</b><span>${esc(levelName(r.level == null ? 1 : r.level))}${r.mode && r.mode != 'solo' ? ' · ' + esc(modeName(r.mode)) : ''}</span><i>${esc(ago(r.at))}</i></div>`

    el.innerHTML = `
        <div class="games__hero">
            <div class="games__hero-icon">${iconHTML(game.id)}</div>
            <div class="games__hero-title">${esc(gameTitle(game))}</div>
            <div class="games__hero-genre">${esc(poster.genre)}</div>
            <div class="games__hero-tag">${esc(poster.line)}</div>
            <div class="games__hero-hint">${esc(gameHint(game))}</div>
            <div class="games__chips">
                ${statChip(t('hooktv_best', 'Best'), stats.best)}
                ${statChip(t('hooktv_game_played', 'Played'), stats.plays)}
                ${statChip(t('hooktv_game_wins', 'Wins'), stats.wins)}
                ${statChip(t('hooktv_game_time', 'Time'), duration(stats.ms))}
            </div>
            <div class="games__runs">
                <div class="games__runs-t">${t('hooktv_game_recent', 'Recent runs')}</div>
                ${runs.length ? runs.map(runRow).join('') : `<div class="games__runs-none">${t('hooktv_game_no_runs', 'No runs yet — go set the first score')}</div>`}
            </div>
        </div>
        <div class="games__side">
            <div class="games__settings"></div>
            <div class="games__play-btn" data-i="play">${t('hooktv_game_play', 'Play')}</div>
            ${extra.reset ? `<div class="games__link" data-i="reset">${t('hooktv_game_reset', 'Reset history')}</div>` : ''}
        </div>`

    let box = el.querySelector('.games__settings'), play = el.querySelector('.games__play-btn')

    const paint = () => {
        list = visible()
        at = Math.min(at, list.length)
        box.innerHTML = list.map((r, i) => `<div class="games__row${i == at ? ' focus' : ''}" data-i="${i}">
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

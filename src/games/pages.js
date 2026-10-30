import Lang from '../core/lang'
import Platform from '../core/platform'
import {gameTitle, gameHint} from './catalog'
import {history, duration, ago} from './store'
import {t, levelName, modeName} from './shell'
import {award} from './cinema'

// The text pages of the player: the instructions sheet, the scores sheet and the key strip under the board.

// how this device is played: a phone / tablet (touch), a TV (remote) or a computer (keyboard and mouse)
export function mode(){
    // a finger on the glass first: some phones' user agents look like a TV box
    if(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return 'touch'
    if(Platform.tv()) return 'tv'

    return 'desk'
}

const cap = t => `<kbd>${t}</kbd>`
const dot = c => `<i class="games__dot games__dot--${c}"></i>`

// the instructions page: one row per thing the player can do, with the keys for the device in hand
export function helpHTML(game, kind){
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

export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))

// the scores page: the award won so far, the record and the latest runs
export function scoresHTML(game){
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
export function keysHTML(kind){
    if(kind == 'touch') return ''

    if(kind == 'tv') return `${cap('◀▲▼▶')} ${Lang.translate('hooktv_help_move')} ${cap('OK')} ${Lang.translate('hooktv_help_action')} ${dot('red')} ${Lang.translate('hooktv_help_restart')} ${dot('green')} ${Lang.translate('hooktv_help_pause')} ${dot('yellow')} ${Lang.translate('hooktv_help_help')}`

    return `${cap('←↑↓→')} ${Lang.translate('hooktv_help_move')} ${cap('Space')} ${Lang.translate('hooktv_help_action')} ${cap('R')} ${Lang.translate('hooktv_help_restart')} ${cap('P')} ${Lang.translate('hooktv_help_pause')} ${cap('H')} ${Lang.translate('hooktv_help_help')}`
}

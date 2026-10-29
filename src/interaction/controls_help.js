import Controller from '../core/controller'
import Lang from '../core/lang'
import Modal from './modal'
import Settings from './settings/api'
import Material from '../utils/material'

// Settings → Controls: the same actions on a TV remote, a keyboard and a touch screen or mouse.
// Keys are listed as the app reads them (core/keypad.js, games/runtime.js, components/music.js).
const dot = color => `<i class="controls-help__dot" style="background:${color}" aria-hidden="true"></i>`
const key = text => `<kbd>${text}</kbd>`

function rows(){
    let hold = Lang.translate('hooktv_controls_hold')

    return [
        {name: 'hooktv_help_move', remote: key('◀ ▲ ▼ ▶'), keyboard: key('← ↑ ↓ →'), touch: Lang.translate('hooktv_help_swipe')},
        {name: 'hooktv_help_action', remote: key('OK'), keyboard: key('Enter'), touch: Lang.translate('hooktv_help_tap')},
        {name: 'back', remote: key('↩'), keyboard: key('Esc') + ' ' + key('Backspace'), touch: key('‹')},
        {name: 'hooktv_controls_menu', remote: hold + ' ' + key('OK'), keyboard: hold + ' ' + key('Enter'), touch: hold},
        {group: Lang.translate('title_music')},
        {name: 'hooktv_controls_play_pause', remote: key('⏯'), keyboard: key('⏯'), touch: key('▶')},
        {name: 'hooktv_controls_skip', remote: key('⏮') + ' ' + key('⏭'), keyboard: key('⏮') + ' ' + key('⏭'), touch: key('⏮') + ' ' + key('⏭')},
        {group: Lang.translate('title_games')},
        {name: 'hooktv_help_restart', remote: key(dot('#FF453A')), keyboard: key('R'), touch: key('≡')},
        {name: 'hooktv_help_pause', remote: key(dot('#30D158')), keyboard: key('P'), touch: key('≡')},
        {name: 'hooktv_help_help', remote: key(dot('#FFD60A')), keyboard: key('H'), touch: key('≡')}
    ]
}

function html(){
    let head = ['hooktv_help_remote', 'hooktv_help_keyboard', 'hooktv_help_touch'].map(name=>`<th scope="col">${Lang.translate(name)}</th>`).join('')
    let body = rows().map(row=>row.group
        ? `<tr class="controls-help__group"><th colspan="4" scope="colgroup">${row.group}</th></tr>`
        : `<tr><th scope="row">${Lang.translate(row.name)}</th><td>${row.remote}</td><td>${row.keyboard}</td><td>${row.touch}</td></tr>`
    ).join('')

    return $(`<div class="controls-help"><table><thead><tr><td></td>${head}</tr></thead><tbody>${body}</tbody></table></div>`)
}

function open(){
    let previous = Controller.enabled().name || 'settings'
    let close = ()=>{
        Modal.close()
        Controller.toggle(previous)
    }

    Modal.open({
        title: Lang.translate('hooktv_help_title'),
        html: html(),
        size: 'medium',
        buttons: [{name: Lang.translate('back'), onSelect: close}],
        onBack: close
    })
}

// a section of its own in the flat Settings page: one row that opens the table
function init(){
    Settings.addComponent({
        component: 'controls_help',
        icon: Material.icon('keyboard'),
        name: Lang.translate('hooktv_help_title')
    })

    Settings.addParam({
        component: 'controls_help',
        param: {
            name: 'controls_help_open',
            type: 'button'
        },
        field: {
            name: ['hooktv_help_remote', 'hooktv_help_keyboard', 'hooktv_help_touch'].map(key=>Lang.translate(key)).join(' · ')
        },
        onChange: open
    })
}

export default {init, open}

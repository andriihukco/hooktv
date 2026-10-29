import Storage from '../core/storage/storage'
import Platform from '../core/platform'
import Lang from '../core/lang'
import Controller from '../core/controller'
import Modal from './modal'
import Releases from '../utils/releases'

/**
 * HOOK TV: every push to main is a new deploy, but an open tab keeps running the old one.
 * releases.json lists the recent changes. The settings Info row opens a short sheet with the
 * version and date, a "What's new" button above the update button, and "What's new" opens the
 * list in a side panel. A dot on the Info row means this device is behind.
 */

const SEEN = 'release_seen'
const CHECK_EVERY = 15 * 60 * 1000

let releases = []
let pending = []

function eligible(){
    let native = ['tizen', 'webos', 'orsay', 'netcast', 'apple_tv', 'android', 'nw', 'electron'].some(name=>Platform.is(name))

    return !native
}

function escape(text){
    return String(text).replace(/[&<>"']/g, (c)=>({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c])
}

function date(value){
    let time = new Date(value)

    return isNaN(time) ? '' : time.toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric'})
}

function rows(){
    return releases.slice(0, 10).map(item=>`
        <li class="whats-new__item">
            <div class="whats-new__text">
                ${item.area ? `<span class="whats-new__area">${escape(item.area)}</span>` : ''}
                <span class="whats-new__title">${escape(item.title)}${pending.indexOf(item) >= 0 ? `<span class="whats-new__new">${escape(Lang.translate('release_new'))}</span>` : ''}</span>
            </div>
            <span class="whats-new__date">${escape(date(item.date))}</span>
        </li>
    `).join('')
}

/**
 * Update: forget the cached app files, remember this release, reload
 */
function update(){
    Storage.set(SEEN, releases[0].id, true)

    let clear = ('caches' in window) ? caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))) : Promise.resolve()

    clear.catch(()=>{}).then(()=>location.reload())
}

/**
 * Loads releases.json. Keeps the list of releases this device has not loaded yet.
 * @returns {Promise} resolves when the list is known
 */
function load(){
    return fetch('./releases.json?_=' + Date.now(), {cache: 'no-store'})
        .then(response=>response.ok ? response.json() : null)
        .then(data=>{
            releases = data && data.releases ? data.releases : []

            if(!releases.length) return

            // a first visit has nothing to catch up on
            if(!Storage.get(SEEN, '') && eligible()) Storage.set(SEEN, releases[0].id, true)

            pending = eligible() ? Releases.missed(releases, Storage.get(SEEN, '')) : []
        })
        .catch(()=>{})
}

/**
 * Shows or hides the dot on the Info row of the settings panel
 */
function badge(){
    $('[data-component="whats_new"] .whats-new-dot').toggleClass('hide', !pending.length)
}

/**
 * Whether this device has updates it has not loaded yet
 * @returns {boolean}
 */
function hasNew(){
    return pending.length > 0
}

/**
 * The side panel with the list of updates. Back or Close returns to where the user was.
 */
function openPanel(){
    let previous = Controller.enabled().name || 'content'

    let panel = document.createElement('div')

    panel.className = 'whats-new-panel'
    panel.innerHTML = `
        <div class="whats-new-panel__head">
            <h2 class="whats-new-panel__title">${escape(Lang.translate('release_info'))}</h2>
            <button class="whats-new-panel__close selector" type="button">${escape(Lang.translate('release_close'))}</button>
        </div>
        <ul class="whats-new__list whats-new-panel__list">${releases.length ? rows() : `<li class="whats-new__empty">${escape(Lang.translate('release_empty'))}</li>`}</ul>
    `

    let list = panel.querySelector('.whats-new-panel__list')
    let close = panel.querySelector('.whats-new-panel__close')

    let shut = ()=>{
        panel.remove()

        Controller.toggle(previous)
    }

    close.addEventListener('click', shut)

    document.body.appendChild(panel)

    Controller.add('whats_new', {
        toggle: ()=>{
            Controller.collectionSet(panel)
            Controller.collectionFocus(close, panel)
        },
        up: ()=>{ list.scrollTop -= 80 },
        down: ()=>{ list.scrollTop += 80 },
        back: shut
    })

    Controller.toggle('whats_new')
}

/**
 * The Info sheet: version and date of the latest release, What's new above the update button
 */
function open(){
    load().then(()=>{
        badge()

        let latest = releases[0]

        let html = $(`
            <div class="whats-new">
                <div class="whats-new__meta">
                    <div>
                        <small>${escape(Lang.translate('release_version'))}</small><br>
                        <span>${latest ? escape(latest.id.slice(0, 8)) : '—'}</span>
                    </div>
                    <div>
                        <small>${escape(Lang.translate('release_updated'))}</small><br>
                        <span>${latest ? escape(date(latest.date)) : '—'}</span>
                    </div>
                </div>
            </div>
        `)

        let whatsNew = {
            name: Lang.translate('release_whats_new'),
            onSelect: ()=>{
                Modal.close()

                openPanel()
            }
        }

        let buttons = pending.length ? [
            whatsNew,
            {
                name: Lang.translate('release_update'),
                onSelect: ()=>update()
            }
        ] : [
            whatsNew,
            {
                name: Lang.translate('release_close'),
                onSelect: ()=>Modal.close()
            }
        ]

        Modal.open({
            title: Lang.translate('release_info'),
            html,
            size: 'small',
            buttons
        })
    })
}

/**
 * Starts after the app is on screen: a check now, again on every return to the tab and every 15 minutes
 */
function init(){
    load().then(badge)

    setInterval(()=>load().then(badge), CHECK_EVERY)

    document.addEventListener('visibilitychange', ()=>{
        if(!document.hidden) load().then(badge)
    })
}

export default {
    init,
    open,
    hasNew
}

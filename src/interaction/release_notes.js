import Storage from '../core/storage/storage'
import Platform from '../core/platform'
import Lang from '../core/lang'
import Releases from '../utils/releases'

/**
 * HOOK TV: every push to main is a new deploy, but an open tab keeps running the old one.
 * This asks the server for releases.json and shows what is new since the device last updated.
 * There is no close button: the only way on is "Update", which clears the cache and reloads.
 */

const SEEN = 'release_seen'
const CHECK_EVERY = 15 * 60 * 1000

let opened = false
let latest = ''

function eligible(){
    let native = ['tizen', 'webos', 'orsay', 'netcast', 'apple_tv', 'android', 'nw', 'electron'].some(name=>Platform.is(name))

    return !native
}

function escape(text){
    return String(text).replace(/[&<>"']/g, (c)=>({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c])
}

function date(value){
    let time = new Date(value)

    return isNaN(time) ? '' : time.toLocaleDateString(undefined, {day: 'numeric', month: 'short'})
}

function items(list){
    return list.map(item=>`
        <li class="release-notes__item">
            <div class="release-notes__text">
                ${item.area ? `<span class="release-notes__area">${escape(item.area)}</span>` : ''}
                <span class="release-notes__title">${escape(item.title)}</span>
            </div>
            <span class="release-notes__date">${escape(date(item.date))}</span>
        </li>
    `).join('')
}

/**
 * Update: forget the cached app files, remember this release, reload
 */
function update(button){
    button.disabled = true
    button.textContent = Lang.translate('release_updating')

    Storage.set(SEEN, latest, true)

    let clear = ('caches' in window) ? caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))) : Promise.resolve()

    clear.catch(()=>{}).then(()=>location.reload())
}

function open(list){
    if(opened) return

    opened = true

    let many = list.length > 1

    let overlay = document.createElement('div')

    overlay.className = 'release-notes'
    overlay.innerHTML = `
        <div class="release-notes__card" role="dialog" aria-modal="true" aria-labelledby="release-notes-title">
            <div class="release-notes__head">
                <img class="release-notes__icon" src="./img/logo-icon.svg" alt="">
                <h2 class="release-notes__heading" id="release-notes-title">${Lang.translate(many ? 'release_title_many' : 'release_title_one')}</h2>
                <p class="release-notes__lead">${Lang.translate(many ? 'release_lead_many' : 'release_lead_one')}</p>
            </div>
            <ul class="release-notes__list">${items(list)}</ul>
            <button class="release-notes__update" type="button">${Lang.translate('release_update')}</button>
            <p class="release-notes__note">${Lang.translate('release_note')}</p>
        </div>
    `

    let button = overlay.querySelector('.release-notes__update')

    button.addEventListener('click', ()=>update(button))

    // Escape and the browser back gesture must not close it; the only way out is the update
    overlay.addEventListener('keydown', (e)=>{
        if(e.key == 'Escape'){
            e.preventDefault()
            e.stopPropagation()
        }
    })

    document.body.appendChild(overlay)

    button.focus()
}

function check(){
    if(opened) return

    fetch('./releases.json?_=' + Date.now(), {cache: 'no-store'})
        .then(response=>response.ok ? response.json() : null)
        .then(data=>{
            let releases = data && data.releases ? data.releases : []

            if(!releases.length) return

            latest = releases[0].id

            // a first visit has nothing to catch up on
            if(!Storage.get(SEEN, '')){
                Storage.set(SEEN, latest, true)

                return
            }

            let list = Releases.missed(releases, Storage.get(SEEN, ''))

            if(list.length) open(list)
        })
        .catch(()=>{})
}

/**
 * Starts after the app is on screen: a check now, again on every return to the tab and every 15 minutes
 */
function init(){
    if(!eligible()) return

    setTimeout(check, 2000)

    setInterval(check, CHECK_EVERY)

    document.addEventListener('visibilitychange', ()=>{
        if(!document.hidden) check()
    })
}

export default {
    init,
    check
}

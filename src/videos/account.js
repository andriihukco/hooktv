import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import Modal from '../interaction/modal'
import Noty from '../interaction/noty'
import Client from './client'

const KEY = 'videos_yt_token'

/**
 * Saved login: {access, refresh, expires_at}
 * @returns {object|null}
 */
function saved(){
    let token = Storage.get(KEY, null)

    return token && token.refresh ? token : null
}

/**
 * Is a YouTube account connected on this device
 * @returns {boolean}
 */
export function connected(){
    return Boolean(saved())
}

/**
 * Access token for account calls, refreshed when it is about to expire
 * @returns {Promise<string>}
 */
export function accessToken(){
    let token = saved()

    if(!token) return Promise.reject(new Error('not connected'))
    if(Date.now() < token.expires_at - 60 * 1000) return Promise.resolve(token.access)

    return Client.call('POST', 'refresh', {refresh_token: token.refresh}).then(json=>{
        token.access = json.access_token
        token.expires_at = Date.now() + json.expires_in * 1000

        Storage.set(KEY, token)

        return token.access
    })
}

function save(json){
    Storage.set(KEY, {
        access: json.access_token,
        refresh: json.refresh_token,
        expires_at: Date.now() + json.expires_in * 1000
    })
}

function disconnect(){
    Storage.set(KEY, {})

    Noty.show(Lang.translate('videos_disconnected'))
}

/**
 * Connect or disconnect the account
 * @param {()=>void} [done] - called after the login window closes
 */
export function toggle(done){
    if(connected()){
        disconnect()
        if(done) done()

        return
    }

    start(done)
}

/**
 * Device login: show a code, the user approves it on a phone, and this device polls until then
 */
function start(done){
    Client.call('POST', 'device_start').then(info=>{
        openModal(info, done)
    }).catch(()=>{
        Noty.show(Lang.translate('videos_connect_error'))
    })
}

function openModal(info, done){
    let stopped = false
    let interval = (info.interval || 5) * 1000
    let timer = null
    let code = info.user_code || ''
    let html = $(`
        <div>
            <div class="broadcast__text">${Lang.translate('videos_connect_text')} <b>${info.verification_url || 'google.com/device'}</b></div>
            <div class="broadcast__device selector videos-connect__code">${code}</div>
            <br>
            <div class="broadcast__scan"><div></div></div>
            <div class="settings-param__descr videos-connect__status">${Lang.translate('videos_connect_wait')}</div>
        </div>
    `)

    function close(){
        stopped = true
        clearTimeout(timer)
        Modal.close()
        if(done) done()
    }

    function poll(){
        if(stopped) return

        Client.call('POST', 'device_poll', {device_code: info.device_code}).then(json=>{
            if(stopped) return

            if(json.pending){
                if(json.slow) interval += 5000
                timer = setTimeout(poll, interval)
                return
            }

            save(json)
            close()
            Noty.show(Lang.translate('videos_connected'))
        }).catch(()=>{
            if(stopped) return

            close()
            Noty.show(Lang.translate('videos_connect_error'))
        })
    }

    Modal.open({
        title: Lang.translate('videos_connect_title'),
        html: html,
        size: 'small',
        scroll_to_center: true,
        select: html.find('.selector')[0],
        onBack: close
    })

    poll()
}

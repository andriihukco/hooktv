import request from './client.js'
import Auth from './auth.js'
import Devices from './devices.js'
import Storage from '../storage/storage'

const LOCAL_KEYS = ['account_user', 'account_email', 'account_notice', 'account_bookmarks', 'supa_queue', 'supa_cursors']

/**
 * Выйти на этом устройстве. Другие устройства и профили остаются.
 * Удаляет строку устройства (если она уже пропала, это не ошибка),
 * завершает только текущую сессию и очищает локальные данные аккаунта.
 * Перезагрузку делает вызывающий код.
 * @returns {Promise<void>}
 */
function signOutThisDevice(){
    let s = Auth.session()

    return Devices.remove(Devices.deviceId()).catch(()=>{}).then(()=>{
        if(!s) return

        return request('auth/v1/logout', {method: 'POST', token: s.token}).catch(()=>{})
    }).then(()=>{
        Auth.clear()

        LOCAL_KEYS.forEach(key=> Storage.set(key, '', true))

        Storage.set('account_use', false, true)
    })
}

export default {
    signOutThisDevice
}

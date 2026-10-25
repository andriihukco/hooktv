import request from './client.js'
import Auth from './auth.js'
import Storage from '../storage/storage'
import Platform from '../platform'
import uuid from './uuid.js'

/**
 * Постоянный идентификатор устройства
 * @returns {string}
 */
function deviceId(){
    let id = Storage.get('supa_device_id', '')

    if(!id){
        id = uuid()

        Storage.set('supa_device_id', id, true)
    }

    return id
}

/**
 * Название устройства для списка устройств
 * @returns {string}
 */
function deviceName(){
    if(Platform.tv()) return 'TV'

    return (navigator.userAgent || '').slice(0, 60)
}

function requireSession(){
    let s = Auth.session()

    if(!s) return Promise.reject({status: 0, code: 'no_session', message: ''})

    return Promise.resolve(s)
}

/**
 * Зарегистрировать текущее устройство. Повторная регистрация не считается в лимит.
 * @returns {Promise<void>}
 */
function register(){
    return requireSession().then(s=> request('devices', {
        method: 'POST',
        token: s.token,
        query: {on_conflict: 'user_id,device_id'},
        headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
        body: {
            user_id: s.user_id,
            device_id: deviceId(),
            name: deviceName(),
            last_seen: new Date().toISOString()
        }
    })).then(()=>{})
}

/**
 * Список устройств аккаунта
 * @returns {Promise<Array<{device_id: string, name: string, last_seen: string}>>}
 */
function list(){
    return requireSession().then(s=> request('devices', {
        token: s.token,
        query: {user_id: 'eq.' + s.user_id, select: 'device_id,name,last_seen', order: 'last_seen.desc'}
    }))
}

/**
 * Удалить устройство. Если строки уже нет, ничего не происходит.
 * @param {string} device_id
 * @returns {Promise<void>}
 */
function remove(device_id){
    return requireSession().then(s=> request('devices', {
        method: 'DELETE',
        token: s.token,
        query: {device_id: 'eq.' + device_id}
    })).then(()=>{})
}

export default {
    deviceId,
    deviceName,
    register,
    list,
    remove
}

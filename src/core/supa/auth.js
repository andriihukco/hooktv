import request from './client.js'
import Storage from '../storage/storage'

/**
 * Сессия аккаунта: токен, refresh_token и срок действия
 * @typedef {{token: string, refresh_token: string, expires_at: number, user_id: string, email: string}} Session
 */

function fromResponse(data){
    return {
        token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user_id: data.user.id,
        email: data.user.email
    }
}

/**
 * Текущая сессия или null
 * @returns {Session|null}
 */
function session(){
    let account = Storage.get('account', {})

    if(!account || !account.token) return null

    return {
        token: account.token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at,
        user_id: account.user_id,
        email: account.email
    }
}

/**
 * Сохранить сессию, сохраняя профиль аккаунта
 * @param {Session} s
 */
function save(s){
    let account = Storage.get('account', {})

    if(!account || typeof account !== 'object') account = {}

    Storage.set('account', Object.assign({}, account, {
        token: s.token,
        refresh_token: s.refresh_token,
        expires_at: s.expires_at,
        user_id: s.user_id,
        email: s.email
    }), true)
}

/**
 * Удалить сессию на этом устройстве
 */
function clear(){
    Storage.set('account', '', true)
}

/**
 * Сессия скоро истечет (меньше 60 секунд)
 * @param {Session} s
 * @returns {boolean}
 */
function isExpiring(s){
    return s.expires_at * 1000 - Date.now() < 60000
}

/**
 * Вход по email и паролю
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Session>}
 */
function signIn(email, password){
    return request('auth/v1/token?grant_type=password', {
        method: 'POST',
        body: {email, password}
    }).then(data=>{
        let s = fromResponse(data)

        save(s)

        return s
    })
}

/**
 * Регистрация. Без подтверждения email сессии нет.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{confirmed: boolean}>}
 */
function signUp(email, password){
    return request('auth/v1/signup', {
        method: 'POST',
        body: {email, password}
    }).then(data=>{
        if(data.access_token){
            save(fromResponse(data))

            return {confirmed: true}
        }

        return {confirmed: false}
    })
}

/**
 * Повторно отправить письмо подтверждения
 * @param {string} email
 * @returns {Promise<any>}
 */
function resend(email){
    return request('auth/v1/resend', {
        method: 'POST',
        body: {type: 'signup', email}
    })
}

/**
 * Обновить токен. Офлайн или ошибка сервера не сбрасывают сессию.
 * Сбрасывается только отклоненный refresh_token (400/401).
 * @returns {Promise<Session|null>}
 */
function refresh(){
    let s = session()

    if(!s || !s.refresh_token) return Promise.resolve(s)

    return request('auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: {refresh_token: s.refresh_token}
    }).then(data=>{
        let next = fromResponse(data)

        save(next)

        return next
    }).catch(e=>{
        if(e.status === 400 || e.status === 401){
            clear()

            return null
        }

        return s
    })
}

export default {
    session,
    save,
    clear,
    isExpiring,
    signIn,
    signUp,
    resend,
    refresh
}

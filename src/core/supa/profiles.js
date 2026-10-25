import request from './client.js'
import Auth from './auth.js'

function requireSession(){
    let s = Auth.session()

    if(!s) return Promise.reject({status: 0, code: 'no_session', message: ''})

    return Promise.resolve(s)
}

/**
 * Лимит профилей: 3, с премиумом 8
 * @param {boolean} premium
 * @returns {number}
 */
function limit(premium){
    return premium ? 8 : 3
}

/**
 * Список профилей аккаунта
 * @returns {Promise<Array>}
 */
function list(){
    return requireSession().then(s=> request('profiles', {
        token: s.token,
        query: {user_id: 'eq.' + s.user_id, order: 'created_at.asc'}
    }))
}

/**
 * Создать профиль. Первый профиль становится основным.
 * @param {string} name
 * @param {boolean} premium
 * @returns {Promise<object>}
 */
function create(name, premium){
    return list().then(items=>{
        if(items.length >= limit(premium)) throw {status: 0, code: 'profile_limit', message: ''}

        return requireSession().then(s=> request('profiles', {
            method: 'POST',
            token: s.token,
            headers: {Prefer: 'return=representation'},
            body: {user_id: s.user_id, name, main: items.length === 0}
        }))
    }).then(rows=> rows[0])
}

/**
 * Переименовать профиль
 * @param {string} id
 * @param {string} name
 * @returns {Promise<void>}
 */
function rename(id, name){
    return requireSession().then(s=> request('profiles', {
        method: 'PATCH',
        token: s.token,
        query: {id: 'eq.' + id},
        body: {name}
    })).then(()=>{})
}

/**
 * Удалить профиль
 * @param {string} id
 * @returns {Promise<void>}
 */
function remove(id){
    return requireSession().then(s=> request('profiles', {
        method: 'DELETE',
        token: s.token,
        query: {id: 'eq.' + id}
    })).then(()=>{})
}

export default {
    limit,
    list,
    create,
    rename,
    remove
}

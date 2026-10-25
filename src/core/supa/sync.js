import request from './client.js'
import Auth from './auth.js'
import Storage from '../storage/storage'
import Noty from '../../interaction/noty'
import Lang from '../lang'

const MAX_TRIES = 10
const CONFLICT = {
    bookmarks: 'profile_id,type,card_id',
    watch_history: 'profile_id,card_id,season,episode'
}

function time(v){
    return typeof v === 'number' ? v : Date.parse(v)
}

/**
 * Выбрать, какая версия строки побеждает.
 * Новее побеждает. При равном времени: для watch_history больший time,
 * иначе локальная. Удаление (deleted) побеждает, если оно новее.
 * @param {object} local
 * @param {object} remote
 * @returns {object}
 */
function mergeRow(local, remote){
    if(!local) return remote
    if(!remote) return local

    let lt = time(local.updated_at)
    let rt = time(remote.updated_at)

    if(rt > lt) return remote
    if(lt > rt) return local

    if(typeof remote.time === 'number' && typeof local.time === 'number'){
        return remote.time > local.time ? remote : local
    }

    return local
}

function queue(){
    return Storage.get('supa_queue', []) || []
}

function saveQueue(items){
    Storage.set('supa_queue', items, true)
}

/**
 * Поставить изменение в очередь отправки
 * @param {string} table - 'bookmarks' или 'watch_history'
 * @param {{type: string, row: object, tries: number}} op
 */
function enqueue(table, op){
    let items = queue()

    items.push(Object.assign({table}, op, {tries: op.tries || 0}))

    saveQueue(items)
}

/**
 * Отправить очередь по порядку. Сетевые ошибки не считаются попытками.
 * Серверные ошибки считаются; после MAX_TRIES элемент удаляется.
 * @returns {Promise<void>}
 */
function flush(){
    let s = Auth.session()

    if(!s) return Promise.resolve()

    let items = queue()
    let pending = items.slice()

    function next(){
        if(!pending.length){
            saveQueue(items.filter(i=>i.tries < MAX_TRIES))

            return Promise.resolve()
        }

        let item = pending.shift()

        return request(item.table, {
            method: 'POST',
            token: s.token,
            query: {on_conflict: CONFLICT[item.table]},
            headers: {Prefer: 'resolution=merge-duplicates,return=minimal'},
            body: item.row
        }).then(()=>{
            items.splice(items.indexOf(item), 1)
        }).catch(e=>{
            if(e.status === 0) return

            item.tries++

            if(item.tries >= MAX_TRIES){
                items.splice(items.indexOf(item), 1)

                Noty.show(Lang.translate('account_sync_failed'))
            }
        }).then(next)
    }

    return next()
}

function cursorKey(profile_id, table){
    return profile_id + '_' + table
}

/**
 * Курсоры всех профилей и таблиц. Одна запись в Storage, чтобы выход мог ее очистить.
 * @returns {object}
 */
function cursors(){
    return Storage.get('supa_cursors', {}) || {}
}

/**
 * Получить изменения одной таблицы профиля после курсора и передать их в apply.
 * Курсор у каждой таблицы свой и обновляется только после того, как apply отработал.
 * @param {string} profile_id
 * @param {string} table - 'bookmarks' или 'watch_history'
 * @param {function(object[]): void} apply - получает строки по возрастанию updated_at
 * @returns {Promise<void>}
 */
function pull(profile_id, table, apply){
    let s = Auth.session()

    if(!s) return Promise.resolve()

    let key = cursorKey(profile_id, table)
    let cursor = cursors()[key] || '1970-01-01T00:00:00Z'

    return request(table, {
        token: s.token,
        query: {
            profile_id: 'eq.' + profile_id,
            updated_at: 'gt.' + cursor,
            order: 'updated_at.asc'
        }
    }).then(rows=>{
        rows = rows || []

        apply(rows)

        if(rows.length){
            let next = Object.assign({}, cursors())

            next[key] = rows[rows.length - 1].updated_at

            Storage.set('supa_cursors', next, true)
        }
    })
}

export default {
    mergeRow,
    enqueue,
    flush,
    pull
}

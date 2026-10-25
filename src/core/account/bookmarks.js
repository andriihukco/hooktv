import Favorite from '../favorite'
import Permit from './permit'
import Socket from '../socket'
import Sync from '../supa/sync'
import Arrays from '../../utils/arrays'
import Utils from '../../utils/utils'
import WebWorker from '../../utils/worker'
import Platform from '../platform'
import Listener from './listener'
import Storage from '../storage/storage'
import Cache from '../../utils/cache'
import Noty from '../../interaction/noty'
import Timer from '../timer'
import Lang from '../lang'
import LoadingProgress from '../../interaction/loading_progress'

let bookmarks     = [] // имеет вид [{id, card_id, type, data, time, updated_at},...]
let bookmarks_map = {} // имеет вид {type: {card_id: bookmark, ...}, ...}

let update_timer

let push_queue   = []
let push_running = false

/**
 * Строка таблицы bookmarks для отправки в Supabase
 * @param {String} type - тип закладки
 * @param {String} card_id - id карточки
 * @param {Object} card - карточка
 * @param {Boolean} deleted - true для удаления (tombstone)
 * @return {Object}
 */
function row(type, card_id, card, deleted){
    return {
        user_id: Permit.account.user_id,
        profile_id: Permit.account.profile.id,
        type: type,
        card_id: String(card_id),
        card: Utils.clearCard(Arrays.clone(card)),
        deleted: !!deleted,
        updated_at: new Date().toISOString()
    }
}

function processQueue(){
    if(push_running || push_queue.length === 0) return

    push_running = true

    let {method, type, card} = push_queue.shift()

    Sync.enqueue('bookmarks', {
        type: 'upsert',
        row: row(type, card.id, card, method == 'remove')
    })

    Sync.flush().then(()=>{
        clearTimeout(update_timer)

        update_timer = setTimeout(()=>{
            update(()=>{
                Socket.send('bookmarks',{})

                Lampa.Listener.send('state:changed', {
                    target: 'favorite',
                    reason: 'update',
                    method,
                    card,
                    type
                })
            })
        }, 500)
    }).catch(()=>{
        console.warn('Account', 'bookmarks ' + method + ' fail')
    }).finally(()=>{
        push_running = false

        processQueue()
    })
}

/**
 * Запуск
 * @return {void}
 */
function init(){
    Favorite.listener.follow('add,added',(e)=>{
        push('add', e.where, e.card)
    })

    Favorite.listener.follow('remove',(e)=>{
        if(e.method == 'id') push('remove', e.where, e.card)
    })

    Storage.listener.follow('change',(e)=>{
        if(e.name == 'protocol' || (e.name == 'account_use' && e.value == 'true')) update(()=>{
            Lampa.Listener.send('state:changed', {
                target: 'favorite',
                reason: 'read'
            })
        })
    })

    Listener.follow('profile_select', ()=>{
        bookmarks = []
        bookmarks_map = {}

        update(()=>{
            Lampa.Listener.send('state:changed', {
                target: 'favorite',
                reason: 'profile'
            })
        })
    })

    Timer.add(1000 * 60 * 5, ()=>{
        update()
    })
}

/**
 * Добавить/Удалить закладку
 * @param {String} method - add/remove
 * @param {String} type - тип закладки
 * @param {Object} card - карточка
 * @return {void}
 */
function push(method, type, card){
    if(Permit.sync){
        push_queue.push({method, type, card})

        processQueue()
    }
}

/**
 * Сохранение закладок в кэш
 * @return {void}
 */
function saveToCache(){
    Cache.rewriteData('other', 'account_bookmarks_' + Permit.account.profile.id, bookmarks).catch((e)=>{
        console.log('Account', 'bookmarks cache not saved', e.message)
    })
}

/**
 * Загрузка закладок из кэша
 * @param {function} call - вызов по окончании
 * @return {void}
 */
function loadFromCache(call){
    if(bookmarks.length) return call && call()

    Cache.getData('other', 'account_bookmarks_' + Permit.account.profile.id).then((data)=>{
        bookmarks = data && data.length ? data : []

        console.log('Account', 'bookmarks cache load:', bookmarks.length, 'data:', data ? 'yes' : 'no')

        createMap()

        if(call) call()
    }).catch(()=>{
        console.log('Account', 'bookmarks cache not load')

        if(call) call()
    })
}

/**
 * Применить строку закладки из Supabase к локальному списку.
 * Побеждает более новая версия (Sync.mergeRow).
 * @param {Object} remote - строка таблицы bookmarks
 * @return {void}
 */
function applyRow(remote){
    let local = bookmarks.find((b)=> b.type == remote.type && b.card_id == remote.card_id)
    let won   = Sync.mergeRow(local ? {updated_at: local.updated_at} : null, remote)

    if(won !== remote) return

    if(local) Arrays.remove(bookmarks, local)

    if(remote.deleted) return

    Arrays.insert(bookmarks, 0, {
        id: remote.id,
        card_id: remote.card_id,
        type: remote.type,
        data: remote.card,
        time: Date.parse(remote.updated_at),
        updated_at: remote.updated_at
    })
}

/**
 * Загрузка и обновление закладок
 * @param {function} call - вызов по окончании
 * @return {void}
 */
function update(call){
    if(Permit.sync){
        console.log('Account', 'sync enabled, updating bookmarks')

        LoadingProgress.status('Bookmarks start sync')

        loadFromCache(()=>{
            Sync.pull(Permit.account.profile.id, 'bookmarks', (rows)=>{
                rows.forEach(applyRow)
            }).then(()=>{
                LoadingProgress.status('Bookmarks applied')

                saveToCache()

                createMap()

                updateChannels()

                console.log('Account', 'bookmarks update complete, total:', bookmarks.length)

                if(call && typeof call == 'function') call()
            }).catch(()=>{
                console.warn('Account', 'bookmarks update fail')

                if(call && typeof call == 'function') call()
            })
        })
    }
    else{
        console.log('Account', 'sync disabled')

        rawToCard([], ()=>{
            if(call && typeof call == 'function') call()
        })
    }
}

/**
 * Очистка закладок. Каждая закладка группы помечается удаленной.
 * @param {string} where - группа закладок для очистки
 * @return {void}
 */
function clear(where){
    if(Permit.sync){
        bookmarks.filter((b)=> b.type == where).forEach((b)=>{
            Sync.enqueue('bookmarks', {
                type: 'upsert',
                row: row(b.type, b.card_id, b.data, true)
            })
        })

        Sync.flush().then(()=>{
            update(()=>{
                // Оповещаем другие устройства о изменении закладок
                Socket.send('bookmarks',{})

                // Глобальное оповещение об изменении закладок для обновления карточек
                Lampa.Listener.send('state:changed', {
                    target: 'favorite',
                    reason: 'clear',
                    type: where
                })
            })
        }).catch(()=>{
            console.warn('Account', 'bookmarks clear fail')
        })
    }
}

/**
 * Получить закладки по типу
 * @param {object} params - {type}
 * @return {array} - [card, ...]
 */
function get(params){
    return bookmarks.filter(elem=>elem.type == params.type).map((elem)=>{
        return elem.data
    })
}

/**
 * Найти закладку по типу и id
 * @param {object} params - {type, id}
 * @return {object|null} - card или null
 */
function find(params){
    return bookmarks_map[params.type] ? bookmarks_map[params.type][params.id]?.data : null
}

/**
 * Получить все закладки
 * @return {array} - [card, ...]
 */
function all(){
    return bookmarks.map((elem)=>{
        return elem.data
    })
}

/**
 * Обновление каналов на андроид тв
 * @return {void}
 */
function updateChannels(){
    if(Platform.is('android') && typeof AndroidJS.saveBookmarks !== 'undefined' && bookmarks.length){
        WebWorker.json({
            type: 'stringify',
            data: bookmarks
        },(j)=>{
            AndroidJS.saveBookmarks(j.data)
        })
    }
}

/**
 * Преобразует row.data из строки в объект
 * @param {array} rows - массив закладок из БД
 * @param {function} call - вызов по окончании
 * @return {void}
 */
function rawToCard(rows, call){
    WebWorker.utils({
        type: 'account_bookmarks_parse',
        data: rows
    },(e)=>{
        bookmarks = Arrays.isArray(e.data) ? e.data : []

        console.log('Account', 'bookmarks rawToCard complete, total:', bookmarks.length)

        createMap()

        updateChannels()

        if(call) call()
    })
}

/**
 * Создаем карту закладок для быстрого поиска
 * @return {void}
 */
function createMap(){
    bookmarks_map = {}

    bookmarks.forEach((elem)=>{
        elem.data = Utils.clearCard(elem.data)

        if(!bookmarks_map[elem.type]) bookmarks_map[elem.type] = {}

        bookmarks_map[elem.type][elem.card_id] = elem
    })
}

/**
 * Отправить текущие закладки в Supabase (первичная загрузка локального списка)
 * @param {function} callback - вызов по окончании
 * @return {void}
 */
function sync(callback){
    if(!Permit.sync){
        callback && callback()

        return
    }

    bookmarks.forEach((elem)=>{
        Sync.enqueue('bookmarks', {
            type: 'upsert',
            row: row(elem.type, elem.card_id, elem.data, false)
        })
    })

    Sync.flush().then(()=>{
        Noty.show(Lang.translate('account_sync_secuses'))

        update()
    }).catch(()=>{
        Noty.show(Lang.translate('account_export_fail'))
    }).finally(()=>{
        callback && callback()
    })
}

export default {
    init: Utils.onceInit(init),
    push,
    update,
    clear,
    get,
    all,
    sync,
    find
}

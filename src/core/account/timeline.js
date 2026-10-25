import Permit from './permit'
import Storage from '../storage/storage'
import Timeline from '../../interaction/timeline'
import Utils from '../../utils/utils'
import Sync from '../supa/sync'

function init(){
    Storage.listener.follow('change',(e)=>{
        if(e.name == 'account_use' || e.name == 'account') refrash()
    })


    Storage.listener.follow('clear',()=>{
        refrash()
    })
}

/**
 * Обновить таймлайн при смене аккаунта или профиля
 * @returns {void}
 */
function refrash(){
    update()
}

/**
 * Обновить таймлайн: применить изменения watch_history после курсора
 * @returns {void}
 */
function update(){
    if(Permit.sync){
        Sync.pull(Permit.account.profile.id, 'watch_history', (rows)=>{
            rows.forEach(row=>{
                Timeline.update({
                    hash: row.card_id,
                    percent: row.percent,
                    time: row.time,
                    duration: row.duration,
                    profile: Permit.account.profile.id,
                    received: true
                })
            })
        }).catch(()=>{
            console.warn('Account', 'timeline update fail')
        })
    }
    // Если вышли из аккаунта, то повторно прочитываем прогресс просмотра из localStorage
    else Timeline.read()
}

/**
 * Отправить прогресс просмотра в watch_history
 * @param {object} params - {hash, percent, time, duration}
 * @returns {void}
 */
function push(params){
    if(!Permit.sync) return

    Sync.enqueue('watch_history', {
        type: 'upsert',
        row: {
            user_id: Permit.account.user_id,
            profile_id: Permit.account.profile.id,
            card_id: String(params.hash),
            season: 0,
            episode: 0,
            time: params.time || 0,
            duration: params.duration || 0,
            percent: params.percent || 0,
            updated_at: new Date().toISOString()
        }
    })

    Sync.flush()
}

export default {
    init: Utils.onceInit(init),
    update,
    push
}

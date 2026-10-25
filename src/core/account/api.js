import Permit from './permit'
import Storage from '../storage/storage'
import Auth from '../supa/auth'

/**
 * Данные пользователя из сессии Supabase. Премиум не используется.
 * @param {function} secuses - получает данные пользователя
 * @param {function} error - вызывается без сессии
 */
function user(secuses, error){
    let s = Auth.session()

    if(Permit.access && s){
        let data = {id: s.user_id, email: s.email}

        Storage.set('account_user', JSON.stringify(data))

        if(secuses) secuses(data)
    }
    else if(error) error({decode_code: 403})
}

export default {
    user
}

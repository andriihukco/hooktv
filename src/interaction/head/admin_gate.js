import Input from '../settings/input'
import Controller from '../../core/controller'
import Lang from '../../core/lang'
import Noty from '../noty'
import createTapCounter from './logo_taps'

const press = createTapCounter({taps: 5, windowMs: 3000})

/**
 * Opens the admin password prompt. It uses the TV keyboard, as the account password does.
 */
function prompt(){
    let enabled = Controller.enabled().name

    Input.edit({title: Lang.translate('admin_login_title'), value: '', free: true, nosave: true, nomic: true, password: true}, (v)=>{
        Controller.toggle(enabled)

        if(v) login(String(v))
    })
}

/**
 * Sends the password to the server; on success the admin board opens.
 * The password goes in the request body, never in the URL.
 * @param {string} password
 */
function login(password){
    fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
        credentials: 'same-origin',
        cache: 'no-store'
    }).then(res => {
        if(res.ok) return window.location.assign('/admin/board.html')

        Noty.show(Lang.translate(res.status == 429 ? 'admin_login_locked' : 'admin_login_failed'))
    }).catch(()=> Noty.show(Lang.translate('network_error')))
}

/**
 * Called on every logo press. Returns true when the press should still go home.
 * Five presses in three seconds open the admin prompt instead.
 * @returns {boolean}
 */
export default function tap(){
    let result = press()

    if(result.admin) prompt()

    return result.home
}

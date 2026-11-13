import Input from './input'
import Controller from '../../core/controller'
import Noty from '../noty'
import createTapCounter from './tap_counter'
import AdminPanel from './admin'
import {adminText} from './admin_locale'

const press = createTapCounter({taps: 5, windowMs: 3000})

/**
 * Opens the username and password prompts using the existing TV keyboard.
 */
function prompt(){
    promptField('username', false, username=>{
        promptField('password', true, password=>{
            if(username && password) login(username, password)
        })
    })
}

function promptField(field, password, call){
    let enabled = Controller.enabled().name

    Input.edit({
        title: adminText(field),
        value: '',
        free: true,
        nosave: true,
        nomic: true,
        password
    }, value=>{
        Controller.toggle(enabled)

        if(value) call(String(value))
    })
}

/**
 * Sends credentials in the request body; on success the admin panel opens in Settings.
 * @param {string} username
 * @param {string} password
 */
function login(username, password){
    fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password}),
        credentials: 'same-origin',
        cache: 'no-store'
    }).then(res => {
        if(res.ok){
            AdminPanel.open()
            return
        }

        Noty.show(adminText(res.status == 429 ? 'loginLocked' : 'loginFailed'))
    }).catch(()=> Noty.show(adminText('networkError')))
}

/**
 * Called on every press of the build row in settings. Five presses in three seconds open the admin prompt.
 */
export default function tap(){
    if(press()) prompt()
}

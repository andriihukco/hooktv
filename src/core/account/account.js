import Timeline from './timeline'
import Bookmarks from './bookmarks'
import Listener from './listener'
import Permit from './permit'
import Profile from './profile'
import Panel from './panel'
import SignOut from '../supa/signout'
import Api from './api'
import Modal from './modal'
import Timer from '../timer'
import Auth from '../supa/auth'
import Devices from '../supa/devices'

/**
 * Запуск
 */
function init(){
    if(!window.lampa_settings.account_use) return

    console.log('Account','use', Permit.token ? Permit.account.email : 'no account')

    Timeline.init()
    Bookmarks.init()
    Profile.init()
    Panel.init()

    Timer.add(1000 * 60 * 10, checkAccountValidity)

    startSession()

    delete Account.init
}

/**
 * Обновить сессию и зарегистрировать устройство, затем загрузить профиль
 * @return {void}
 */
function startSession(){
    Auth.refresh().then((s)=>{
        if(s) return Devices.register().catch((e)=>console.warn('Account', 'device register fail', e.code))
    }).then(()=>{
        Profile.check(()=>{
            Api.user()

            Timeline.update()

            Profile.update()
        })
    })
}

/**
 * Задача загрузки приложения
 * @param {Function} call - функция обратного вызова
 * @return {void}
 */
function task(call){
    if(!window.lampa_settings.account_use) return call()

    Bookmarks.update(call)
}

/**
 * Проверить валидность аккаунта
 * @return {void}
 */
function checkAccountValidity(){
    Permit.token && Auth.refresh()
}

/**
 * Выход из аккаунта
 * @param {Object} data - данные аккаунта
 * @return {void}
 */
function logoff(data){
    let account = Permit.account

    if(account.token && account.email == data.email){
        SignOut.signOutThisDevice().then(()=>{
            $('.head .open--profile').addClass('hide')

            window.location.reload()
        })
    }
}


let Account = {
    Api,
    Bookmarks,
    Profile,
    Timeline,
    Permit,
    Modal,

    listener: Listener,

    init,
    task,
    showProfiles: (callback)=>{
        console.warn('Account.showProfiles() is deprecated, use Account.Profile.select()')

        Profile.select(callback)
    },
    showNoAccount: ()=>{
        console.warn('Account.showNoAccount() is deprecated, use Account.Modal.account()')

        Modal.account()
    },
    showLimitedAccount: ()=>{
        console.warn('Account.showLimitedAccount() is deprecated, use Account.Modal.limited()')

        Modal.limited()
    },
    logoff,
    updateUser: ()=>{
        Api.user()
    }
}

export default Account

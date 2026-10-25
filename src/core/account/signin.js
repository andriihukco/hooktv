import Auth from '../supa/auth'
import Devices from '../supa/devices'
import QR from '../supa/qr'
import Utils from '../../utils/utils'
import Controller from '../controller'
import Platform from '../platform'
import Lang from '../lang'
import Noty from '../../interaction/noty'
import Select from '../../interaction/select'
import Modal from '../../interaction/modal'
import Settings from '../../interaction/settings/settings'

let ticket_poll

/**
 * Войти по email и паролю и зарегистрировать устройство.
 * При лимите устройств промис ждет выбора устройства для выхода.
 * @param {string} email
 * @param {string} pass
 * @returns {Promise<void>} - reject с code (email_not_confirmed, cancelled, ...)
 */
function signIn(email, pass){
    return Auth.signIn(email, pass).then(()=> register())
}

/**
 * Регистрация. Без подтверждения email сессии нет.
 * @param {string} email
 * @param {string} pass
 * @returns {Promise<'signed_in'|'confirm'>}
 */
function signUp(email, pass){
    return Auth.signUp(email, pass).then((result)=>{
        if(!result.confirmed) return 'confirm'

        return register().then(()=> 'signed_in')
    })
}

/**
 * Зарегистрировать текущее устройство. При лимите - выбор устройства для выхода.
 * @returns {Promise<void>}
 */
function register(){
    return Devices.register().catch((e)=>{
        if(e.code == 'device_limit') return manageDevices()

        throw e
    })
}

/**
 * Лимит устройств: выбрать устройство для выхода. Отмена выходит на этом устройстве.
 * @returns {Promise<void>}
 */
function manageDevices(){
    return Devices.list().then((list)=> new Promise((resolve, reject)=>{
        Select.show({
            title: Lang.translate('account_device_limit'),
            items: list.map((d)=>({
                title: d.name || d.device_id,
                subtitle: d.last_seen ? new Date(d.last_seen).toLocaleDateString() : '',
                device_id: d.device_id
            })),
            onSelect: (a)=>{
                Devices.remove(a.device_id).then(()=> Devices.register()).then(resolve).catch(reject)
            },
            onBack: ()=>{
                Auth.clear()

                reject({code: 'cancelled'})
            }
        })
    }))
}

/**
 * Текст ошибки для показа пользователю. Пустая строка - ничего не показывать.
 * @param {object} e - ошибка с code и status
 * @returns {string}
 */
function errorText(e){
    if(e.code == 'cancelled') return ''
    if(e.code == 'email_not_confirmed') return Lang.translate('account_email_not_confirmed')
    if(e.status === 0) return Lang.translate('network_noconnect')

    return Lang.translate('account_signin_failed')
}

/**
 * Перезагрузить приложение с новым аккаунтом
 */
function done(){
    Noty.show(Lang.translate('account_signed_in'))

    window.location.reload()
}

/**
 * Вход на ТВ: показать QR-код с билетом и ждать подтверждения с телефона
 * @param {function} callback - вызывается после входа или отмены
 */
function tvSignIn(callback){
    let box = $('<div class="account-tv-signin"><div class="account-tv-signin__qr"></div><div class="account-tv-signin__text">' + Lang.translate('account_tv_signin_text') + '</div></div>')

    Modal.open({
        title: Lang.translate('account_tv_signin_title'),
        html: box,
        size: 'medium',
        onBack: ()=>{
            if(ticket_poll) ticket_poll.stop()

            Modal.close()

            Controller.toggle('settings_component')

            callback && callback()
        }
    })

    QR.createTicket().then((ticket)=>{
        let url = window.lampa_settings.supabase_signin_url

        if(url) Utils.qrcode(url + '?ticket=' + ticket.id, box.find('.account-tv-signin__qr'), ()=>{})
        else box.find('.account-tv-signin__qr').text(ticket.id)

        ticket_poll = QR.poll(ticket, (session)=>{
            ticket_poll = null

            Auth.save(session)

            Modal.close()

            register().then(done).catch((e)=> Noty.show(errorText(e)))
        }, ()=>{
            ticket_poll = null

            Noty.show(Lang.translate('account_tv_code_expired'))

            Modal.close()

            callback && callback()
        })
    }).catch(()=>{
        Noty.show(Lang.translate('network_noconnect'))

        Modal.close()

        callback && callback()
    })
}

/**
 * Вход и регистрация: всё в правой панели настроек (см. panel.js).
 * На ТВ вход идет по QR-коду с телефона.
 * @param {function} callback - вызывается после входа на ТВ или отмены
 */
function open(callback){
    if(Platform.tv()) return tvSignIn(callback)

    Controller.toggle('settings')

    Settings.create('account', {onBack: ()=> Settings.create('interface')})
}

export default {
    open,
    signIn,
    signUp,
    register,
    errorText,
    done,
    tvSignIn
}

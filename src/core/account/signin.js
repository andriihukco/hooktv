import Auth from '../supa/auth'
import Devices from '../supa/devices'
import QR from '../supa/qr'
import Utils from '../../utils/utils'
import Controller from '../controller'
import Platform from '../platform'
import Lang from '../lang'
import Noty from '../../interaction/noty'
import Select from '../../interaction/select'
import Input from '../../interaction/settings/input'
import Modal from '../../interaction/modal'
import Loading from '../../interaction/loading'
import Settings from '../../interaction/settings/settings'

let ticket_poll

/**
 * Вход по email (телефон) или по QR с телефона (ТВ)
 * @param {function} callback - вызывается после входа или отмены
 */
function open(callback){
    if(Platform.tv()) return tvSignIn(callback)

    Select.show({
        title: Lang.translate('account_signin_title'),
        items: [
            {title: Lang.translate('account_signin_button'), mode: 'signin'},
            {title: Lang.translate('account_signup_button'), mode: 'signup'}
        ],
        onSelect: (a)=>{
            credentials(a.mode == 'signup', callback)
        },
        onBack: ()=>{
            Controller.toggle('settings_component')

            callback && callback()
        }
    })
}

/**
 * Спросить email и пароль, затем войти или зарегистрироваться
 */
function credentials(signup, callback){
    let enabled = Controller.enabled().name

    Input.edit({title: Lang.translate('account_signin_email'), value: '', free: true, nosave: true, nomic: true}, (email)=>{
        if(!email){
            Controller.toggle(enabled)

            return callback && callback()
        }

        Input.edit({title: Lang.translate('account_signin_password'), value: '', free: true, nosave: true, nomic: true, password: true}, (pass)=>{
            Controller.toggle(enabled)

            if(!pass) return callback && callback()

            if(signup) doSignUp(email, pass, callback)
            else doSignIn(email, pass, callback)
        })
    })
}

function doSignIn(email, pass, callback){
    Loading.start(()=>{
        Loading.stop()
    })

    Auth.signIn(email, pass).then(()=>{
        Loading.stop()

        registerThen(callback)
    }).catch((e)=>{
        Loading.stop()

        if(e.code == 'email_not_confirmed') confirmEmail(email, callback)
        else Noty.show(Lang.translate('account_signin_failed'))
    })
}

function doSignUp(email, pass, callback){
    Loading.start(()=>{
        Loading.stop()
    })

    Auth.signUp(email, pass).then((result)=>{
        Loading.stop()

        if(result.confirmed) return registerThen(callback)

        Noty.show(Lang.translate('account_signup_confirm'))

        callback && callback()
    }).catch(()=>{
        Loading.stop()

        Noty.show(Lang.translate('network_noconnect'))
    })
}

/**
 * Письмо подтверждения не подтверждено: предложить отправить снова
 */
function confirmEmail(email, callback){
    Select.show({
        title: Lang.translate('account_email_not_confirmed'),
        items: [
            {title: Lang.translate('account_resend'), resend: true},
            {title: Lang.translate('cancel')}
        ],
        onSelect: (a)=>{
            if(a.resend) Auth.resend(email).then(()=>Noty.show(Lang.translate('account_signup_confirm'))).catch(()=>{})

            callback && callback()
        },
        onBack: ()=>{
            callback && callback()
        }
    })
}

/**
 * Зарегистрировать устройство после входа. При лимите показать устройства.
 */
function registerThen(callback){
    Devices.register().then(()=>{
        done(callback)
    }).catch((e)=>{
        if(e.code == 'device_limit') manageDevices(callback)
        else{
            Noty.show(Lang.translate('network_noconnect'))

            callback && callback()
        }
    })
}

/**
 * Лимит устройств: выбрать устройство для выхода. Отмена выходит на этом устройстве.
 */
function manageDevices(callback){
    Devices.list().then((list)=>{
        Select.show({
            title: Lang.translate('account_device_limit'),
            items: list.map((d)=>({
                title: d.name || d.device_id,
                subtitle: d.last_seen ? new Date(d.last_seen).toLocaleDateString() : '',
                device_id: d.device_id
            })),
            onSelect: (a)=>{
                Devices.remove(a.device_id).then(()=> Devices.register()).then(()=>{
                    done(callback)
                }).catch(()=>{
                    Noty.show(Lang.translate('network_noconnect'))
                })
            },
            onBack: ()=>{
                Auth.clear()

                callback && callback()
            }
        })
    }).catch(()=>{
        Auth.clear()

        Noty.show(Lang.translate('network_noconnect'))

        callback && callback()
    })
}

function done(callback){
    Noty.show(Lang.translate('account_signed_in'))

    callback && callback()

    window.location.reload()
}

/**
 * Вход на ТВ: показать QR-код с билетом и ждать подтверждения с телефона
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

            registerThen(callback)
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
 * Кнопка входа в настройках аккаунта
 */
function init(){
    Settings.listener.follow('open',(e)=>{
        if(e.name == 'account') e.body.find('.settings--account-device-add').on('hover:enter', ()=>{
            open(()=>{
                Controller.toggle('settings_component')
            })
        })
    })
}

export default {
    init: Utils.onceInit(init),
    open
}

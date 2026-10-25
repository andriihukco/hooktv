import Utils from '../../utils/utils'
import Permit from './permit'
import Controller from '../controller'
import Select from '../../interaction/select'
import Input from '../../interaction/settings/input'
import Noty from '../../interaction/noty'
import Lang from '../lang'
import Settings from '../../interaction/settings/settings'
import Bookmarks from './bookmarks'
import SignOut from '../supa/signout'
import Auth from '../supa/auth'
import SignIn from './signin'
import Profile from './profile'
import Platform from '../platform'

// Поля входа хранятся только в памяти: пароль не попадает в localStorage
let form = {email: '', password: ''}
let needs_confirm = false

function init(){
    Settings.listener.follow('open',(e)=>{
        if(e.name == 'account') render(e.body)
    })
}

/**
 * Открыть поле ввода в правой панели (экранная клавиатура) и записать значение в форму
 */
function edit(title, value, password, onValue){
    let enabled = Controller.enabled().name

    Input.edit({title: Lang.translate(title), value: value, free: true, nosave: true, nomic: true, password: password}, (v)=>{
        Controller.toggle(enabled)

        if(v !== undefined && v !== null) onValue(String(v).trim())
    })
}

function drawForm(body){
    body.find('.settings--account-email .settings-param__value').text(form.email || '—')
    body.find('.settings--account-password .settings-param__value').text(form.password ? '•'.repeat(form.password.length) : '—')
    body.find('.settings--account-resend').toggleClass('hide', !needs_confirm)
    body.find('.settings--account-tv').toggleClass('hide', !Platform.tv())
}

function submit(body, signup){
    if(!form.email || !form.password){
        Noty.show(Lang.translate('account_signin_failed'))

        return
    }

    let run = signup ? SignIn.signUp(form.email, form.password) : SignIn.signIn(form.email, form.password)

    run.then((result)=>{
        needs_confirm = false

        if(result == 'confirm'){
            Noty.show(Lang.translate('account_signup_confirm'))

            drawForm(body)
        }
        else SignIn.done()
    }).catch((e)=>{
        needs_confirm = e.code == 'email_not_confirmed'

        Noty.show(SignIn.errorText(e))

        drawForm(body)
    })
}

function render(body){
    let account = Permit.account
    let signed  = Boolean(Permit.token)

    if(!window.lampa_settings.account_sync){
        body.find('[data-name="account_use"]').remove()
    }

    body.find('.settings--account-signin').toggleClass('hide', signed)
    body.find('.settings--account-user').toggleClass('hide', !signed)

    if(!signed){
        drawForm(body)

        body.find('.settings--account-email').on('hover:enter', ()=>{
            edit('account_signin_email', form.email, false, (v)=>{
                form.email = v

                drawForm(body)
            })
        })

        body.find('.settings--account-password').on('hover:enter', ()=>{
            edit('account_signin_password', form.password, true, (v)=>{
                form.password = v

                drawForm(body)
            })
        })

        body.find('.settings--account-do-signin').on('hover:enter', ()=> submit(body, false))
        body.find('.settings--account-do-signup').on('hover:enter', ()=> submit(body, true))

        body.find('.settings--account-resend').on('hover:enter', ()=>{
            Auth.resend(form.email).then(()=>{
                Noty.show(Lang.translate('account_signup_confirm'))
            }).catch(()=>{
                Noty.show(Lang.translate('network_noconnect'))
            })
        })

        body.find('.settings--account-tv').on('hover:enter', ()=>{
            SignIn.tvSignIn(()=>{
                Controller.toggle('settings_component')
            })
        })
    }

    if(signed){
        body.find('.settings--account-user-info .settings-param__value').text(account.email)
        body.find('.settings--account-user-profile .settings-param__value').text(account.profile.name)

        body.find('.settings--account-user-out').on('hover:enter',()=>{
            SignOut.signOutThisDevice().then(()=>{
                window.location.reload()
            })
        })

        body.find('.settings--account-user-sync').on('hover:enter',(e)=>{
            account = Permit.account

            Select.show({
                title: Lang.translate('settings_cub_sync'),
                items: [
                    {
                        title: Lang.translate('confirm'),
                        subtitle: Lang.translate('account_sync_to_profile') + ' ('+account.profile.name+')',
                        confirm: true
                    },
                    {
                        title: Lang.translate('cancel')
                    }
                ],
                onSelect: (a)=>{
                    if(a.confirm){
                        let loader = $('<div class="broadcast__scan" style="margin: 1em 0 0 0"><div></div></div>')

                        $(e.target).append(loader)

                        Bookmarks.sync(()=>{
                            loader.remove()
                        })
                    }

                    Controller.toggle('settings_component')
                },
                onBack: ()=>{
                    Controller.toggle('settings_component')
                }
            })
        })

        body.find('.settings--account-user-profile .settings-param__value').text(account.profile.name)

        body.find('.settings--account-user-profile').on('hover:enter',()=>{
            Profile.select(()=>{
                Controller.toggle('settings_component')
            })
        })
    }
}

export default {
    init: Utils.onceInit(init),
    render
}

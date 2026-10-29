import Template from '../../interaction/template'
import Modal from '../../interaction/modal'
import Controller from '../controller'
import Noty from '../../interaction/noty'
import Lang from '../lang'
import SignIn from './signin'

function show(template_name){
    let enabled = Controller.enabled().name

    Modal.open({
        title: '',
        html: Template.get(template_name),
        onBack: ()=>{
            Modal.close()

            Controller.toggle(enabled)
        }
    })
}

/**
 * Вход в аккаунт: правая панель настроек или QR на ТВ (см. signin.js)
 */
function account(){
    SignIn.open()
}

function limited(){
    show('account_limited')
}

/**
 * Премиум не используется: подписки и CUB-страницы убраны
 */
function premium(){
    Noty.show(Lang.translate('account_premium_unavailable'))
}

export default {
    account,
    limited,
    premium
}

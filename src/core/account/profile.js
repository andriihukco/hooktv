import Permit from './permit'
import Profiles from '../supa/profiles'
import Arrays from '../../utils/arrays'
import Utils from '../../utils/utils'
import Listener from './listener'
import Storage from '../storage/storage'
import ParentalControl from '../../interaction/parental_control'
import Controller from '../controller'
import Select from '../../interaction/select'
import Noty from '../../interaction/noty'
import Loading from '../../interaction/loading'
import Lang from '../lang'
import Advert from './modal'
import Input from '../../interaction/settings/input'
import Bell from '../../interaction/bell'

function init(){
    ParentalControl.add('account_profiles',{
        title: 'account_profiles'
    })
}

/**
 * Аватар профиля: первая буква имени на цветном круге. Внешних картинок нет.
 * @param {string} name - имя профиля
 * @returns {string} - html
 */
function avatar(name){
    let letter = String(name || '?').trim().charAt(0).toUpperCase().replace(/[<>&"']/g, '') || '?'

    return '<div class="account-avatar">' + letter + '</div>'
}

/**
 * Проверяет наличие профиля, если его нет - загружает
 * @param {function} call - вызывается если профиль есть
 * @returns {void}
 */
function check(call){
    if(Permit.access){
        Profiles.list().then((profiles)=>{
            let account = Permit.account

            if(account.profile.id){
                let active = profiles.find(p=>p.id == account.profile.id)

                if(active) account.profile = active
            }
            else{
                let main = profiles.find(p=>p.main)

                if(main) account.profile = main
            }

            Storage.set('account', account, true)

            // Переключение на детский источник
            Listener.send('profile_check', {profile: account.profile})

            call()
        }).catch(call)
    }
    else{
        Storage.set('account_user','', true)
    }
}

/**
 * Выбор профиля
 * @param {string} callback - вызывается после выбора
 * @returns {void}
 */
function select(callback){
    ParentalControl.personal('account_profiles',()=>{
        if(!Permit.token) return Advert.account()

        let account = Permit.account

        Loading.start(()=>{
            Loading.stop()
        })

        Profiles.list().then((profiles)=>{
            Loading.stop()

            if(profiles){
                let items = Arrays.clone(profiles)
                let clone = Arrays.clone(profiles)

                items.reverse()
                clone.reverse()

                let select  = []
                let maximum = Profiles.limit(false)

                let list = items.map((elem, index)=>{
                    elem.title    = elem.name
                    elem.template = 'selectbox_icon'
                    elem.icon     = avatar(elem.name)
                    elem.clone    = clone[index]
                    elem.subtitle = elem.main ? Lang.translate('account_profile_main') : elem.child ? Lang.translate('account_profile_child') + ' ' + '(' + Lang.translate('filter_rating_to') + ' ' + (elem.age || 12) + ')' : ''

                    elem.selected = account.profile.id == elem.id

                    return elem
                })

                
                let additional = {
                    title: Lang.translate('account_profile_add'),
                    template: 'selectbox_icon',
                    icon: '<svg><use xlink:href="#sprite-plus"></use></svg>',
                    ghost: list.length >= maximum,
                    onSelect: (a)=>{
                        callback && callback()

                        if(a.ghost){
                            Noty.show(Lang.translate('account_profile_limited').replace('{count}', maximum))
                        }
                        else{
                            let contrioller = Controller.enabled().name

                            Input.edit({
                                title: Lampa.Lang.translate('account_profile_name'),
                                value: '',
                                free: true,
                                nosave: true,
                                nomic: true
                            },(name)=>{
                                Controller.toggle(contrioller)

                                if(name){
                                    name = Utils.capitalizeFirstLetter(name)

                                    Profiles.create(name, false).then(()=>{
                                        Bell.push({text: Lang.translate('account_profile_created')})
                                    }).catch((e)=>{
                                        Noty.show(Lang.translate(e.code == 'profile_limit' ? 'account_profile_limited' : 'network_error').replace('{count}', maximum))
                                    })
                                }
                            })
                        }
                    }
                }
                
                select = [additional].concat(list)

                Select.show({
                    title: Lang.translate('account_profiles'),
                    items: select,
                    onSelect: (a)=>{
                        account.profile = a.clone

                        Storage.set('account', account)

                        callback && callback()

                        Listener.send('profile_select', {profile: account.profile})
                    },
                    onBack: callback,
                    onFullDraw: (container)=>{
                        container.append($('<div class="selectbox__text selector"><div>'+Lang.translate('account_profile_info')+'</div></div>'))
                    }
                })
            }
            else{
                Noty.show(Lang.translate('account_profiles_empty'))

                callback && callback()
            }
        }).catch(()=>{
            Loading.stop()
            
            Noty.show(Lang.translate('account_profiles_empty'))
        })
    }, false, true)
}

export default {
    init: Utils.onceInit(init),
    check,
    select
}
import Api from '../interaction/settings/api'
import Lang from '../core/lang'
import {CATEGORIES, storageKey} from './categories'
import {connected, toggle} from './account'

let registered = false

/**
 * Put the YouTube account and the category switches on the Settings → Interface page
 * (once, at startup). The Video tab itself has no settings page.
 */
export function registerSettings(){
    if(registered) return
    registered = true

    Api.addParam({
        component: 'interface',
        param: {name: 'videos_account', type: 'button'},
        field: {name: Lang.translate('videos_settings_account'), description: connected() ? Lang.translate('videos_account_on') : Lang.translate('videos_account_off')},
        onChange: ()=> toggle()
    })

    CATEGORIES.forEach(item=>{
        Api.addParam({
            component: 'interface',
            param: {name: storageKey(item.id), type: 'trigger', default: true},
            field: {name: Lang.translate('videos_settings_category') + ': ' + Lang.translate(item.label)}
        })
    })
}

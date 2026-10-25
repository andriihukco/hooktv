import Settings from '../settings/api'
import Noty from '../noty'
import Lang from '../../core/lang'
import Tastes from '../../core/tastes'
import Wizard from './wizard'

/**
 * HOOK TV: the Tastes section in Settings. Open the wizard, or clear the profile.
 */

let component = 'tastes'
let icon = `<svg width="39" height="39" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.5 2.5L24.2 13.1L35.6 14.3L27.1 21.9L29.5 33.1L19.5 27.5L9.5 33.1L11.9 21.9L3.4 14.3L14.8 13.1L19.5 2.5Z" stroke="white" stroke-width="3" stroke-linejoin="round"/>
</svg>`

function init(){
    Settings.addComponent({
        component,
        icon,
        name: Lang.translate('tastes_title'),
        // essential puts it on the main list; before makes it the first item there
        essential: true,
        before: 'interface'
    })

    // the wizard's own page in the same panel: opened by Wizard.open, never listed itself
    Settings.addComponent({
        component: 'tastes_wizard',
        icon,
        name: Lang.translate('tastes_title'),
        essential: true
    })

    Wizard.init()

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('tastes_open_wizard'),
            description: Lang.translate('tastes_open_descr')
        },
        onChange: ()=>{
            Wizard.open()
        }
    })

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('tastes_reset'),
            description: Lang.translate('tastes_reset_descr')
        },
        onChange: ()=>{
            let ok = Tastes.reset()

            Noty.show(Lang.translate(ok ? 'tastes_reset_done' : 'tastes_save_failed'))
        }
    })
}

export default {init}

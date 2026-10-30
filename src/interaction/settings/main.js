import Template from '../../interaction/template'
import Controller from '../../core/controller'
import Scroll from '../../interaction/scroll'
import Api from './api'
import ReleaseNotes from '../release_notes'
import Brand from '../../core/brand'
import adminTap from './admin_gate'

function Main(){
    let comp
    let scrl = new Scroll({mask:true,over:true,step:200})
    let last

    /**
     * Создать
     */
    this.create = ()=>{
        comp = Template.get('settings_main')

        if(!window.lampa_settings.plugins_use) comp.find('[data-component="plugins"]').remove()
        if(!Lampa.Platform.is('apple_tv')) comp.find('[data-component="appletv"]').remove()

        if(!window.lampa_settings.torrents_use){
            comp.find('[data-component="parser"]').remove()
            comp.find('[data-component="server"]').remove()
        }

        // Info: what changed in the app, with a dot while this device is behind
        comp.find('[data-component="whats_new"] .whats-new-dot').toggleClass('hide', !ReleaseNotes.hasNew())
        comp.find('[data-component="whats_new"]').on('hover:enter', ()=>ReleaseNotes.open())

        // The build row ends the list; five presses on it open the admin login
        let build = Brand.getConfig().app
        comp.find('[data-build] .settings-folder__value').text(build.display_version + ' (' + build.build_number + ')')
        comp.find('[data-build]').on('hover:enter', ()=> adminTap())

        scrl.render().css('max-height', window.innerWidth <= 480 ? window.innerHeight * 0.6 : 'unset')
        scrl.append(comp)
        scrl.addSwipeDown(this.swipeAction)

        this.update()
    }

    /**
     * Обновить события
     */
    this.update = ()=>{
        let components = Api.allComponents()

        for(let name in components){
            let aded = components[name]

            // Only core sections live on the main menu; everything else is under «Other»
            if(!aded.essential) continue

            if(!comp.find('[data-component="'+name+'"]').length){
                let item = $(`<div class="settings-folder selector" data-component="${name}">
                    <div class="settings-folder__icon">
                        ${aded.icon}
                    </div>
                    <div class="settings-folder__name">${aded.name}</div>
                </div>`)

                if(aded.before) comp.find('[data-component="'+aded.before+'"]').before(item)
                else if(aded.after) comp.find('[data-component="'+aded.after+'"]').after(item)
                else comp.append(item)
            }
        }

        comp.find('.selector').unbind('hover:focus').on('hover:focus',(event)=>{
            last = event.target

            scrl.update($(event.target),true)
        }).unbind('hover:hover hover:touch').on('hover:hover hover:touch',(event)=>{
            last = event.target

            Navigator.focused(event.target)
        }).not('[data-static]').unbind('hover:enter').on('hover:enter',(event)=>{
            this.render().detach()

            this.onCreate($(event.target).data('component'))
        })
    }

    /**
     * Сделать активным
     */
    this.active = function(){
        Controller.collectionSet(comp)
        Controller.collectionFocus(last,comp)

        scrl.height($('.settings__head'))
    }

    /**
     * Рендер
     * @returns {object}
     */
    this.render = ()=>{
        return scrl.render()
    }
}

export default Main

import Template from '../../interaction/template'
import Controller from '../../core/controller.js'
import Scroll from '../../interaction/scroll'
import Params from '../settings/params'
import Platform from '../../core/platform.js'
import Api from './api'
import Lang from '../../core/lang'
import Material from '../../utils/material'

function Component(name, component_params = {}){
    let scrl = new Scroll({mask: true, over:true, step: 200})
    let comp = Template.get('settings_'+name)
    let last

    scrl.addSwipeDown(()=>{
        Controller.back()
    })

    /**
     * Обновить скролл
     */
    function updateScroll(){
        comp.find('.selector').unbind('hover:focus').on('hover:focus',(e)=>{
            last = e.target
    
            scrl.update($(e.target),true)
        }).unbind('hover:hover hover:touch').on('hover:hover hover:touch',(e)=>{
            last = e.target
        })
    }

    /**
     * Билдим все события
     */
    function buildEvents(){
        if(!Platform.is('android')){
            comp.find('.is--android').remove()
        }
        
        if(!Platform.any()){
            comp.find('.is--player').remove()
        }

        if(!Platform.desktop() || Platform.macOS()){
            comp.find('.is--nw').remove()
        }

        if(!(Platform.is('android') || Platform.is('browser') || Platform.is('apple_tv') || Platform.desktop())){
            comp.find('.is--sound').remove()
        }

        if(!Platform.screen('tv')){
            comp.find('.is--tv').remove()
        }

        if(!window.lampa_settings.lang_use) comp.find('[data-name="light_version"]').prev().remove()

        if(!window.lampa_settings.account_use) comp.find('[data-component="account"]').remove()

        scrl.render().find('.scroll__content').addClass('layer--wheight').data('mheight',$('.settings__head'))
        scrl.render().css('max-height', window.innerWidth <= 480 ? window.innerHeight * 0.6 : 'unset')

        Params.bind(comp.find('.selector'), comp)

        comp.find('.settings-folder').unbind('hover:enter click').on('hover:enter click', (event)=>{
            let targetComponent = $(event.currentTarget).data('component')
            if(targetComponent && window.Lampa && window.Lampa.Settings){
                scrl.destroy()
                comp.remove()
                Params.listener.remove('update_scroll', updateScroll)
                window.Lampa.Settings.create(targetComponent, {
                    onBack: ()=>{
                        window.Lampa.Settings.create(name)
                    }
                })
            }
        })

        Params.listener.follow('update_scroll',updateScroll)

        Params.listener.follow('update_scroll_position',()=>{
            if(last) scrl.update(last,true)
        })

        updateScroll()
    }

    /**
     * Все разделы, которые не входят в основное меню, выводим в конце раздела «Other»
     */
    function addAdvanced(){
        let components = Api.allComponents()
        let anchor = comp.find('.settings-folder').last()

        for(let key in components){
            let data = components[key]

            if(data.essential) continue

            let item = $(`<div class="settings-folder selector" data-component="${key}">
                <div class="settings-folder__icon">${data.icon}</div>
                <div class="settings-folder__name">${data.name}</div>
            </div>`)

            if(anchor.length) anchor.after(item)
            else comp.prepend(item)

            anchor = item
        }
    }

    /**
     * Добавляем пользовательские параметры
     */
    function addParams(key = name){
        let params = Api.getParam(key)

        if(params){
            params.forEach(data=>{
                let item;

                if(data.param.type == 'select'){
                    item = $(`<div class="settings-param selector" data-type="select" data-name="${data.param.name}">
                        <div class="settings-param__name">${data.field.name}</div>
                        <div class="settings-param__value"></div>
                    </div>`)
                }
                if(data.param.type == 'trigger'){
                    item = $(`<div class="settings-param selector" data-type="toggle" data-name="${data.param.name}">
                        <div class="settings-param__name">${data.field.name}</div>
                        <div class="settings-param__value"></div>
                    </div>`)
                }
                if(data.param.type == 'input'){
                    item = $(`<div class="settings-param selector" data-type="input" data-name="${data.param.name}" placeholder="${data.param.placeholder}">
                        <div class="settings-param__name">${data.field.name}</div>
                        <div class="settings-param__value"></div>
                    </div>`)
                }
                if(data.param.type == 'title'){
                    item = $(`<div class="settings-param-title"><span>${data.field.name}</span></div>`)
                }
                if(data.param.type == 'static'){
                    item = $(`<div class="settings-param selector" data-static="true">
                        <div class="settings-param__name">${data.field.name}</div>
                    </div>`)
                }
                if(data.param.type == 'button'){
                    item = $(`<div class="settings-param selector settings-param--button" data-name="${data.param.name}" data-static="true" data-type="button">
                        <div class="settings-param__name">${data.field.name}</div>
                    </div>`)
                }

                if(item){
                    if(data.field.description) item.append(`<div class="settings-param__descr">${data.field.description}</div>`)

                    if(typeof data.onRender == 'function') data.onRender(item)
                    if(typeof data.onChange == 'function') item.data('onChange', data.onChange)

                    comp.append(item)
                } 
            })
        }
    }
    
    /**
     * HOOK TV: rows and headings the flat page drops, by param name and title
     */
    function hideRows(){
        let rows   = ['background','player','player_torrent','player_scale_method','player_hls_method','source','protocol','request_caching','pages_save_total','time_offset','navigation_type','keyboard_type','device_name','export','terminal','poster_size','proxy_tmdb_auto','proxy_tmdb','tmdb_proxy_api','tmdb_proxy_image']
        let titles = ['settings_interface_background','settings_main_player','more','menu_console']

        rows.forEach(name=>comp.find('[data-name="' + name + '"]').remove())

        comp.find('.settings-param-title').each(function(){
            let text = $(this).text().trim().toLowerCase()

            if(titles.some(key=>text == Lang.translate(key).trim().toLowerCase())) $(this).remove()
        })
    }

    /**
     * HOOK TV: settings are one flat page. Every section's rows follow the
     * interface rows under a title, so nothing opens a second screen.
     */
    function addSections(){
        // the groups inside each template carry their own titles; a section title only
        // stands in front of a section whose groups would otherwise lose their context
        let sections = [
            ['player', 'settings_main_player'],
            ['more', '']
        ]

        sections.forEach(([key, title])=>{
            let section = Template.get('settings_' + key)

            section.find('.settings-folder').remove()

            if(title) comp.append(`<div class="settings-param-title"><span>${Lang.translate(title)}</span></div>`)
            comp.append(section.children())

            addParams(key)
        })

        hideRows()

        let components = Api.allComponents()

        // sources pick themselves, remote setup is for developers and the BWA plugin's own
        // options are not ours to offer: none of them is a choice for the viewer
        let hidden = ['hook_online', 'remote_configuration', 'content_rows', 'bwa']

        for(let key in components){
            if(key == name || hidden.indexOf(key) >= 0) continue

            comp.append(`<div class="settings-param-title"><span>${components[key].name}</span></div>`)

            addParams(key)
        }
    }

    /**
     * Стартуем
     */
    function start(){
        if(name == 'more') addAdvanced()

        addParams()

        if(name == 'interface') addSections()

        buildEvents()

        if(typeof component_params.last_index !== 'undefined' && component_params.last_index > 0) last = comp.find('.selector').eq(component_params.last_index)[0]

        Controller.add('settings_component',{
            toggle: ()=>{
                Controller.collectionSet(comp)
                Controller.collectionFocus(last,comp)
            },
            up: ()=>{
                Navigator.move('up')
            },
            down: ()=>{
                Navigator.move('down')
            },
            back: ()=>{
                scrl.destroy()
    
                comp.remove()
    
                Params.listener.remove('update_scroll',updateScroll)

                if(component_params.onBack) component_params.onBack()
                else Controller.toggle('settings')
            }
        })
    }

    start()

    /**
     * Уничтожить
     */
    this.destroy = ()=>{
        scrl.destroy()

        comp.remove()

        comp = null

        Params.listener.remove('update_scroll',updateScroll)
    }

    /**
     * Рендер
     * @returns {object}
     */
    this.render = ()=>{
        scrl.append(comp)
        
        return scrl.render()
    }
}

export default Component
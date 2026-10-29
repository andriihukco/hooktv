import Category from '../interaction/items/category'
import Activity from '../interaction/activity/activity'
import Select from '../interaction/select'
import Controller from '../core/controller'
import Lang from '../core/lang'
import Utils from '../utils/utils'
import Prefs from '../core/ua_tv_prefs'
import {tile, enter} from './ua_tv'

/**
 * Cards of one page: a group's visible channels, or every channel on "all" (hidden ones marked)
 * @param {string} group page id or 'all'
 */
function items(group){
    let list = group == 'all' ? Prefs.all() : Prefs.visible(c=>c.group == group)

    return list.map((channel, i)=>{
        let card = tile(channel, -(i + 1))

        // a hidden channel is dimmed on the all page, so it reads as off
        if(group == 'all' && Prefs.isHidden(channel)){
            card.title = channel.name + ' · ' + Lang.translate('ua_tv_hidden')
            card.brand = '#0d0d0f'
        }

        return card
    })
}

/**
 * On a group page enter plays the channel. On "all" it opens the channel's menu:
 * play, hide or show, and move up or down in the list.
 * @param {object} data card
 * @param {string} group page id or 'all'
 */
function open(data, group){
    let channel = group == 'all' && Prefs.all().find(c=>c.url == data.stream)

    if(!channel) return enter(data)

    let hidden  = Prefs.isHidden(channel)

    Select.show({
        title: channel.name,
        items: [
            {title: Lang.translate('ua_tv_play'), action: ()=>enter(data)},
            {title: Lang.translate(hidden ? 'ua_tv_show' : 'ua_tv_hide'), action: ()=>Prefs.toggleHidden(channel), refresh: true},
            {title: Lang.translate('ua_tv_move_up'), action: ()=>Prefs.move(channel, -1), refresh: true},
            {title: Lang.translate('ua_tv_move_down'), action: ()=>Prefs.move(channel, 1), refresh: true}
        ],
        onSelect: (a)=>{
            Controller.toggle('content')

            a.action()

            if(a.refresh) Activity.replace()
        },
        onBack: ()=>{
            Controller.toggle('content')
        }
    })
}

/**
 * Компонент сторінки з сіткою каналів: група або всі канали
 * @param {object} object - group: page id or 'all', title
 * @return {object} - Экземпляр компонента
 */
function component(object){
    let comp = Utils.createInstance(Category, object)

    comp.use({
        onCreate: function(){
            this.build({results: items(object.group), page: 1, total_pages: 1})
        },
        onNext: function(resolve, reject){
            reject.call(this)
        },
        onInstance: function(card, data){
            card.use({
                onEnter: ()=>open(data, object.group)
            })
        }
    })

    return comp
}

export default component

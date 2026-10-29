import Main from '../interaction/items/main'
import Utils from '../utils/utils'
import Lang from '../core/lang'
import Player from '../interaction/player'
import CardModule from '../interaction/card/module/module'
import uaTv from '../core/api/sources/ua_tv'

/**
 * Carousel of free Ukrainian TV channels, styled like the streaming row.
 * Each tile is the channel's logo and plays its live stream on enter.
 */
function row(){
    return {
        title: Lang.translate('title_ua_tv'),
        results: uaTv.map((channel, i)=>({
            id: -(i + 1),
            title: channel.name,
            logo: channel.logo,
            brand: '#1c1c1e',
            stream: channel.url,
            params: {
                style: {name: 'provider'},
                module: CardModule.only('Card', 'Style', 'Callback')
            }
        })),
        params: {items: {view: uaTv.length}}
    }
}

/**
 * Компонент вкладки "Українське ТБ" в верхней панели
 * @param {object} object - Параметры компонента
 * @return {object} - Экземпляр компонента
 */
function component(object){
    let comp = Utils.createInstance(Main, object)

    comp.use({
        onCreate: function(){
            this.build([row()])
        },
        onNext: function(resolve, reject){
            reject.call(this)
        },
        onInstance: function(item){
            item.use({
                onInstance: function(card, data){
                    card.use({
                        onEnter: ()=>Player.play({url: data.stream, title: data.title, tv: true, isonline: true})
                    })
                }
            })
        }
    })

    return comp
}

export default component

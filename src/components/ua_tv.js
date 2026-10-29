import Main from '../interaction/items/main'
import Utils from '../utils/utils'
import Lang from '../core/lang'
import Api from '../core/api/api'
import Router from '../core/router'
import Player from '../interaction/player'
import CardModule from '../interaction/card/module/module'
import Prefs from '../core/ua_tv_prefs'

// Pages opened from the tab; each one is a grid of its channels
const pages = [
    {id: 'suspilne', title: 'title_ua_group_suspilne', brand: '#3a2e6b'},
    {id: 'news',     title: 'title_ua_group_news',     brand: '#8a1c1c'},
    {id: 'sport',    title: 'title_ua_group_sport',    brand: '#1f6f3a'},
    {id: 'movies',   title: 'title_ua_group_movies',   brand: '#5a3a8a'},
    {id: 'regional', title: 'title_ua_group_regional', brand: '#1d4f6b'}
]

/**
 * A round tile with a channel's logo on its badge
 * @param {object} channel
 * @param {number} id unique negative id for the row
 */
function tile(channel, id){
    return {
        id: id,
        title: channel.name,
        logo: channel.logo,
        // dark or deep-coloured logos get a light badge, bright and white ones sit on dark grey
        brand: channel.bg || '#2a2a2e',
        stream: channel.url,
        params: {
            style: {name: 'provider'},
            module: CardModule.only('Card', 'Style', 'Callback')
        }
    }
}

/**
 * A text tile that opens a page
 * @param {string} id page id, read by enter()
 * @param {string} title translation key
 * @param {string} brand badge colour
 * @param {number} tile_id unique negative id for the row
 */
function pageTile(id, title, brand, tile_id){
    return {
        id: tile_id,
        title: Lang.translate(title),
        brand: brand,
        page: id,
        params: {
            style: {name: 'provider'},
            module: CardModule.only('Card', 'Style', 'Callback')
        }
    }
}

/**
 * The viewer's popular channels, the first row, no title
 */
function popularRow(){
    let list = Prefs.visible(c=>c.popular)

    return {
        title: '',
        results: list.map((channel, i)=>tile(channel, -(i + 1))),
        params: {items: {view: list.length}}
    }
}

/**
 * Row of page tiles: the groups, then all channels
 */
function pagesRow(){
    let results = pages.map((page, i)=>pageTile(page.id, page.title, page.brand, -(100 + i)))

    results.push(pageTile('all', 'title_ua_group_all', '#2a2a2e', -200))

    return {
        title: '',
        results: results,
        params: {items: {view: results.length}}
    }
}

/**
 * Enter on a tile: play a channel, open its page, or open the card's details
 * @param {object} data tile
 */
function enter(data){
    if(data.stream) Player.play({url: data.stream, title: data.title, tv: true, isonline: true})
    else if(data.page) Router.call('ua_tv_grid', {group: data.page, title: Lang.translate(data.page == 'all' ? 'title_ua_group_all' : (pages.find(p=>p.id == data.page) || {}).title || '')})
    else Router.call('full', data)
}

/**
 * Компонент вкладки "ТБ" в верхней панели: популярні канали, сторінки груп, потім серіали, фільми та шоу
 * @param {object} object - Параметры компонента
 * @return {object} - Экземпляр компонента
 */
function component(object){
    let comp = Utils.createInstance(Main, object)

    comp.use({
        onCreate: function(){
            Api.uaTv(object, (rows)=>this.build([popularRow(), pagesRow()].concat(rows)), ()=>this.build([popularRow(), pagesRow()]))
        },
        onNext: function(resolve, reject){
            reject.call(this)
        },
        onInstance: function(item){
            item.use({
                onInstance: function(card, data){
                    card.use({
                        onEnter: ()=>enter(data)
                    })
                }
            })
        }
    })

    return comp
}

export {tile, enter}
export default component

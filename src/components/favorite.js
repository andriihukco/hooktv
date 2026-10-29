import Api from '../core/api/api'
import Favorite from '../core/favorite'
import Lang from '../core/lang'
import LibraryHeader from '../interaction/library_header'
import LibraryFilter from '../utils/library_filter'
import Activity from '../interaction/activity/activity'
import Category from '../interaction/items/category'
import CategoryModule from '../interaction/items/category/module/module'
import Background from '../interaction/background'
import Utils from '../utils/utils'
import Router from '../core/router'
import EmptyRouter from '../interaction/empty/module/router'

/**
 * Чипы Все / Фільми / Серіали с количеством; переключают фильтр той же страницы
 * @param {*} object
 * @returns {Array}
 */
function mediaChips(object){
    let cards = LibraryFilter.apply(Favorite.get({type: object.type}), object.library_filter)
    let count = (type)=> type == 'tv' ? cards.filter(c=>c.name).length : type == 'movie' ? cards.filter(c=>!c.name && !c.game).length : type == 'games' ? cards.filter(c=>c.game).length : cards.length
    let active = object.filter == 'tv' || object.filter == 'movie' || object.filter == 'games' ? object.filter : 'all'

    let chips = [
        {title: Lang.translate('library_all'), count: count('all'),   active: active == 'all',   onSelect: ()=>Activity.replace({filter: ''})},
        {title: Lang.translate('menu_movies'), count: count('movie'), active: active == 'movie', onSelect: ()=>Activity.replace({filter: 'movie'})},
        {title: Lang.translate('menu_tv'),     count: count('tv'),    active: active == 'tv',    onSelect: ()=>Activity.replace({filter: 'tv'})},
        {title: Lang.translate('menu_games'),  count: count('games'), active: active == 'games', onSelect: ()=>Activity.replace({filter: 'games'})}
    ]

    // an empty kind has nothing to show, so its chip stays away unless it is the open one
    return chips.filter(chip=>chip.count || chip.active)
}

/**
 * Компонент избранного, просмотр папки или истории
 * @param {*} object 
 * @returns 
 */

function component(object){
    let comp = Utils.createInstance(Category, object, {
        module: CategoryModule.toggle(CategoryModule.MASK.base, 'Pagination'),
        empty: {
            type: object.type,
            router: 'favorites'
        }
    })

    comp.use(EmptyRouter, 0)

    comp.use({
        onCreate: function(){
            LibraryHeader.mount(comp, mediaChips(object))

            Api.favorite(object, (data)=>{
                // Ой все, и так сработает :)
                setTimeout(this.build.bind(this, data), 10)
            }, this.empty.bind(this))
        },
        onNext: function(resolve, reject){
            Api.favorite(object, resolve.bind(this), reject.bind(this))
        },
        onInstance: function(item, data){
            item.use({
                onEnter: Router.call.bind(Router, 'full', data),
                onFocus: function(){
                    Background.change(Utils.cardImgBackground(data))
                }
            })
        }
    })

    return comp
}

export default component
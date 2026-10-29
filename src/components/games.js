import Category from '../interaction/items/category'
import CardModule from '../interaction/card/module/module'
import Utils from '../utils/utils'
import Games from '../games/runtime'
import Activity from '../interaction/activity/activity'
import {categories, categoryById, categoryCardId, cardData} from '../games/catalog'

/**
 * Games tab. The root shows the categories as folders; a folder opens the games in it.
 * Enter on a game opens it full-screen; enter on a folder opens that folder.
 * `all` is the page More on the games row opens: every game in one grid, grouped by category.
 * @param {object} object activity; `category` set means a folder page
 * @return {object} component instance
 */
function component(object){
    // the folders share one row across the whole screen; a folder's games keep the usual grid
    let comp = Utils.createInstance(Category, object, object.category || object.all ? {} : {items: {cols: 5}})
    let folder = object.category && categoryById(object.category)

    comp.use({
        onCreate: function(){
            let results = folder ? folder.games.map(g=>Object.assign(cardData(g), {
                params: {
                    style: {name: 'game'},
                    module: CardModule.only('Card', 'Style', 'Callback')
                }
            })) : object.all ? categories.reduce((list, c)=>list.concat(c.games), []).map(g=>Object.assign(cardData(g), {
                params: {
                    style: {name: 'game'},
                    module: CardModule.only('Card', 'Style', 'Callback')
                }
            })) : categories.map(c=>({
                id: categoryCardId(c.id),
                title: c.title,
                overview: c.overview,
                category: c.id,
                games: c.games.map(g=>g.id),
                c1: c.c1,
                c2: c.c2,
                params: {
                    style: {name: 'game'},
                    module: CardModule.only('Card', 'Style', 'Callback')
                }
            }))

            this.build({results, page: 1, total_pages: 1})
        },
        onNext: function(resolve, reject){
            reject.call(this)
        },
        onInstance: function(card, data){
            card.use({
                onEnter: ()=>{
                    if(data.category) Activity.push({url: '', title: data.title, component: 'games', category: data.category})
                    else Games.open(data.game)
                }
            })
        }
    })

    return comp
}

export default component

import Category from '../interaction/items/category'
import CardModule from '../interaction/card/module/module'
import Utils from '../utils/utils'
import Games from '../games/runtime'
import Activity from '../interaction/activity/activity'
import {categories, categoryById, categoryCardId, cardData} from '../games/catalog'

/**
 * Every game, category by category: each game carries its category's title as `group`
 * @returns {Array} game cards
 */
function allGames(){
    return categories.reduce((list, c)=>list.concat(c.games.map(g=>Object.assign(cardData(g), {
        group: c.title,
        params: {
            style: {name: 'game'},
            module: CardModule.only('Card', 'Style', 'Callback')
        }
    }))), [])
}

/**
 * Games tab. The root shows the categories as folders; a folder opens the games in it.
 * Enter on a game opens it full-screen; enter on a folder opens that folder.
 * `all` is the page More on the games row opens: every game in one grid, with a header per category.
 * @param {object} object activity; `category` set means a folder page
 * @return {object} component instance
 */
function component(object){
    // the folders share one row across the whole screen; a folder's games keep the usual grid
    let comp = Utils.createInstance(Category, object, object.category || object.all ? {} : {items: {cols: 5}})
    let folder = object.category && categoryById(object.category)
    let group = ''

    comp.use({
        onCreate: function(){
            let results = folder ? folder.games.map(g=>Object.assign(cardData(g), {
                params: {
                    style: {name: 'game'},
                    module: CardModule.only('Card', 'Style', 'Callback')
                }
            })) : object.all ? allGames() : categories.map(c=>({
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
        // the all-games grid: a header goes in front of the first game of each category
        onAppend: function(item, element){
            if(!object.all || !item.data || !item.data.group || item.data.group == group) return

            group = item.data.group

            let header = document.createElement('div')

            header.className = 'games-group'
            header.textContent = group

            item.render(true).before(header)
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

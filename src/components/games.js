import Category from '../interaction/items/category'
import CardModule from '../interaction/card/module/module'
import Utils from '../utils/utils'
import Games from '../games/runtime'
import Activity from '../interaction/activity/activity'
import home from './games_home'
import {categories, categoryById, cardData} from '../games/catalog'

/**
 * Every game, category by category: each game carries its category's title as `group`
 * @returns {Array} game cards
 */
function allGames(){
    return categories.reduce((list, c)=>list.concat(c.games.map(g=>Object.assign(cardData(g), {
        group: categoryTitle(c),
        params: {
            style: {name: 'game'},
            module: CardModule.only('Card', 'Style', 'Callback')
        }
    }))), [])
}

/**
 * Games tab. A folder page shows the games in one folder; `all` is every game in one grid, with a header per category.
 * The root (neither) is the home in games_home.js.
 * Enter on a game opens it full-screen; enter on a folder opens that folder.
 * @param {object} object activity; `category` set means a folder page
 * @return {object} component instance
 */
function component(object){
    // the root (no folder, no all) is the home: a hero, rows and grids of its own
    if(!object.category && !object.all) return home(object)

    // a folder's games keep the usual grid
    let comp = Utils.createInstance(Category, object, {items: {cols: 5}})
    let folder = object.category && categoryById(object.category)
    let group = ''

    comp.use({
        onCreate: function(){
            let results = folder ? folder.games.map(g=>Object.assign(cardData(g), {
                params: {
                    style: {name: 'game'},
                    module: CardModule.only('Card', 'Style', 'Callback')
                }
            })) : allGames()

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

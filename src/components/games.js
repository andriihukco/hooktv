import Category from '../interaction/items/category'
import CardModule from '../interaction/card/module/module'
import Utils from '../utils/utils'
import Games from '../games/runtime'
import games, {cardData} from '../games/catalog'

/**
 * Games tab: every playable game in one grid; enter opens it full-screen
 * @param {object} object activity
 * @return {object} component instance
 */
function component(object){
    let comp = Utils.createInstance(Category, object)

    comp.use({
        onCreate: function(){
            let results = games.map(g=>Object.assign(cardData(g), {
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
                onEnter: ()=>Games.open(data.game)
            })
        }
    })

    return comp
}

export default component

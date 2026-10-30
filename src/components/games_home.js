import Main from '../interaction/items/main'
import Utils from '../utils/utils'
import Games from '../games/runtime'
import Activity from '../interaction/activity/activity'
import CardModule from '../interaction/card/module/module'
import {rows} from '../games/home'
import {t} from '../games/i18n'

/**
 * Games home: the Games tab root. Enter on a game opens it full-screen; enter on a folder or "All games" opens that page.
 * @param {object} object activity
 * @return {object} component instance
 */
function component(object){
    let comp = Utils.createInstance(Main, object)

    comp.use({
        onCreate: function(){
            this.build(rows(Date.now(), CardModule.only('Card', 'Style', 'Callback')))
        },
        onNext: function(resolve, reject){
            reject.call(this)
        },
        onInstance: function(item){
            item.use({
                onInstance: function(card, data){
                    card.use({
                        onEnter: ()=>{
                            if(data.all) Activity.push({url: '', title: t('hooktv_games_all', 'All games'), component: 'games', all: true})
                            else if(data.category) Activity.push({url: '', title: data.title, component: 'games', category: data.category})
                            else Games.open(data.game)
                        }
                    })
                }
            })
        }
    })

    return comp
}

export default component

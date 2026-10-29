import Category from '../interaction/items/category'
import Utils from '../utils/utils'
import Api from '../core/api/api'
import Router from '../core/router'

/**
 * Productions page, opened by More on the streaming services row: the big studios as round
 * tiles with their logos. A tile opens the studio's movies.
 * @param {object} object activity
 * @return {object} component instance
 */
function component(object){
    let comp = Utils.createInstance(Category, object)

    comp.use({
        onCreate: function(){
            Api.studios(object, this.build.bind(this), this.empty.bind(this))
        },
        onNext: function(resolve, reject){
            reject.call(this)
        },
        onInstance: function(card, data){
            card.use({
                onEnter: Router.call.bind(Router, data.route.name, data.route.params)
            })
        }
    })

    return comp
}

export default component

import Category from '../interaction/items/category'
import Utils from '../utils/utils'
import Api from '../core/api/api'
import Router from '../core/router'

/**
 * The More page of a services row (streaming services or studios): one kind as a grid of round
 * tiles. A tile opens its titles.
 * @param {object} object activity
 * @return {object} component instance
 */
function component(object){
    let comp = Utils.createInstance(Category, object)

    comp.use({
        onCreate: function(){
            Api.services(object, this.build.bind(this), this.empty.bind(this))
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

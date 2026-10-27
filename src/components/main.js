import Api from '../core/api/api'
import Main from '../interaction/items/main'
import Background from '../interaction/background'
import Utils from '../utils/utils'
import Router from '../core/router'
import Hero from '../interaction/hero'

/**
 * Компонент главной страницы
 * @param {object} object - Параметры компонента
 * @return {object} - Экземпляр компонента
 */
function component(object){
    let comp = Utils.createInstance(Main, object)
    let next = null

    comp.use(Hero.module)

    comp.use({
        onCreate: function(){
            let nextCall = Api.main(object, this.build.bind(this), this.empty.bind(this))

            if(typeof nextCall == 'function') next = nextCall
        },
        onNext: function(resolve, reject){
            if(next){
                next(resolve.bind(this), reject.bind(this))
            }
            else reject.call(this)
        },
        onInstance: function(item, data){
            item.use({
                onMore: Router.call.bind(Router, 'category_full', data),
                onInstance: function(card, data){
                    card.use({
                        // a row tile can open its own screen (streaming services open their catalogue)
                        onEnter: data.route ? Router.call.bind(Router, data.route.name, data.route.params) : Router.call.bind(Router, 'full', data),
                        onFocus: function(){
                            Background.change(Utils.cardImgBackground(data))
                        }
                    })
                }
            })
        }
    })

    return comp
}

export default component
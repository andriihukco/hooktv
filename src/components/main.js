import Api from '../core/api/api'
import Main from '../interaction/items/main'
import Background from '../interaction/background'
import Utils from '../utils/utils'
import Router from '../core/router'
import Hero from '../interaction/hero'
import Games from '../games/runtime'
import Line from '../interaction/items/line/line'

/**
 * A chip switches the services row under it: the row is rebuilt with the tiles of the chip's kind,
 * and the chips show which one is on
 * @param {object} main the home component
 * @param {object} chip the chip's data
 */
function swapServices(main, chip){
    // some home items (the hero, the placeholders) carry no data: only rows with data can be a services row
    let row = main.items.find(item=>item.data && (item.data.kind == 'streaming' || item.data.kind == 'studios'))

    if(!row || row.data.kind == chip.kind) return

    chip.load((data)=>{
        if(!data || row.data.kind == data.kind) return

        replaceRow(main, row, data)
    })
}

/**
 * Puts a new row where the old one is: the row is created the same way the home creates its rows
 * @param {object} main the home component
 * @param {object} old the row to replace
 * @param {object} data the new row
 */
function replaceRow(main, old, data){
    let index = main.items.indexOf(old)
    let item  = Utils.createInstance(Line, data)

    main.emit('instance', item, data)

    item.create()

    // appending adds the row to the end of the list; it is moved to the old row's place below
    main.emit('append', item, data)

    main.items.pop()
    main.items[index] = item

    old.render(true).replaceWith(item.render(true))

    old.destroy()
}

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
            let main = this

            item.use({
                // a row can name its own More page (the services and games rows); the rest open their list
                onMore: ()=>data.morePage ? Router.call(data.morePage.name, {...data.morePage.params}) : Router.call('category_full', data),
                onInstance: function(card, data){
                    card.use({
                        // a row tile can open its own screen (streaming services open their catalogue)
                        // a game tile opens the game full-screen
                        onEnter: data.game ? Games.open.bind(Games, data.game) : data.chip ? swapServices.bind(null, main, data) : data.route ? Router.call.bind(Router, data.route.name, data.route.params) : Router.call.bind(Router, 'full', data),
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
import Api from '../../core/api/api'
import Controller from '../../core/controller'
import Subscribe from '../../utils/subscribe'

const MIN_LENGTH = 3 // the same threshold the results use, so suggestions and results start together
const DELAY      = 300 // ms after the last key before TMDB is asked
const LIMIT      = 6

/**
 * Typeahead under the search field: once the query reaches three characters,
 * the best matches from TMDB show as rows. Picking a row searches its title.
 */
export default function Suggest(){
    let html = $('<div class="search__suggest"></div>')
    let timer
    let query = ''
    let last

    this.listener = Subscribe()

    this.render = function(){
        return html
    }

    this.any = function(){
        return html.children().length > 0
    }

    this.update = function(value){
        clearTimeout(timer)

        value = value.trim()

        if(value.length < MIN_LENGTH){
            this.clear()
            return
        }

        timer = setTimeout(()=>{
            if(value == query) return

            query = value

            Api.sources.tmdb.search({query: encodeURIComponent(value)}, (items)=>{
                // a newer query has started since this one: its rows are stale
                if(value !== query) return

                this.show(items)
            })
        }, DELAY)
    }

    this.show = function(items){
        let list = []

        items.forEach(block=>{
            (block.results || []).forEach(card=>{
                if(list.length < LIMIT && block.type !== 'person') list.push({title: card.title || card.name, year: (card.release_date || card.first_air_date || '').slice(0,4)})
            })
        })

        html.empty()

        list.forEach(item=>{
            let row = $('<div class="search__suggest-item selector"><span class="search__suggest-title"></span><span class="search__suggest-year"></span></div>')

            row.find('.search__suggest-title').text(item.title)
            row.find('.search__suggest-year').text(item.year)

            row.on('hover:enter',()=>{
                this.listener.send('pick', {value: item.title})
            }).on('hover:focus',(e)=>{
                last = e.target
            })

            html.append(row)
        })
    }

    this.clear = function(){
        clearTimeout(timer)

        query = ''

        html.empty()
    }

    this.toggle = function(){
        Controller.add('search_suggest',{
            toggle: ()=>{
                Controller.collectionSet(html)
                Controller.collectionFocus(last || html.find('.selector')[0], html)
            },
            update: ()=>{},
            up: ()=>{
                this.listener.send('up')
            },
            down: ()=>{
                this.listener.send('down')
            },
            right: ()=>{
                Navigator.move('right')
            },
            left: ()=>{
                Navigator.move('left')
            },
            back: ()=>{
                this.listener.send('back')
            }
        })

        Controller.toggle('search_suggest')
    }

    this.destroy = function(){
        this.clear()

        this.listener.destroy()
    }
}

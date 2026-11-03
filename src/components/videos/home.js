import Client from '../../videos/client'
import {enabledCategories} from '../../videos/categories'
import Lang from '../../core/lang'
import {card} from './card'
import {hero} from './hero'

const SHELF_SIZE = 20

/**
 * Home: a hero with the top trending video, then one shelf of trending videos and one per enabled category.
 * Each shelf loads on its own, so one slow list does not hold up the page.
 * @param {jQuery} box - where the page content goes
 * @param {{region:string, isCurrent:()=>boolean, onPlay:(item:object)=>void, onDone:()=>void}} options
 */
export function home(box, {region, isCurrent, onPlay, onDone}){
    let top = $('<div class="videos-hero-slot"></div>')
    let rows = [{label: 'videos_row_trending', query: ''}].concat(enabledCategories().map(item=>({label: item.label, query: item.query})))
    let left = rows.length

    box.append(top)

    rows.forEach((row, index)=>{
        let shelf = $(`<section class="videos-shelf">
            <h2 class="videos-shelf__title"></h2>
            <div class="videos-shelf__items"></div>
            <div class="videos-shelf__status"></div>
        </section>`)

        shelf.find('.videos-shelf__title').text(Lang.translate(row.label))
        box.append(shelf)

        let status = shelf.find('.videos-shelf__status')
        let items = shelf.find('.videos-shelf__items')

        let load = row.query ? Client.search(row.query, region) : Client.trending(region)

        load.then(json=>{
            if(!isCurrent()) return

            if(index == 0 && json.items.length) top.empty().append(hero(json.items[0], onPlay))

            json.items.slice(0, SHELF_SIZE).forEach(item=> items.append(card(item, onPlay, true)))
            status.text(json.items.length ? '' : Lang.translate('videos_empty'))
        }).catch(()=>{
            if(isCurrent()) status.text(Lang.translate('videos_network_error'))
        }).then(()=>{
            left--

            if(left == 0 && isCurrent()) onDone()
        })
    })
}

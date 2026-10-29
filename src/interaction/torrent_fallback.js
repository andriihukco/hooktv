import Parser from '../core/api/sources/parser'
import Torrent from './torrent'
import Torserver from './torserver'
import Select from './select'
import Controller from '../core/controller'
import Platform from '../core/platform'
import Lang from '../core/lang'
import Utils from '../utils/utils'

/**
 * HOOK TV: when no online source can play a title, look for it among the
 * torrent indexers the viewer has set up (Jackett, Prowlarr or TorrServer
 * search) and play the pick through TorrServer. Without an indexer or a
 * torrent player the search ends at once with an empty list.
 */

const LIMIT = 20

function playable(){
    return Platform.is('android') || !!Torserver.url()
}

/**
 * Indexers match the original title best, so it goes first, with the year
 * to keep remakes apart
 */
function query(movie){
    let title = movie.original_title || movie.original_name || movie.title || movie.name || ''
    let date  = movie.release_date || movie.first_air_date || ''
    let year  = date.slice(0, 4)

    return year ? title + ' ' + year : title
}

/**
 * Results that can be played, best seeded first
 * @param {object} movie TMDB card
 * @param {function} call receives the list, empty when nothing was found
 */
function search(movie, call){
    if(!movie || !movie.id || !playable()) return call([])

    Parser.get({
        search: query(movie),
        from_search: true,
        public_indexer: true
    }, (json)=>{
        let items = (json.Results || []).filter(item=>item.MagnetUri || item.Link)

        items.sort((a, b)=>(b.Seeders || 0) - (a.Seeders || 0))

        call(items.slice(0, LIMIT))
    }, ()=>call([]))
}

/**
 * @param {array} items results from search
 * @param {object} movie TMDB card
 * @param {string} [back] controller to return to
 */
function show(items, movie, back = 'content'){
    Select.show({
        title: Lang.translate('hooktv_torrent_fallback_title'),
        items: items.map(item=>({
            title: Utils.shortText(item.Title || '', 110),
            subtitle: [item.Tracker, item.size || (item.Size ? Utils.bytesToSize(item.Size) : ''), 'S: ' + (item.Seeders || 0)].filter(Boolean).join(' · '),
            item
        })),
        onSelect: (a)=>{
            Torrent.back(()=>Controller.toggle(back))

            Torrent.start({
                title: a.item.Title,
                MagnetUri: a.item.MagnetUri,
                Link: a.item.Link,
                poster: movie.img
            }, movie)
        },
        onBack: ()=>{
            Controller.toggle(back)
        }
    })
}

export default {
    search,
    show,
    query
}

import Parser from '../core/api/sources/parser'
import Torrent from './torrent'
import Torserver from './torserver'
import Select from './select'
import Controller from '../core/controller'
import Platform from '../core/platform'
import Lang from '../core/lang'
import Utils from '../utils/utils'
import Storage from '../core/storage/storage'
import VideoQuality from '../utils/video_quality'

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

function resultQuality(item){
    return VideoQuality.resolution([
        item.quality,
        item.Quality,
        item.Resolution,
        item.Title,
        item.title,
        item.Name
    ].filter(Boolean).join(' '))
}

function ordered(items, quality){
    let preferred = VideoQuality.target(quality || Storage.field('video_quality_default'))

    return items.map((item, index)=>({item, index})).sort((a, b)=>{
        let order = VideoQuality.rank(resultQuality(a.item), preferred) - VideoQuality.rank(resultQuality(b.item), preferred)

        if(order) return order

        return (b.item.Seeders || 0) - (a.item.Seeders || 0) || a.index - b.index
    }).map(entry=>entry.item)
}

function preferred(items, quality){
    let wanted = VideoQuality.target(quality || Storage.field('video_quality_default'))

    return ordered(items, wanted).find(item=>resultQuality(item) === wanted) || null
}

function best(items, quality){
    return ordered(items, quality)[0] || null
}

/**
 * Results that can be played, best seeded first
 * @param {object} movie TMDB card
 * @param {function} call receives the list, empty when nothing was found
 * @param {number|string} quality preferred resolution from player settings
 */
function search(movie, call, quality){
    if(!movie || !movie.id || !playable()) return call([])

    Parser.get({
        search: query(movie),
        from_search: true,
        public_indexer: true
    }, (json)=>{
        let items = ordered((json.Results || []).filter(item=>item.MagnetUri || item.Link), quality)

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
            play(a.item, movie, back)
        },
        onBack: ()=>{
            Controller.toggle(back)
        }
    })
}

function play(item, movie, back = 'content'){
    Torrent.back(()=>Controller.toggle(back))
    Torrent.start({
        title: item.Title,
        MagnetUri: item.MagnetUri,
        Link: item.Link,
        poster: movie.img
    }, movie)
}

export default {
    search,
    show,
    query,
    ordered,
    preferred,
    best,
    play
}

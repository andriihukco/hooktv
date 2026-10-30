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
 * Lower-case, accents and punctuation removed, so "Amélie: Co." matches "amelie co"
 * @param {string} text
 * @returns {string}
 */
function normal(text){
    return (text + '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/**
 * Ranks results against the TMDB card: the title must appear in the release
 * name, the year must agree (a 1-year slack covers release lag), Ukrainian
 * audio ranks higher, and seeders break ties. Titles do not carry a country,
 * so country is not a signal here.
 * @param {array} items results from the indexer
 * @param {object} movie TMDB card
 * @returns {array}
 */
function rank(items, movie){
    let titles = [movie.original_title || movie.original_name, movie.title || movie.name].map(normal).filter(Boolean)
    let year = parseInt(((movie.release_date || movie.first_air_date || '').slice(0, 4)), 10)

    return items.map(item=>{
        let name = ' ' + normal(item.Title || '') + ' '
        let found = titles.some(title=>name.includes(' ' + title + ' '))
        let released = parseInt((item.Title || '').match(/\b(19|20)\d{2}\b/)?.[0], 10)
        let audio = (item.Title || '').split('|')[0]
        let ukrainian = /\b(ukr|ua)\b|укр/i.test(audio)

        if(released && year && Math.abs(released - year) > 1) return null

        let score = (found ? 4 : 0) + (released && year ? 2 : 0) + (ukrainian ? 1 : 0)

        return {item, score}
    }).filter(Boolean).sort((a, b)=>(b.score - a.score) || ((b.item.Seeders || 0) - (a.item.Seeders || 0))).map(entry=>entry.item)
}

/**
 * Results that can be played, best match first, then best seeded
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

        call(rank(items, movie).slice(0, LIMIT))
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
    query,
    rank
}

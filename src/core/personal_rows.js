import Favorite from './favorite'
import TMDB from './api/sources/tmdb'
import Api from './api/api'
import ContentRows from './content_rows'
import Lang from './lang'
import Tastes from './tastes'
import R from './tastes_rules'

/**
 * HOOK TV: home rows built from what the person liked and watched. Gems only: titles
 * with enough votes, and nothing already watched or liked shows again.
 */

const MIN_VOTES = 300

function isTV(card){
    return !!(card.number_of_seasons || card.first_air_date || (card.name && !card.title))
}

function media(card){
    return isTV(card) ? 'tv' : 'movie'
}

function taken(){
    return Favorite.get({type:'history'}).concat(Favorite.get({type:'like'}))
}

function gems(results, seen){
    return Tastes.apply((results || []).filter(card=>(card.vote_count || 0) >= MIN_VOTES && !seen.find(s=>s.id == card.id)))
}

// the profile's params join the discover query, except the keys this row already sets
function profileQuery(media){
    return R.queryString(Tastes.discoverParams(media), ['with_genres', 'vote_average.gte'])
}

function init(){
    // the genre that keeps coming back in what was liked and watched
    ContentRows.add({
        name: 'personal_genre',
        title: Lang.translate('personal_liked'),
        index: 1,
        screen: ['main'],
        call: ()=>{
            let seen  = taken()
            let type  = seen.filter(isTV).length * 2 > seen.length ? 'tv' : 'movie'
            let cards = seen.filter(card=>media(card) == type)
            let count = {}
            let names = {}

            cards.forEach(card=>(card.genres || []).forEach(g=>{
                count[g.id] = (count[g.id] || 0) + 1
                names[g.id] = g.name
            }))

            let top = Object.keys(count).sort((a, b)=>count[b] - count[a])[0]

            if(!top) return

            return (call)=>{
                TMDB.get('discover/' + type + '?with_genres=' + top + '&vote_count.gte=' + MIN_VOTES + '&vote_average.gte=7&sort_by=vote_average.desc' + profileQuery(type), {}, (json)=>{
                    call({
                        results: gems(json.results, seen),
                        title: Lang.translate('personal_liked') + ' ' + names[top]
                    })
                }, ()=>call())
            }
        }
    })

    // more like the title watched last
    ContentRows.add({
        name: 'personal_watched',
        title: Lang.translate('personal_watched'),
        index: 2,
        screen: ['main'],
        call: ()=>{
            let last = Favorite.get({type:'history'})[0]

            if(!last) return

            let seen = taken()

            return (call)=>{
                TMDB.get(media(last) + '/' + last.id + '/recommendations', {}, (json)=>{
                    call({
                        results: gems(json.results, seen),
                        title: Lang.translate('personal_watched') + ' ' + (last.title || last.name)
                    })
                }, ()=>call())
            }
        }
    })

    // more of the lead actor from the title liked last
    ContentRows.add({
        name: 'personal_actor',
        title: Lang.translate('personal_liked'),
        index: 3,
        screen: ['main'],
        call: ()=>{
            let last = Favorite.get({type:'like'})[0]

            if(!last) return

            let seen = taken()
            let type = media(last)

            return (call)=>{
                TMDB.get(type + '/' + last.id + '/credits', {}, (credits)=>{
                    let actor = (credits.cast || [])[0]

                    if(!actor) return call()

                    Api.person({only_credits: type, id: actor.id}, (result)=>{
                        let items = gems(result.credits && result.credits[type], seen)

                        call({
                            results: items.length > 5 ? items.slice(0, 20) : [],
                            title: Lang.translate('personal_liked') + ' ' + actor.name
                        })
                    }, ()=>call())
                }, ()=>call())
            }
        }
    })
}

export default {
    init
}

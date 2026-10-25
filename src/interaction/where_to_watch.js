import Select from './select'
import Controller from '../core/controller'
import Lang from '../core/lang'
import Platform from '../core/platform'
import Android from '../core/android'

/**
 * HOOK TV: when no source can play a title, say where it can be watched
 * legally instead of leaving the viewer on an empty source list.
 * TMDB (JustWatch data) knows the international services for Ukraine;
 * the Ukrainian ones it does not list are offered as a search.
 */

let region = 'UA'

// TMDB provider id → search page, so the viewer lands on the title, not a home page
let searches = {
    8:    (q)=>'https://www.netflix.com/search?q=' + q,
    2:    (q)=>'https://tv.apple.com/ua/search?term=' + q,
    350:  (q)=>'https://tv.apple.com/ua/search?term=' + q,
    11:   (q)=>'https://mubi.com/uk/search/films?query=' + q,
    283:  (q)=>'https://www.crunchyroll.com/search?q=' + q,
    538:  (q)=>'https://watch.plex.tv/search?q=' + q
}

let local = [
    {name: 'Megogo', url: (q)=>'https://megogo.net/ua/search-extended?q=' + q},
    {name: 'Sweet.tv', url: (q)=>'https://sweet.tv/search?q=' + q},
    // Takflix only carries Ukrainian cinema
    {name: 'Takflix', url: (q)=>'https://takflix.com/uk/search?query=' + q, only: 'uk'}
]

function open(url){
    if(Platform.is('android')) Android.openBrowser(url)
    else window.open(url, '_blank')
}

function providers(movie, call){
    let tmdb = window.Lampa && window.Lampa.Api && window.Lampa.Api.sources && window.Lampa.Api.sources.tmdb

    if(!tmdb || !movie.id) return call(null)

    tmdb.get((movie.name ? 'tv/' : 'movie/') + movie.id + '/watch/providers', {}, (json)=>{
        call(json && json.results && json.results[region] || null)
    }, ()=>call(null))
}

/**
 * Subscription first, then free, then rent and buy; a service is listed once
 * @param {object} found TMDB watch/providers entry for the region
 */
function available(found){
    let kinds = [['flatrate', 'hooktv_where_subscription'], ['free', 'hooktv_where_free'], ['ads', 'hooktv_where_free'], ['rent', 'hooktv_where_rent'], ['buy', 'hooktv_where_buy']]
    let seen  = {}
    let list  = []

    kinds.forEach(([kind, label])=>{
        (found[kind] || []).forEach(p=>{
            let name = p.provider_name.replace(/ Store$/, '')

            if(seen[name]) return

            seen[name] = true

            list.push({id: p.provider_id, name, label})
        })
    })

    return list
}

/**
 * @param {object} movie TMDB card
 * @param {function} sources opens the manual source list
 * @param {string} [back] controller to return to
 */
function show(movie, sources, back = 'content'){
    let title = movie.title || movie.name || ''
    let query = encodeURIComponent(title)

    providers(movie, (found)=>{
        let items = []

        if(found){
            let list = available(found)

            if(list.length) items.push({title: Lang.translate('hooktv_where_available'), separator: true})

            list.forEach(p=>{
                items.push({
                    title: p.name,
                    subtitle: Lang.translate(p.label),
                    url: searches[p.id] ? searches[p.id](query) : found.link
                })
            })
        }

        items.push({title: Lang.translate('hooktv_where_search'), separator: true})

        local.filter(s=>!s.only || s.only == (movie.original_language || '')).forEach(s=>{
            items.push({title: s.name, subtitle: Lang.translate('hooktv_where_search_on'), url: s.url(query)})
        })

        items.push({title: Lang.translate('hooktv_where_sources'), subtitle: Lang.translate('hooktv_where_sources_descr'), sources: true})

        Select.show({
            title: Lang.translate('hooktv_where_title'),
            items,
            onSelect: (a)=>{
                Controller.toggle(back)

                if(a.sources) sources(movie)
                else if(a.url) open(a.url)
            },
            onBack: ()=>{
                Controller.toggle(back)
            }
        })
    })
}

export default {
    show,
    available
}

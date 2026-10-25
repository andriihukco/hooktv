import Select from './select'
import Controller from '../core/controller'
import Lang from '../core/lang'
import Platform from '../core/platform'
import Android from '../core/android'

/**
 * HOOK TV: when no source can play a title, say where it can be watched
 * legally instead of leaving the viewer on an empty source list.
 * TMDB (JustWatch data) knows which services carry it in Ukraine; the rest
 * are offered as a search. Ukrainian services search by the title on the
 * card, international ones by the English title.
 */

let region = 'UA'

/**
 * Services with a search page, so the viewer lands on the title, not a home page.
 * ids are TMDB provider ids, to match what watch/providers returns.
 * note: the service is not sold in Ukraine
 */
let services = [
    {name: 'Megogo',      local: true, url: (q)=>'https://megogo.net/ua/search-extended?q=' + q},
    {name: 'Sweet.tv',    local: true, url: (q)=>'https://sweet.tv/search?q=' + q},
    // Takflix only carries Ukrainian cinema
    {name: 'Takflix',     local: true, only: 'uk', url: (q)=>'https://takflix.com/uk/search?query=' + q},
    {name: 'Netflix',     ids: [8, 1796], url: (q)=>'https://www.netflix.com/search?q=' + q},
    {name: 'Apple TV',    ids: [2, 350], url: (q)=>'https://tv.apple.com/ua/search?term=' + q},
    {name: 'Prime Video', ids: [9, 119], url: (q)=>'https://www.primevideo.com/search?phrase=' + q},
    {name: 'HBO Max',     ids: [1899, 384], url: (q)=>'https://play.hbomax.com/search?q=' + q},
    {name: 'Disney+',     ids: [337], note: 'hooktv_where_not_ua', url: (q)=>'https://www.disneyplus.com/search?q=' + q},
    {name: 'Hulu',        ids: [15], note: 'hooktv_where_us_only', url: (q)=>'https://www.hulu.com/search?q=' + q},
    {name: 'MUBI',        ids: [11], hidden: true, url: (q)=>'https://mubi.com/uk/search/films?query=' + q},
    {name: 'Crunchyroll', ids: [283], hidden: true, url: (q)=>'https://www.crunchyroll.com/search?q=' + q},
    {name: 'Plex',        ids: [538], hidden: true, url: (q)=>'https://watch.plex.tv/search?q=' + q}
]

function open(url){
    if(Platform.is('android')) Android.openBrowser(url)
    else window.open(url, '_blank')
}

function tmdb(){
    return window.Lampa && window.Lampa.Api && window.Lampa.Api.sources && window.Lampa.Api.sources.tmdb
}

function method(movie, path){
    return (movie.name ? 'tv/' : 'movie/') + movie.id + '/' + path
}

function providers(movie, call){
    let api = tmdb()

    if(!api || !movie.id) return call(null)

    api.get(method(movie, 'watch/providers'), {}, (json)=>{
        call(json && json.results && json.results[region] || null)
    }, ()=>call(null))
}

/**
 * Title the international services know the film by
 */
function english(movie, call){
    let original = movie.original_title || movie.original_name || movie.title || movie.name || ''
    let api      = tmdb()

    if(movie.original_language == 'en' || !api || !movie.id) return call(original)

    api.get(method(movie, 'translations'), {}, (json)=>{
        let en = (json && json.translations || []).find(t=>t.iso_639_1 == 'en' && t.data && (t.data.title || t.data.name))

        call(en ? en.data.title || en.data.name : original)
    }, ()=>call(original))
}

function service(id){
    return services.find(s=>s.ids && s.ids.indexOf(id) >= 0)
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
            let known = service(p.provider_id)
            let name  = known ? known.name : p.provider_name.replace(/ Store$/, '')

            if(seen[name]) return

            seen[name] = true

            list.push({id: p.provider_id, name, label})
        })
    })

    return list
}

/**
 * Rows of the sheet: where it streams, then where to look for it
 * @param {object} movie TMDB card
 * @param {object|null} found TMDB watch/providers entry for the region
 * @param {string} title English title
 */
function rows(movie, found, title){
    let local = encodeURIComponent(movie.title || movie.name || title)
    let world = encodeURIComponent(title)
    let items = []
    let shown = {}

    let list = found ? available(found) : []

    if(list.length) items.push({title: Lang.translate('hooktv_where_available'), separator: true})

    list.forEach(p=>{
        let known = service(p.id)

        shown[p.name] = true

        items.push({
            title: p.name,
            subtitle: Lang.translate(p.label),
            url: known ? known.url(world) : found.link
        })
    })

    items.push({title: Lang.translate('hooktv_where_search'), separator: true})

    services.filter(s=>!s.hidden && !shown[s.name] && (!s.only || s.only == (movie.original_language || ''))).forEach(s=>{
        items.push({
            title: s.name,
            subtitle: Lang.translate(s.note || 'hooktv_where_search_on'),
            url: s.url(s.local ? local : world)
        })
    })

    return items
}

/**
 * @param {object} movie TMDB card
 * @param {string} [back] controller to return to
 */
function show(movie, back = 'content'){
    providers(movie, (found)=>{
        english(movie, (title)=>{
            Select.show({
                title: Lang.translate('hooktv_where_title'),
                items: rows(movie, found, title),
                onSelect: (a)=>{
                    Controller.toggle(back)

                    if(a.url) open(a.url)
                },
                onBack: ()=>{
                    Controller.toggle(back)
                }
            })
        })
    })
}

export default {
    show,
    available,
    rows
}

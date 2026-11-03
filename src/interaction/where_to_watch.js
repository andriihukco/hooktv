import Select from './select'
import Controller from '../core/controller'
import Lang from '../core/lang'
import Platform from '../core/platform'
import Android from '../core/android'
import sourcesStore from '../services/online_sources_store'

/**
 * HOOK TV: when no source can play a title, the sheet lists where it streams
 * legally (TMDB / JustWatch data for Ukraine), then the HOOK TV online sources.
 * Switched-on sources come first; a switched-off one is listed after them.
 */

let region = 'UA'

/**
 * Services that stream titles, matched by TMDB provider id to what watch/providers returns.
 */
let services = [
    {name: 'Megogo'},
    {name: 'Sweet.tv'},
    {name: 'Takflix'},
    {name: 'Netflix',     ids: [8, 1796], url: (q)=>'https://www.netflix.com/search?q=' + q},
    {name: 'Apple TV',    ids: [2, 350], url: (q)=>'https://tv.apple.com/ua/search?term=' + q},
    {name: 'Prime Video', ids: [9, 119], url: (q)=>'https://www.primevideo.com/search?phrase=' + q},
    {name: 'HBO Max',     ids: [1899, 384], url: (q)=>'https://play.hbomax.com/search?q=' + q},
    {name: 'Disney+',     ids: [337], url: (q)=>'https://www.disneyplus.com/search?q=' + q},
    {name: 'Hulu',        ids: [15], url: (q)=>'https://www.hulu.com/search?q=' + q},
    {name: 'MUBI',        ids: [11], url: (q)=>'https://mubi.com/uk/search/films?query=' + q},
    {name: 'Crunchyroll', ids: [283], url: (q)=>'https://www.crunchyroll.com/search?q=' + q},
    {name: 'Plex',        ids: [538], url: (q)=>'https://watch.plex.tv/search?q=' + q}
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
 * Rows of the sheet: where it streams, then the HOOK TV online sources
 * @param {object} movie TMDB card
 * @param {object|null} found TMDB watch/providers entry for the region
 * @param {string} title English title
 */
function rows(movie, found, title){
    let world = encodeURIComponent(title)
    let items = []

    let list = found ? available(found) : []

    if(list.length) items.push({title: Lang.translate('hooktv_where_available'), separator: true})

    list.forEach(p=>{
        let known = service(p.id)

        items.push({
            title: p.name,
            subtitle: Lang.translate(p.label),
            url: known ? known.url(world) : found.link
        })
    })

    let sources = sourcesStore.ordered()

    if(sources.length) items.push({title: Lang.translate('hook_online_settings_sources'), separator: true})

    sources.forEach(s=>{
        items.push({
            title: s.quality ? s.title + ' · ' + s.quality : s.title,
            subtitle: Lang.translate(s.active ? 'hook_online_sources_enabled' : 'hook_online_sources_disabled'),
            source: s.key
        })
    })

    return items
}

/**
 * @param {object} movie TMDB card
 * @param {string} [back] controller to return to
 * @param {function(string)} [onSource] called with a source key when the viewer picks one
 */
function show(movie, back = 'content', onSource = ()=>{}){
    providers(movie, (found)=>{
        english(movie, (title)=>{
            Select.show({
                title: Lang.translate('hook_online_settings_sources'),
                items: rows(movie, found, title),
                onSelect: (a)=>{
                    Controller.toggle(back)

                    if(a.source) onSource(a.source)
                    else if(a.url) open(a.url)
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

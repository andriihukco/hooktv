import Controller from '../core/controller'
import Storage from '../core/storage/storage'
import Manifest from '../core/manifest'
import Lang from '../core/lang'
import Activity from './activity/activity'
import LoadingProgress from './loading_progress'
import WhereToWatch from './where_to_watch'
import TorrentFallback from './torrent_fallback'
import Player from './player'
import Noty from './noty'
import Dub from '../utils/dub'

// services/online registers itself here on init; importing it directly would
// pull it into the full-card import cycle before Storage is ready
let Online = null

function register(service){
    Online = service
}

/**
 * HOOK TV Watch: the audio comes from Player settings (the app language by
 * default), so the title plays at once with no sheet and no preselected choice.
 * The source list only opens when nothing could start.
 * @param {object} movie TMDB card
 * @param {string} [back] controller to return to, 'content' by default
 */
function start(movie, back = 'content'){
    let want = Storage.get('hooktv_dub', Dub.defaultAudio(Storage.get('language', 'en')))

    Controller.toggle(back)

    play(movie, want, back)
}

function play(movie, want, back = 'content'){
    LoadingProgress.watch()

    let quality = Storage.field('video_quality_default')

    TorrentFallback.search(movie, (items)=>{
        let match = TorrentFallback.preferred(items, quality)

        if(match){
            LoadingProgress.destroy()
            TorrentFallback.play(match, movie, back)
            return
        }

        Online.autoPlay(movie, want, (ok, key)=>{
            if(ok){
                LoadingProgress.zoom()

                return offerBalancers(movie, want, key)
            }

            if(openOnlinePlugin(movie, want, items, quality, back)) LoadingProgress.destroy()
            else finishFallback(movie, items, quality, back)
        })
    }, quality)
}

function finishFallback(movie, items, quality, back){
    LoadingProgress.destroy()

    let fallback = TorrentFallback.best(items, quality)

    if(fallback) TorrentFallback.play(fallback, movie, back)
    else WhereToWatch.show(movie, back)
}

function openOnlinePlugin(movie, want, items, quality, back){
    let plugin = Manifest.plugins.find(item=>item.hooktv_watch_adapter == 'online_prestige' && typeof item.onContextLauch == 'function')

    if(!plugin) return false

    let finished = false

    plugin.onContextLauch(Object.assign({}, movie, {
        hooktv_auto_watch: true,
        hooktv_auto_watch_quality: quality,
        hooktv_auto_watch_audio: want,
        hooktv_auto_watch_on_start: ()=>{
            finished = true
            LoadingProgress.destroy()
        },
        hooktv_auto_watch_on_fail: ()=>{
            if(finished) return

            finished = true
            Activity.backward()
            finishFallback(movie, items, quality, back)
        }
    }))

    return true
}

/**
 * Player menu: every other balancer that can play this title. Picking one
 * plays the title through that balancer alone.
 */
function offerBalancers(movie, want, current){
    Online.balancers(movie, (list)=>{
        Player.balancers(list.map(item=>({title: item.title, key: item.key, selected: item.key == current})), (key)=>{
            Online.autoPlay(movie, want, (ok, next)=>{
                if(ok) return offerBalancers(movie, want, next)

                Noty.show(Lang.translate('online_nolink'))
            }, [key])
        })
    })
}

export default {
    start,
    register
}

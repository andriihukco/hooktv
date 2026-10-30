import Controller from '../core/controller'
import Storage from '../core/storage/storage'
import Lang from '../core/lang'
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

    Online.autoPlay(movie, want, (ok, key)=>{
        if(ok){
            LoadingProgress.zoom()

            return offerBalancers(movie, want, key)
        }

        // No online source: the viewer's torrent indexers come next, the
        // legal "where to watch" sheet only when they have nothing either
        TorrentFallback.search(movie, (items)=>{
            LoadingProgress.destroy()

            if(items.length) TorrentFallback.show(items, movie, back)
            else WhereToWatch.show(movie, back)
        })
    })
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

import Select from './select'
import Controller from '../core/controller'
import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import LoadingProgress from './loading_progress'
import WhereToWatch from './where_to_watch'
import Player from './player'
import Noty from './noty'

// services/online registers itself here on init; importing it directly would
// pull it into the full-card import cycle before Storage is ready
let Online = null

function register(service){
    Online = service
}

/**
 * HOOK TV Watch: one question, "Українська or Оригінал", then the best source
 * plays at once. The source list only opens when nothing could start.
 * @param {object} movie TMDB card
 * @param {string} [back] controller to return to, 'content' by default
 */
function start(movie, back = 'content'){
    let last = Storage.get('hooktv_dub', 'uk')

    Select.show({
        title: Lang.translate('hooktv_watch_in'),
        items: [
            {title: 'Українська', subtitle: Lang.translate('hooktv_dub_uk_descr'), lang: 'uk', selected: last == 'uk'},
            {title: Lang.translate('hooktv_dub_original'), subtitle: Lang.translate('hooktv_dub_original_descr'), lang: 'original', selected: last == 'original'}
        ],
        onSelect: (a)=>{
            Controller.toggle(back)

            Storage.set('hooktv_dub', a.lang)

            play(movie, a.lang, back)
        },
        onBack: ()=>{
            Controller.toggle(back)
        }
    })
}

function play(movie, want, back = 'content'){
    LoadingProgress.watch()

    Online.autoPlay(movie, want, (ok, key)=>{
        if(ok){
            LoadingProgress.zoom()

            return offerBalancers(movie, want, key)
        }

        LoadingProgress.destroy()

        WhereToWatch.show(movie, back)
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

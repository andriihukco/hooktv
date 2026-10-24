import Select from './select'
import Controller from '../core/controller'
import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import LoadingProgress from './loading_progress'
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

            play(movie, a.lang)
        },
        onBack: ()=>{
            Controller.toggle(back)
        }
    })
}

function play(movie, want){
    LoadingProgress.watch()

    Online.autoPlay(movie, want, (ok)=>{
        if(ok) return LoadingProgress.zoom()

        LoadingProgress.destroy()

        Noty.show(Lang.translate('hooktv_not_found'))

        Online.openList(movie)
    })
}

export default {
    start,
    register
}

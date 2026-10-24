import Utils from '../../../utils/utils'
import Storage from '../../../core/storage/storage'
import Player from '../../../interaction/player'
import Android from '../../../core/android'
import Platform from '../../../core/platform'
import Lang from '../../../core/lang'

/**
 * Trailers of the card in the UI language first, then English, newest first.
 * Shown as a row under the description (see full/trailers.js).
 */
function items(data){
    let videos = data.videos

    if(data.movie.adult || !videos || !videos.results || !videos.results.length || window.lampa_settings.disable_features.trailers) return []

    let list = videos.results.map(element=>({
        title: Utils.shortText(element.name, 50),
        subtitle: (element.official ? Lang.translate('full_trailer_official') : Lang.translate('full_trailer_no_official')) + ' - ' + Utils.parseTime(element.published_at).full,
        id: element.key,
        player: element.player,
        code: element.iso_639_1,
        time: new Date(element.published_at).getTime(),
        url: element.url || 'https://www.youtube.com/watch?v=' + element.key,
        youtube: typeof element.youtube !== 'undefined' ? element.youtube : true,
        img: element.icon || 'https://img.youtube.com/vi/' + element.key + '/hqdefault.jpg'
    }))

    list.sort((a,b)=>b.time - a.time)

    let my_lang = list.filter(n=>n.code == Storage.field('tmdb_lang'))
    let en_lang = list.filter(n=>n.code == 'en' && my_lang.indexOf(n) == -1)

    return my_lang.concat(en_lang)
}

function play(item, list){
    if(Platform.is('android') && Storage.field('player_launch_trailers') == 'youtube' && item.youtube){
        Android.openYoutube(item.id)
    }
    else{
        Player.play(item)
        Player.playlist(list)
    }
}

export default {
    items,
    play
}

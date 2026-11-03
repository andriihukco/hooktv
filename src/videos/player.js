import Lang from '../core/lang'
import Noty from '../interaction/noty'
import YouTube from '../interaction/youtube'

let loading = null

/**
 * Load the YouTube IFrame API once; playback needs it
 * @returns {Promise<void>}
 */
function ready(){
    if(window.YT && window.YT.Player) return Promise.resolve()
    if(loading) return loading

    loading = new Promise((resolve, reject)=>{
        let previous = window.onYouTubeIframeAPIReady

        window.onYouTubeIframeAPIReady = ()=>{
            if(previous) previous()
            resolve()
        }

        $.getScript('https://www.youtube.com/iframe_api').fail(()=>{
            loading = null
            reject(new Error('iframe api'))
        })
    })

    return loading
}

/**
 * Play a video in the full-screen YouTube player
 * @param {string} id - YouTube video id
 */
export function play(id){
    ready().then(()=>YouTube.play(id)).catch(()=>{
        Noty.show(Lang.translate('videos_player_error'))
    })
}

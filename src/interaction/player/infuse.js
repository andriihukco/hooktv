// Builds the Infuse x-callback URL for playing a stream list in the Infuse app.
import Utils from '../../utils/utils'

export function buildInfuseMultiUrl(data, callbacks){
    callbacks = callbacks || {}

    let items = (Array.isArray(data.playlist) ? data.playlist : [])
        .filter(p => typeof p.url == 'string')

    if(items.length <= 1) return null

    let currentUrl = data.url.replace('&preload','&play')
    let currentIndex = -1

    for(let i = 0; i < items.length; i++){
        if(items[i].url.replace('&preload','&play') === currentUrl){
            currentIndex = i
            break
        }
    }

    if(currentIndex < 0) currentIndex = 0

    let urlParts = []

    for(let i = currentIndex; i < items.length; i++){
        let item = items[i]
        let itemUrl = encodeURIComponent(item.url.replace('&preload','&play'))
        urlParts.push('url=' + itemUrl)

        if(item.title){
            let filename = Utils.clearHtmlTags(item.title).trim()
            if(filename){
                urlParts.push('filename=' + encodeURIComponent(filename))
            }
        }
    }

    if(callbacks.x_success){
        urlParts.push('x-success=' + encodeURIComponent(callbacks.x_success))
    }

    if(callbacks.x_error){
        urlParts.push('x-error=' + encodeURIComponent(callbacks.x_error))
    }

    return 'infuse://x-callback-url/play?' + urlParts.join('&')
}

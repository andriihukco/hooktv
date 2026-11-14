import VideoQuality from '../../src/utils/video_quality'

function best(items, quality){
    return items.map((item, index)=>({
        item,
        index,
        rank: rank(item, quality)
    })).sort((a, b)=>a.rank - b.rank || a.index - b.index)[0]
}

function rank(item, quality){
    let additional = Array.isArray(item.qualitys) ? item.qualitys.join(' ') : item.qualitys

    return VideoQuality.rank(item.quality || additional, quality)
}

function next(keys, attempted){
    return keys.find(key=>attempted.indexOf(key) < 0) || null
}

function watchPlayer(player, timeout, onStart, onFail){
    let settled = false
    let timer

    let dispose = ()=>{
        clearTimeout(timer)
        player.listener.remove('canplay', onCanPlay)
        player.listener.remove('error', onError)
    }

    let finish = (callback, event)=>{
        if(settled) return

        settled = true
        dispose()
        callback(event)
    }

    let onCanPlay = (event)=>finish(onStart, event)
    let onError = (event)=>{
        if(event && event.fatal === false) return

        finish(onFail, event)
    }

    player.listener.follow('canplay', onCanPlay)
    player.listener.follow('error', onError)
    timer = setTimeout(()=>finish(onFail, {timeout: true}), timeout)

    return dispose
}

export default {
    best,
    rank,
    next,
    watchPlayer
}

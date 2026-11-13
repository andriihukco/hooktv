import Lang from '../../core/lang'
import {views} from '../../videos/format'

/**
 * One video tile: thumbnail, length, title, channel and views
 * @param {{id:string,title:string,channel:string,thumb:string,duration:string,views:number}} item
 * @param {(item:object)=>void} onPlay
 * @param {boolean} [wide] - the larger tile used in horizontal shelves
 * @returns {jQuery}
 */
export function card(item, onPlay, wide){
    let box = $(`<div class="videos-card selector${wide ? ' videos-card--wide' : ''}">
        <div class="videos-card__thumb"><span class="videos-card__time"></span></div>
        <div class="videos-card__title"></div>
        <div class="videos-card__meta"></div>
    </div>`)

    box.find('.videos-card__title').text(item.title)
    box.find('.videos-card__time').text(item.duration || '')
    box.find('.videos-card__time').toggleClass('hide', !item.duration)
    box.find('.videos-card__meta').text([item.channel, item.views ? Lang.translate('videos_views').replace('{count}', views(item.views)) : ''].filter(Boolean).join(' · '))

    if(item.thumb){
        let image = $('<img alt="" loading="lazy" decoding="async">').attr('src', item.thumb)

        image.on('error', ()=>image.remove())
        box.find('.videos-card__thumb').prepend(image)
    }

    box.on('hover:enter click', ()=>onPlay(item))

    return box
}

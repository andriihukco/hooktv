import Lang from '../../core/lang'
import {views} from '../../videos/format'

/**
 * Big banner for the featured video: artwork, title, channel and a Play button
 * @param {{id:string,title:string,channel:string,thumb:string,duration:string,views:number}} item
 * @param {(item:object)=>void} onPlay
 * @returns {jQuery}
 */
export function hero(item, onPlay){
    let box = $(`<div class="videos-hero">
        <div class="videos-hero__body">
            <div class="videos-hero__title"></div>
            <div class="videos-hero__meta"></div>
            <button class="videos-hero__play selector" type="button"></button>
        </div>
    </div>`)

    box.find('.videos-hero__title').text(item.title)
    box.find('.videos-hero__meta').text([item.channel, item.views ? Lang.translate('videos_views').replace('{count}', views(item.views)) : ''].filter(Boolean).join(' · '))
    box.find('.videos-hero__play').text(Lang.translate('videos_hero_play')).on('hover:enter click', ()=> onPlay(item))

    if(item.thumb) box.css('background-image', `url("${item.thumb}")`)

    return box
}

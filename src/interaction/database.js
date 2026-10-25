import Settings from './settings/api'
import Lang from '../core/lang'
import Storage from '../core/storage/storage'
import Utils from '../utils/utils'
import Controller from '../core/controller'
import Select from './select'
import Cache from '../utils/cache'
import Favorite from '../core/favorite'
import Noty from './noty'
import Usage from '../utils/storage_usage'

let component = 'data'
let icon = `<svg width="37" height="38" viewBox="0 0 37 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.60156 1.565H25.6104L33.7051 10.4361C34.2934 11.0809 34.6191 11.9226 34.6191 12.7955V32.1959C34.6191 34.1289 33.0521 35.6959 31.1191 35.6959H5.60156C3.66857 35.6959 2.10156 34.1289 2.10156 32.1959V5.065C2.10156 3.13201 3.66856 1.565 5.60156 1.565Z" stroke="white" stroke-width="3"/>
    <rect x="10.7227" y="24.4752" width="15.2754" height="11.2209" rx="1.5" stroke="white" stroke-width="3"/>
</svg>`

// one colour per kind of data, in the bar and its legend
let KINDS = {
    history:  {color: '#C8F542', name: 'hooktv_storage_history', descr: 'hooktv_storage_history_descr'},
    cache:    {color: '#FF9F0A', name: 'hooktv_storage_cache', descr: 'hooktv_storage_cache_descr'},
    settings: {color: '#0A84FF', name: 'hooktv_storage_settings', descr: 'hooktv_storage_settings_descr'},
    search:   {color: '#BF5AF2', name: 'hooktv_storage_search', descr: 'hooktv_storage_search_descr'}
}

let view

function size(bytes){
    return Utils.bytesToSize(bytes || 0)
}

/**
 * The bar, the total and a legend that says what each part is
 */
function draw(){
    if(!view) return

    view.addClass('storage-view--loading')

    Usage.measure((sizes)=>{
        if(!view) return

        let parts = Usage.parts(sizes)
        let used  = parts.reduce((sum, p)=>sum + p.bytes, 0)
        let bar   = view.find('.storage-view__bar').empty()
        let list  = view.find('.storage-view__legend').empty()

        view.find('.storage-view__total').text(Lang.translate('hooktv_storage_used').replace('{size}', size(used)))
        view.find('.storage-view__free').text(sizes.quota ? Lang.translate('hooktv_storage_free').replace('{size}', size(Math.max(0, sizes.quota - used))) : '')

        parts.forEach(p=>{
            let kind = KINDS[p.key]

            // tiny parts stay visible as a sliver
            $('<div class="storage-view__part"></div>').css({background: kind.color, flexGrow: Math.max(p.share, 0.015)}).appendTo(bar)

            let row = $(`<div class="storage-view__item">
                <div class="storage-view__dot"></div>
                <div class="storage-view__text">
                    <div class="storage-view__name"></div>
                    <div class="storage-view__descr"></div>
                </div>
                <div class="storage-view__size"></div>
            </div>`)

            row.find('.storage-view__dot').css('background', kind.color)
            row.find('.storage-view__name').text(Lang.translate(kind.name))
            row.find('.storage-view__descr').text(Lang.translate(kind.descr))
            row.find('.storage-view__size').text(size(p.bytes))

            list.append(row)
        })

        if(sizes.cache === null){
            list.append($('<div class="storage-view__note"></div>').text(Lang.translate('hooktv_storage_cache_unknown')))
        }

        // local storage has a hard limit; warn before settings or history stop saving
        let share = Math.round(sizes.local_share * 100)
        let note  = view.find('.storage-view__limit')

        note.text(Lang.translate('hooktv_storage_limit').replace('{percent}', share)).toggleClass('storage-view__limit--warn', share >= 80)

        view.removeClass('storage-view--loading')
    })
}

function init(){
    Settings.addComponent({
        component: component,
        icon,
        name: Lang.translate('hooktv_storage_title'),
        after: 'parental_control',
    })

    Settings.addParam({
        component,
        param: {
            type: 'static'
        },
        field: {
            name: ''
        },
        onRender: (item)=>{
            item.addClass('storage-view').empty().append(`
                <div class="storage-view__head">
                    <div class="storage-view__total"></div>
                    <div class="storage-view__free"></div>
                    <svg class="storage-view__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="storage-view__bar"></div>
                <div class="storage-view__details">
                    <div class="storage-view__legend"></div>
                    <div class="storage-view__limit"></div>
                </div>
            `)

            view = item

            // just the total and the bar; Enter (or a click) opens the breakdown and measures again
            item.on('hover:enter', ()=>{
                item.toggleClass('storage-view--open')

                draw()
            })

            draw()
        }
    })

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('settings_rest_cache'),
            description: Lang.translate('hooktv_storage_cache_clear_descr')
        },
        onChange: ()=>{
            let done = ()=>{
                Noty.show(Lang.translate('hooktv_storage_cache_cleared'))

                // the browser updates its size estimate a moment after the tables empty
                setTimeout(draw, 1200)
            }

            Cache.clearAll().then(done, done)
        }
    })

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('fav_clear_title'),
            description: Lang.translate('hooktv_storage_history_clear_descr')
        },
        onChange: ()=>{
            Favorite.clear('history')

            Noty.show(Lang.translate('hooktv_storage_history_cleared'))

            draw()
        }
    })

    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('hooktv_storage_reset'),
            description: Lang.translate('settings_rest_cache_all_descr')
        },
        onChange: ()=>{
            Select.show({
                title: Lang.translate('hooktv_storage_reset'),
                items: [
                    {title: Lang.translate('hooktv_storage_reset_confirm'), subtitle: Lang.translate('settings_rest_cache_all_descr'), reset: true},
                    {title: Lang.translate('cancel')}
                ],
                onSelect: (a)=>{
                    Controller.toggle('settings_component')

                    if(!a.reset) return

                    let reset = ()=>Storage.clear(true)

                    Cache.clearAll().then(reset, reset)
                },
                onBack: ()=>{
                    Controller.toggle('settings_component')
                }
            })
        }
    })

    // when something is stuck: a clean start without losing anything
    Settings.addParam({
        component,
        param: {
            type: 'button'
        },
        field: {
            name: Lang.translate('hooktv_reload'),
            description: Lang.translate('hooktv_reload_descr')
        },
        onChange: ()=>{
            window.location.reload()
        }
    })
}

export default {
    init
}

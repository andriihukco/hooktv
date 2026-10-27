import Template from '../template'
import Subscribe from '../../utils/subscribe'
import Controller from '../../core/controller'
import State from '../../utils/machine'
import Select from '../select'
import Storage from '../../core/storage/storage'
import Arrays from '../../utils/arrays'
import Platform from '../../core/platform'
import Lang from '../../core/lang'
import Utils from '../../utils/utils'
import DeviceInput from '../device_input'
import Modal from '../modal'
import Video from './video'
import Footer from './footer'
import Playlist from './playlist'
import Segments from './segments'

let html
let listener = Subscribe()
let state
let elems
let last
let panel_visible = false
let timeline_last = {
    position: 0,
    peding: 0
} 

let condition = {}
let timer     = {}
let tracks    = []
let subs      = []
let flows     = false
let qualitys  = false
let translates = {}
let balanser   = false
let last_settings_action
let last_panel_focus

function init(){
    html = Template.get('player_panel')

    elems = {
        peding: $('.player-panel__peding',html),
        position: $('.player-panel__position',html),
        time: $('.player-panel__time',html),
        timenow: $('.player-panel__timenow',html),
        timeend: $('.player-panel__timeend',html),
        title: $('.player-panel__filename',html),
        tracks: $('.player-panel__tracks',html),
        subs: $('.player-panel__subs',html),
        timeline: $('.player-panel__timeline',html),
        quality: $('.player-panel__quality',html),
        flow: $('.player-panel__flow',html),
        episode: $('.player-panel__next-episode-name',html),
        rewind_touch: $('.player-panel__time-touch-zone',html),
        playlist: html.find('.player-panel__playlist'),


        segments: $('.player-panel__timeline-segments',html),
    }

    /**
     * Отсеживаем состояние, 
     * когда надо показать панель, а когда нет
     */
    state = new State({
        state: 'start',
        transitions: {
            start: function(){
                clearTimeout(timer.hide)
                clearTimeout(timer.rewind)

                this.dispath('canplay')
            },
            canplay: function(){
                if(condition.canplay) this.dispath('visible')
                else visible(true)
            },
            visible: function(){
                if(condition.visible) visible(true)
                else this.dispath('rewind')
            },
            rewind: function(){
                clearTimeout(timer.rewind)

                if(condition.rewind){
                    visible(true)

                    timer.rewind = setTimeout(()=>{
                        condition.rewind = false

                        this.dispath('mousemove')
                    },1000)
                }
                else{
                    this.dispath('mousemove')
                }
            },
            mousemove: function(){
                if(condition.mousemove){
                    visible(true)
                }

                this.dispath('hide')
            },
            hide: function(){
                clearTimeout(timer.hide)

                timer.hide = setTimeout(()=>{
                    if(!Video.video().paused) visible(false)
                },3000)
            }
        }
    })

    Playlist.listener.follow('set',(e)=>{
        elems.playlist.toggleClass('hide', Boolean(e.playlist.length == 0))

        // episode prev/next only make sense with something to skip to
        html.toggleClass('panel--single', e.playlist.length < 2)
    })


    html.find('.selector').on('hover:focus',(e)=>{
        last = e.target
    })

    html.find('.player-panel__playpause').on('hover:enter',(e)=>{
        listener.send('playpause',{})
    })

    html.find('.player-panel__next').on('hover:enter',(e)=>{
        listener.send('next',{})
    })

    html.find('.player-panel__prev').on('hover:enter',(e)=>{
        listener.send('prev',{})
    })

    html.find('.player-panel__rprev').on('hover:enter',(e)=>{
        listener.send('rprev',{})
    })

    html.find('.player-panel__rnext').on('hover:enter',(e)=>{
        listener.send('rnext',{})
    })

    elems.playlist.on('hover:enter',(e)=>{
        listener.send('playlist',{})
    })

    html.find('.player-panel__tstart').on('hover:enter',(e)=>{
        listener.send('to_start',{})
    })

    html.find('.player-panel__tend').on('hover:enter',(e)=>{
        listener.send('to_end',{})
    })

    html.find('.player-panel__fullscreen').on('hover:enter',(e)=>{
        listener.send('fullscreen',{})
    })

    html.find('.player-panel__settings').on('hover:enter',settings)

    html.find('.player-panel__pip,.player-panel__volume').toggleClass('hide',!Boolean(Platform.desktop() || Platform.is('browser') || (Platform.is('apple') && !Utils.isPWA())))

    html.find('.player-panel__pip').on('hover:enter',()=>{
        listener.send('pip',{})
    })

    elems.timeline.attr('data-controller', 'player_rewind')

    elems.rewind_touch.toggleClass('hide',!Platform.screen('mobile'))

    elems.timeline.on('mousemove',(e)=>{
        if(!Platform.screen('mobile')) listener.send('mouse_rewind',{method: 'move',time: elems.time, percent: percent(e)})
    }).on('mouseout',()=>{
        if(!Platform.screen('mobile')) elems.time.addClass('hide')
    }).on('click',(e)=>{
        if(DeviceInput.canClick(e.originalEvent) && !Platform.screen('mobile')) listener.send('mouse_rewind',{method: 'click',time: elems.time, percent: percent(e)})
    })

    if(!html.find('.player-panel__volume').hasClass('hide')){
        html.find('.player-panel__volume-range').val(Storage.get('player_volume','1')).on('input',function(){
            listener.send('change_volume',{volume: $(this).val()})

            Video.changeVolume($(this).val())
        })
    }

    let touch

    let touchEnd = (e)=>{
        window.removeEventListener('touchend', touchEnd)

        Video.video().rewind = false

        listener.send('mouse_rewind',{method: 'click',time: elems.time, percent: touch.to / 100})

        touch = false
    }

    elems.rewind_touch.on('touchstart',(e)=>{
        let point = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0]

        touch = {
            now: percent({clientX: elems.position.width()}) * 100,
            from: percent(point) * 100,
        }

        touch.move = touch.from
        touch.to   = touch.from

        window.addEventListener('touchend', touchEnd)
    }).on('touchmove',(e)=>{
        let point = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0]

        if(touch){
            touch.move = percent(point) * 100
            touch.to   = Math.max(0,Math.min(100,touch.now + (touch.move - touch.from)))

            timeline_last.position = touch.to + '%'

            elems.timenow.text(Utils.secondsToTime(touch.to / 100 * (Video.video().duration || 0)))

            Video.video().rewind = true

            rewind()
        }
    })

    html.find('.player-panel__line:eq(1) .selector').attr('data-controller', 'player_panel')

    html.find('.player-panel__left .selector,.player-panel__center .selector,.player-panel__right .selector').on('hover:focus',function(){
        last_panel_focus = $(this)[0]
    })

    /**
     * Выбор потока
     */
    elems.flow.on('hover:enter',()=>{
        if(flows){
            let enabled = Controller.enabled().name

            Select.show({
                title: Lang.translate('player_flow'),
                items: flows,
                onSelect: (a)=>{
                    flows.forEach(element => {
                        element.enabled  = false
                        element.selected = false
                    })

                    a.enabled  = true
                    a.selected = true

                    Controller.toggle(enabled)

                    listener.send('flow',{url: a.url})
                },
                onBack: ()=>{ 
                    Controller.toggle(enabled)
                }
            })
        }
    })
    
    /**
     * Выбор качества
     */
    elems.quality.text('auto').on('hover:enter',()=>{
        if(qualitys){
            let qs = []
            let nw = elems.quality.text()
            
            if(Arrays.isArray(qualitys)){
                qs = qualitys
            }
            else{
                for(let i in qualitys){
                    let qa = qualitys[i]
                    let qu = typeof qa == 'object' ? qa.url : typeof qa == 'string' ? qa : ''
                    let lb = typeof qa == 'object' ? qa.label : ''

                    qs.push({
                        quality: i,
                        title: i + (lb ? '<sub>' + lb + '</sub>' : ''),
                        url: qu,
                        selected: nw == Utils.qualityToText(i),
                        call: typeof qa == 'object' ? qa.call : false,
                        instance: qa
                    })
                }
            }

            if(!qs.length) return

            let enabled = Controller.enabled().name

            Select.show({
                title: Lang.translate('player_quality'),
                items: qs,
                onSelect: (a)=>{
                    if(a.call){
                        Controller.toggle(enabled)

                        a.call(a.instance, (url)=>{
                            elems.quality.text(Utils.qualityToText(a.quality))

                            qs.forEach(q=>q.selected = false)

                            a.selected = true

                            listener.send('quality',{name: a.quality, url: url})

                            if(a.instance && a.instance.trigger) a.instance.trigger()
                        })
                    }
                    else{
                        elems.quality.text(Utils.qualityToText(a.quality))

                        qs.forEach(q=>q.selected = false)

                        a.enabled = true
                        a.selected = true

                        if(!Arrays.isArray(qualitys) || a.change_quality) listener.send('quality',{name: a.quality, url: a.url})

                        if(a.instance && a.instance.trigger) a.instance.trigger()

                        Controller.toggle(enabled)
                    }
                },
                onBack: ()=>{
                    Controller.toggle(enabled)
                }
            })
        }
    })


    /**
     * Выбор аудиодорожки
     */
    elems.tracks.on('hover:enter',(e)=>{
        if(tracks.length){
            tracks.forEach((element, p) => {
                let name = []
                let from = translates.tracks && Arrays.isArray(translates.tracks) && translates.tracks[p] ? translates.tracks[p] : element

                name.push(p + 1)
                name.push(normalName(from.language || from.name || Lang.translate('player_unknown')))

                if(from.label) name.push(normalName(from.label))

                if(from.extra){
                    if(from.extra.channels) name.push(from.extra.channels + ' Ch')
                    if(from.extra.fourCC) name.push(from.extra.fourCC)
                }
                
                element.title = name.join(' / ')
            })

            let enabled = Controller.enabled().name

            Select.show({
                title: Lang.translate('player_tracks'),
                items: tracks,
                onSelect: (a)=>{
                    tracks.forEach(element => {
                        element.enabled  = false
                        element.selected = false
                    })

                    a.enabled  = true
                    a.selected = true

                    Controller.toggle(enabled)

                    if(a.onSelect) a.onSelect(a)
                },
                onBack: ()=>{
                    Controller.toggle(enabled)
                }
            })
        }
        else showInfo('player_no_tracks_title','player_no_tracks_descr')
    })

    /**
     * Выбор субтитров
     */
    elems.subs.on('hover:enter',(e)=>{
        if(subs.length){
            if(subs[0].index !== -1){
                let any_select = subs.find(s=>s.selected)

                Arrays.insert(subs, 0, {
                    title: Lang.translate('player_disabled'),
                    selected: any_select ? false : true,
                    index: -1
                })
            }

            subs.forEach((element, p) => {
                if(element.index !== -1){
                    let track_num = element.extra && element.extra.track_num ? parseInt(element.extra.track_num) : element.index

                    let from = translates.subs && Arrays.isArray(translates.subs) && translates.subs[track_num] ? translates.subs[track_num] : element

                    element.title = p + ' / ' + normalName(from.language && from.label ? from.language + ' / ' + from.label : from.language || from.label || Lang.translate('player_unknown'))
                } 
            })

            let enabled = Controller.enabled().name

            Select.show({
                title: Lang.translate('player_subs'),
                items: subs,
                onSelect: (a)=>{
                    subs.forEach(element => {
                        element.mode     = 'disabled'
                        element.selected = false
                    })

                    a.mode     = 'showing'
                    a.selected = true

                    listener.send('subsview',{status: a.index > -1})
        
                    Controller.toggle(enabled)

                    if(a.onSelect) a.onSelect(a)
                },
                onBack: ()=>{
                    Controller.toggle(enabled)
                }
            })
        }
    })

    Footer.listener.follow('open',()=>{
        html.addClass('panel--footer-open')
    })

    Footer.listener.follow('close',()=>{
        html.removeClass('panel--footer-open')

        Controller.toggle('player_panel')
    })

    Video.listener.follow('loadeddata', drawSegments)
}

function drawSegments(){
    let segments = Segments.all()
    let timeline = elems.segments.empty()

    for(let name in segments){
        for(let a = 0; a < segments[name].length; a++){
            let seg      = segments[name][a]
            let seg_elem = $(`<div class="player-panel__timeline-segment player-panel__timeline-segment--${name}"></div>`)
            let duration = Video.video().duration || 0

            let r_start = Math.min(duration, seg.start)
            let r_end   = Math.min(duration, seg.end)
            
            let start    = r_start / duration * 100
            let length   = (r_end - r_start) / duration * 100

            seg_elem.css({
                left: duration ? start + '%' : 0,
                width: duration ? length + '%' : 0
            })

            timeline.append(seg_elem)
        }
    }
}

function hideRewind(){
    html.addClass('panel--norewind')
}

function showParams(){
    let enabled = Controller.enabled().name
    let items = []

    items.push({
        title: Lang.translate('player_tracks'),
        trigger: elems.tracks,
        ghost: elems.tracks.hasClass('hide'),
        noenter: elems.tracks.hasClass('hide')
    })

    items.push({
        title: Lang.translate('player_subs'),
        trigger: elems.subs,
        ghost: elems.subs.hasClass('hide'),
        noenter: elems.subs.hasClass('hide')
    })

    items.push({
        title: Lang.translate('player_quality'),
        trigger: elems.quality,
        ghost: !qualitys,
        noenter: !qualitys
    })

    items.push({
        title: Lang.translate('settings_main_rest'),
        trigger: html.find('.player-panel__settings')
    })

    Select.show({
        title: Lang.translate('title_settings'),
        items: items,
        onSelect: (a)=>{
            Controller.toggle(enabled)

            a.trigger.trigger('hover:enter')
        },
        onBack: ()=>{
            Controller.toggle(enabled)
        }
    })
}

function settings(){
    let speed = Storage.get('player_speed','default')
    let items = [
        {
            title: Lang.translate('player_video_size'),
            subtitle: Lang.translate('player_size_' + Storage.get('player_size','default') + '_title'),
            method: 'size'
        },
        {
            title: Lang.translate('player_video_speed'),
            subtitle: speed == 'default' ? Lang.translate('player_speed_default_title') : speed,
            method: 'speed'
        }
    ]

    let current = tracks.find(a=>a.selected || a.enabled)

    items.push({
        title: Lang.translate('player_tracks'),
        subtitle: current ? normalName(current.language || current.name || current.label || '') : '',
        method: 'tracks'
    })

    items.push({
        title: Lang.translate('player_change_source'),
        subtitle: balanser ? Utils.capitalizeFirstLetter(balanser.current) : '',
        method: 'balanser'
    })

    items.push(
        {
            title: Lang.translate('player_share_title'),
            subtitle: Lang.translate('player_share_descr'),
            method: 'share'
        },
        {
            title: Lang.translate('player_segments_title'),
            subtitle: Lang.translate('player_segments_descr'),
            method: 'segments'
        },
        {
            title: Lang.translate('settings_player_subs'),
            method: 'subs'
        }
    )

    if(Storage.field('player_normalization')){
        items.push({
            title: Lang.translate('player_normalization'),
            separator: true
        })

        items.push({
            title: Lang.translate('player_normalization_power_title'),
            subtitle: Lang.translate('player_normalization_step_' + Storage.get('player_normalization_power','hight')),
            method: 'normalization_power'
        })

        items.push({
            title: Lang.translate('player_normalization_smooth_title'),
            subtitle: Lang.translate('player_normalization_step_' + Storage.get('player_normalization_smooth','medium')),
            method: 'normalization_smooth'
        })

        items.push({
            title: Lang.translate('player_normalization_type_title'),
            subtitle: Lang.translate('player_normalization_type_' + Storage.get('player_normalization_type','all')),
            method: 'normalization_type'
        })
    }

    if(last_settings_action){
        items.find(a=>a.method == last_settings_action).selected = true
    }

    Select.show({
        title: Lang.translate('title_settings'),
        items,
        nomark: true,
        onSelect: (a)=>{
            last_settings_action = a.method

            if(a.method == 'size') selectSize()
            if(a.method == 'speed') selectSpeed()
            if(a.method == 'normalization_power') selectNormalizationStep('power','hight')
            if(a.method == 'normalization_smooth') selectNormalizationStep('smooth','medium')
            if(a.method == 'normalization_type') selectNormalizationType()
            if(a.method == 'segments') selectSegments()
            if(a.method == 'subs') selectSubs()
            if(a.method == 'tracks') elems.tracks.trigger('hover:enter')
            if(a.method == 'balanser') selectBalanser()
            if(a.method == 'share'){
                Controller.toggle(Platform.screen('mobile') ? 'player' : 'player_panel')

                listener.send('share',{})
            }
        },
        onBack: ()=>{
            Controller.toggle(Platform.screen('mobile') ? 'player' : 'player_panel')
        }
    })
}

/**
 * Окно с информацией, когда переключать нечего
 * @param {string} title - ключ заголовка
 * @param {string} descr - ключ текста
 */
function showInfo(title, descr){
    let enabled = Controller.enabled().name

    Modal.open({
        title: Lang.translate(title),
        size: 'small',
        html: $('<div class="about">' + Lang.translate(descr) + '</div>'),
        buttons: [
            {
                name: Lang.translate('confirm'),
                onSelect: ()=>{
                    Modal.close()
                    Controller.toggle(enabled)
                }
            }
        ],
        onBack: ()=>{
            Modal.close()
            Controller.toggle(enabled)
        }
    })
}

/**
 * Выбор балансера (источника), с которого запущено видео
 */
function selectBalanser(){
    let enabled = Controller.enabled().name

    if(!balanser || balanser.list.length < 2){
        showInfo('player_no_sources_title','player_no_sources_descr')

        return
    }

    Select.show({
        title: Lang.translate('online_balanser'),
        items: balanser.list.map(name=>({
            title: Utils.capitalizeFirstLetter(name),
            value: name,
            selected: name == balanser.current
        })),
        nohide: true,
        onSelect: (a)=>{
            if(a.value == balanser.current){
                Controller.toggle(enabled)

                return
            }

            listener.send('balanser',{name: a.value})
        },
        onBack: settings
    })
}

function selectSubs(){
    let items = [
        {
            title: Lang.translate('settings_player_subs_size'),
            subtitle: Lang.translate('settings_player_subs_size_descr'),
            name: 'subtitles_size'
        },
        {
            title: Lang.translate('settings_player_subs_stroke_use'),
            subtitle: Lang.translate('settings_player_subs_stroke_use_descr'),
            name: 'subtitles_stroke'
        },
        {
            title: Lang.translate('settings_player_subs_backdrop_use'),
            subtitle: Lang.translate('settings_player_subs_backdrop_use_descr'),
            name: 'subtitles_backdrop'
        },
        {
            title: Lang.translate('settings_rest_time'),
            name: 'player_subs_shift_time'
        }
    ]

    Select.show({
        title: Lang.translate('settings_player_subs'),
        items: items,
        nohide: true,
        onBack: settings,
        onSelect: (a)=>{
            let subitems = []

            if(a.name == 'subtitles_size'){
                subitems = [
                    {
                        title: Lang.translate('settings_param_subtitles_size_small'),
                        value: 'small'
                    },
                    {
                        title: Lang.translate('settings_param_subtitles_size_normal'),
                        value: 'normal'
                    },{
                        title: Lang.translate('settings_param_subtitles_size_bigger'),
                        value: 'large'
                    }
                ]
            }

            if(a.name == 'subtitles_stroke' || a.name == 'subtitles_backdrop'){
                subitems = [
                    {
                        title: Lang.translate('settings_param_yes'),
                        value: 'true'
                    },
                    {
                        title: Lang.translate('settings_param_no'),
                        value: 'false'
                    }
                ]
            }

            if(a.name == 'player_subs_shift_time'){
                subitems = [-120, -90, -60, -30, -10, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 10, 30, 60, 90, 120]

                subitems = subitems.map(i=>{
                    return {
                        title: (i > 0 ? '+' : '') + i + ' sec.',
                        value: i,
                        selected: Storage.get('player_subs_shift_time', '0') == i
                    }
                })
            }
            else{
                subitems.forEach((i)=>{
                    i.selected = (Storage.field(a.name) + '') == i.value
                })
            }

            Select.show({
                title: a.title,
                items: subitems,
                nohide: true,
                onBack: selectSubs,
                onSelect: (b)=>{
                    Storage.set(a.name, b.value)

                    Video.applySubsSettings()

                    selectSubs()
                }
            })

            
        }
    })
}

function selectSegments(){
    let items = [
        {
            title: Lang.translate('player_segments_ad_title'),
            name: 'ad',
            subtitle: Lang.translate('player_segments_value_' + Storage.get('player_segments_ad', 'auto')),
        },
        {
            title: Lang.translate('player_segments_skip_title'),
            name: 'skip',
            subtitle: Lang.translate('player_segments_value_' + Storage.get('player_segments_skip', 'auto')),
        },
    ]

    Select.show({
        title: Lang.translate('player_segments_title'),
        items: items,
        nohide: true,
        onBack: settings,
        onSelect: (a)=>{
            Select.show({
                title: a.title,
                items: [
                    {
                        title: Lang.translate('player_segments_value_auto'),
                        value: 'auto',
                        selected: Storage.get('player_segments_'+a.name, 'auto') == 'auto'
                    },
                    {
                        title: Lang.translate('player_segments_value_user'),
                        value: 'user',
                        selected: Storage.get('player_segments_'+a.name, 'auto') == 'user'
                    },
                    {
                        title: Lang.translate('player_segments_value_none'),
                        value: 'none',
                        selected: Storage.get('player_segments_'+a.name, 'auto') == 'none'
                    }
                ],
                nohide: true,
                onBack: selectSegments,
                onSelect: (b)=>{
                    Storage.set('player_segments_'+a.name, b.value)

                    selectSegments()
                }
            })
        }
    })
}

function selectNormalizationType(){
    let select  = Storage.get('player_normalization_type', 'all')

    let items = [
        {
            title: Lang.translate('player_normalization_type_all'),
            value: 'all',
            selected: select == 'all'
        },
        {
            title: Lang.translate('player_normalization_type_up'),
            value: 'up',
            selected: select == 'up'
        },
        {
            title: Lang.translate('player_normalization_type_down'),
            value: 'down',
            selected: select == 'down'
        }
    ]

    Select.show({
        title: Lang.translate('player_normalization_type_title'),
        items: items,
        nohide: true,
        onBack: settings,
        onSelect: (a)=>{
            Storage.set('player_normalization_type', a.value)

            settings()
        }
    })
}

function selectNormalizationStep(type, def){
    let select  = Storage.get('player_normalization_'+type, def)

    let items = [
        {
            title: Lang.translate('player_normalization_step_none'),
            value: 'none',
            selected: select == 'none'
        },
        {
            title: Lang.translate('player_normalization_step_low'),
            value: 'low',
            selected: select == 'low'
        },
        {
            title: Lang.translate('player_normalization_step_medium'),
            value: 'medium',
            selected: select == 'medium'
        },
        {
            title: Lang.translate('player_normalization_step_hight'),
            value: 'hight',
            selected: select == 'hight'
        }
    ]

    Select.show({
        title: Lang.translate('player_normalization_'+type+'_title'),
        items: items,
        nohide: true,
        onBack: settings,
        onSelect: (a)=>{
            Storage.set('player_normalization_'+type, a.value)

            settings()
        }
    })
}

/**
 * Выбор масштаба видео
 */
function selectSize(){
    let select = Storage.get('player_size','default')

    let items = [
        {
            title: Lang.translate('player_size_default_title'),
            subtitle: Lang.translate('player_size_default_descr'),
            value: 'default',
            selected: select == 'default'
        },
        {
            title: Lang.translate('player_size_cover_title'),
            subtitle: Lang.translate('player_size_cover_descr'),
            value: 'cover',
            selected: select == 'cover'
        }
    ]

    if(Platform.is('orsay') && Storage.field('player') == 'orsay'){
        items.splice(1,1)
    }

    if(!(Platform.is('tizen') && Storage.field('player') == 'tizen')){
        items = items.concat([{
            title: Lang.translate('player_size_fill_title'),
            subtitle: Lang.translate('player_size_fill_descr'),
            value: 'fill',
            selected: select == 'fill'
        },
        {
            title: Lang.translate('player_size_s115_title'),
            subtitle: Lang.translate('player_size_s115_descr'),
            value: 's115',
            selected: select == 's115'
        },
        {
            title: Lang.translate('player_size_s130_title'),
            subtitle: Lang.translate('player_size_s130_descr'),
            value: 's130',
            selected: select == 's130'
        },
        {
            title: Lang.translate('player_size_v115_title'),
            subtitle: Lang.translate('player_size_v115_descr'),
            value: 'v115',
            selected: select == 'v115'
        },
        {
            title: Lang.translate('player_size_v130_title'),
            subtitle: Lang.translate('player_size_v130_descr'),
            value: 'v130',
            selected: select == 'v130'
        }])
    }
    else{
        if(select == 's130' || select == 'fill'){
            items[0].selected = true
        }
    }

    Select.show({
        title: Lang.translate('player_video_size'),
        items: items,
        nohide: true,
        onSelect: (a)=>{
            listener.send('size',{size: a.value})
        },
        onBack: settings
    })
}

function selectSpeed(){
    let select = Storage.get('player_speed','default')

    let items = [
        {
            title: '0.25',
            value: '0.25'
        },
        {
            title: '0.50',
            value: '0.50'
        },
        {
            title: '0.75',
            value: '0.75'
        },
        {
            title: Lang.translate('player_speed_default_title'),
            value: 'default'
        },
        {
            title: '1.25',
            value: '1.25'
        },
        {
            title: '1.50',
            value: '1.50'
        },
        {
            title: '1.75',
            value: '1.75'
        },
        {
            title: '2',
            value: '2'
        },
    ]

    if(Platform.is('tizen') && Storage.field('player') == 'tizen' || (Platform.is('orsay') && Storage.field('player') == 'orsay')){
        items = [
            {
                title: Lang.translate('player_speed_default_title'),
                value: 'default',
                selected: select == 'default'
            },
            {
                title: '2',
                subtitle: Platform.is('orsay') && Storage.field('player') == 'orsay'? Lang.translate('player_speed_two_descr'):'',
                value: '2'
            }
        ]
    }

    let any

    items.forEach(e=>{
        if(e.value == select){
            any = true

            e.selected = true
        } 
    })

    if(!any){
        Storage.set('player_speed','default')

        if(items.length == 3) items[0].selected = true
        else items[3].selected = true
    }

    Select.show({
        title: Lang.translate('player_video_speed'),
        items: items,
        nohide: true,
        onSelect: (a)=>{
            Storage.set('player_speed',a.value)

            listener.send('speed',{speed: a.value})

            settings()
        },
        onBack: settings
    })
}

function isTV(){
    return $('body > .player').hasClass('tv')
}

function normalName(name){
    return name.replace(/^[0-9]+(\.)?([\t ]+)?/,'').replace(/\s#[0-9]+/,'')
}

/**
 * Добавить контроллеры
 */
 function addController(){
    Controller.add('player_rewind',{
        toggle: ()=>{
            Controller.collectionSet(render())
            Controller.collectionFocus(false,render())
        },
        up: ()=>{
            Controller.toggle('player')
        },
        down: ()=>{
            toggleButtons()
        },
        right: ()=>{
            listener.send('rnext',{})
        },
        left: ()=>{
            listener.send('rprev',{})
        },
        gone: ()=>{
            html.find('.selector').removeClass('focus')
        },
        back: ()=>{
            Controller.toggle('player')

            hide()
        }
    })

    Controller.add('player_panel',{
        toggle: ()=>{

                Controller.collectionSet(render())
                Controller.collectionFocus(last_panel_focus ? last_panel_focus : $(isTV() ? '.player-panel__next' : '.player-panel__playpause',html)[0],render())
        },
        up: ()=>{
            isTV() || html.hasClass('panel--norewind') ? Controller.toggle('player') : toggleRewind()
        },
        right: ()=>{
            Navigator.move('right')
        },
        left: ()=>{
            Navigator.move('left')
        },
        down: ()=>{
            Footer.available() ? Controller.toggle('player_footer') : listener.send('playlist',{})
        },
        gone: ()=>{
            html.find('.selector').removeClass('focus')
        },
        back: ()=>{
            Controller.toggle('player')

            hide()
        }
    })
}

/**
 * Рассчитать проценты
 * @param {object} e 
 * @returns {number}
 */
function percent(e){
    let offset = elems.timeline.offset()
    let width  = elems.timeline.width()

    return (e.clientX - offset.left) / width
}

/**
 * Обновляем состояние панели
 * @param {string} need - что нужно обновить
 * @param {string|number} value - значение
 */
function update(need, value){
    if(need == 'position'){
        timeline_last.position = value

        if(panel_visible) elems.position.css({width: value})
    }

    if(need == 'peding'){
        timeline_last.peding = value

        if(panel_visible) elems.peding.css({width: value})
    }

    if(need == 'timeend'){
        elems.timeend.text(value)
    }

    if(need == 'timenow'){
        elems.timenow.text(value)
    }

    if(need == 'play'){
        html.toggleClass('panel--paused',false)
    }

    if(need == 'pause'){
        html.toggleClass('panel--paused',true)
    }
}

/**
 * Показать или скрыть панель
 * @param {boolean} status 
 */
function visible(status){
    listener.send('visible',{status: status})

    html.toggleClass('panel--visible',status)

    panel_visible = status

    elems.position.css({width: timeline_last.position})
    elems.peding.css({width: timeline_last.peding})
}

/**
 * Можем играть, далее отслеживаем статус
 */
function canplay(){
    condition.canplay = true

    state.start()
}

/**
 * Перемотка
 */
function rewind(){
    condition.rewind = true

    state.start()
}

/**
 * Переключить на контроллер перемотки
 */
function toggleRewind(){
    Controller.toggle(isTV() || html.hasClass('panel--norewind') ? 'player_panel' : 'player_rewind')
}

/**
 * Переключить на контроллер кнопки
 */
function toggleButtons(){
    if(!Platform.screen('mobile')) Controller.toggle('player_panel')
}

/**
 * Контроллер
 */
function toggle(){
    condition.visible = true

    state.start()

    if(!Platform.screen('mobile')) toggleRewind()
}

/**
 * Показать панель
 */
function show(){
    state.start()

    // iPhone Safari cannot put the page in fullscreen, only the video itself (player.js)
    let video_fullscreen = Boolean(window.HTMLVideoElement && HTMLVideoElement.prototype.webkitEnterFullscreen)

    html.find('.player-panel__fullscreen').toggleClass('hide',Platform.tv() || Platform.is('android') || !(Utils.canFullScreen() || video_fullscreen))

    addController()
}

/**
 * Если двигали мышку
 */
function mousemove(){
    condition.mousemove = true

    state.start()
}

/**
 * Скрыть панель
 */
function hide(){
    condition.visible = false
    condition.mousemove = false

    visible(false)
}

function visibleStatus(){
    return html.hasClass('panel--visible')
}

/**
 * Установить субтитры
 * @param {[{index:integer, language:string, label:string}]} su 
 */
function setSubs(su){
    subs = su

    elems.subs.toggleClass('hide',false)
}

/**
 * Установить дорожки
 * @param {[{index:integer, language:string, label:string}]} tr 
 */
function setTracks(tr){
    tracks = tr

    elems.tracks.toggleClass('hide',false)
}

/**
 * Установить список балансеров, из которого запущено видео
 * @param {{current:string, list:[string]}} data
 */
function setBalanser(data){
    balanser = data && data.list && data.list.length ? data : false
}

/**
 * Устанавливает качество из M3U8
 * @param {[{title:string, url:string}]} levels 
 * @param {string} current 
 */
function setLevels(levels, current){
    if(qualitys && Object.keys(qualitys).length) return
    
    qualitys = levels

    elems.quality.text(Utils.qualityToText(current))
}

/**
 * Показать текущие качество и записать в переменную для показа в панели
 * @param {{"1080p":"url", "720p":"url"}} qs список качеств
 * @param {string} url текущее качество url
 */
function quality(qs, url){
    if(qs){
        elems.quality.toggleClass('hide',false)

        qualitys = qs

        for(let i in qs){
            let qa = qs[i]
            let qu = typeof qa == 'object' ? qa.url : typeof qa == 'string' ? qa : ''

            if(qu == url){
                elems.quality.text(Utils.qualityToText(i))
                break
            }
        }
    } 
}

/**
 * Показать название следующего эпизода 
 * @param {{position:integer, playlist:[{title:string, url:string}]}} e 
 */
function showNextEpisodeName(e){
    if(e.playlist[e.position + 1]){
        elems.episode.text(e.playlist[e.position + 1].title).toggleClass('hide',false)
    }
    else elems.episode.toggleClass('hide',true)
}

/**
 * Установить перевод для дорожек и сабов
 * @param {{subs:[],tracks:[]}} data 
 */
function setTranslate(data){
    if(typeof data == 'object') translates = data
}

function updateTranslate(where, data){
    if(!translates[where]) translates[where] = data
}

function setFlows(data){
    flows = typeof data == 'object' ? data : false

    elems.flow.toggleClass('hide', flows ? false : true)
}

/**
 * Уничтожить
 */
function destroy(){
    last = false

    condition = {}
    tracks    = []
    subs      = []
    balanser  = false
    qualitys  = false
    flows     = false
    translates = {}

    timeline_last.position = 0
    timeline_last.peding = 0

    last_panel_focus = false
    panel_visible = false

    elems.peding.css({width: 0})
    elems.position.css({width: 0})
    elems.time.text('00:00')
    elems.timenow.text('00:00')
    elems.timeend.text('00:00')
    elems.quality.text('auto')

    elems.subs.toggleClass('hide',true)
    elems.tracks.toggleClass('hide',true)
    elems.episode.toggleClass('hide',true)
    elems.playlist.toggleClass('hide',true)
    elems.flow.toggleClass('hide',true)

    html.toggleClass('panel--single',true)

    html.toggleClass('panel--paused',false)
    html.toggleClass('panel--norewind',false)

    elems.segments.empty()
}

/**
 * Получить html
 * @returns {object}
 */
function render(){
    return html
}

export default {
    init,
    listener,
    render,
    toggle,
    show,
    destroy,
    hide,
    canplay,
    update,
    rewind,
    setTracks,
    setSubs,
    setBalanser,
    setLevels,
    mousemove,
    quality,
    showNextEpisodeName,
    setTranslate,
    updateTranslate,
    visible,
    visibleStatus,
    showParams,
    hideRewind,
    setFlows
}
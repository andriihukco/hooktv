import Sources from './sources'
import History from './history'
import Template from '../template'
import Controller from '../../core/controller'
import Keybord from '../keyboard/keyboard'
import Platform from '../../core/platform'
import Lang from '../../core/lang'
import Scroll from '../scroll'
import Arrays from '../../utils/arrays'
import Layer from '../../core/layer'
import HeadBackward from '../head/backward'
import Head from '../head/head'
import Subscribe from '../../utils/subscribe'
import DeviceInput from '../device_input'



let html = Template.elem('div', {class: 'main-search'}),
    search,
    history,
    native = false,
    sources,
    keyboard,
    scroll,
    input = '',
    params = {},
    additional = [],
    listener = Subscribe()

function init(){
    Head.addIcon(Template.string('icon_search'), open).addClass('open--search')
}

function open(use_params = {}){
    params = use_params

    input = use_params.input || ''

    $('body').toggleClass('ambience--enable',true)
    $('body').toggleClass('search--open',true)

    create()
    toggle()

    Layer.update(html)

    listener.send('open')
}

function toggle(){
    Controller.add('search',{
        invisible: true,
        toggle: ()=>{
            keyboard.toggle()
        },
        update: ()=>{},
        back: destroy
    })

    Controller.toggle('search')
}

function scrollTo(element){
    scroll.update(element ? element : search.find('.search__input'),true)
}

function create(){
    search = Template.get('search')

    // phones and computers type into the native field; the on-screen keypad is for TV only
    native = !Platform.tv()
    search.toggleClass('search__body--native', native)

    // mouse and touch close; the remote closes with Back
    let close = $('<div class="search__close selector"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></div>')

    close.on('hover:enter', destroy)

    search.prepend(close)

    scroll = new Scroll({step: 300})

    scroll.height()

    scroll.render().addClass('search')

    scroll.append(HeadBackward(Lang.translate('search')))

    scroll.append(search)

    html.append(scroll.render(true))

    scroll.onScroll = (step)=>{
        Layer.visible(scroll.render(true))

        // phones: once the results are scrolled, the keypad steps aside (the toggle brings it back)
        if(input && !native) search.addClass('search__body--keys-collapsed')
    }

    search.find('.search__keys-toggle').on('click hover:enter', (e)=>{
        if(DeviceInput.noDubleClick(e)) search.toggleClass('search__body--keys-collapsed')
    })

    // the start screen: the same empty state as the Saved page, until a query is typed
    search.find('.search__empty .empty__icon').append('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>')
    search.find('.search__empty .empty__descr').text(Lang.translate('search_start_typing'))

    if(Platform.systemKeyboard()) search.find('.search__input-shell').hide()

    createKeyboard()
    createHistory()
    createSources()

    keyboard.value(input)
    search.toggleClass('search__body--query-active', Boolean(input))
}

function createSources(){
    sources = new Sources({sources: params.sources, additional})

    listener.send('sources',{sources})

    sources.create()

    sources.listener.follow('back',destroy)

    sources.listener.follow('up',()=>{
        if(history.any()) history.toggle()
        else keyboard.toggle()

        scrollTo()
    })

    sources.listener.follow('toggle',(e)=>{
        scrollTo(e.element)
    })

    sources.listener.follow('select',(e)=>{
        if(input) history.add(input)

        destroy()
    })

    // no TMDB / CUB switch: results come from the first source only
    search.find('.search__results').append(sources.render())
}

function createHistory(){
    history = new History()
    history.create()

    history.listener.follow('down',()=>{
        if(input) sources.toggle(true)
    })

    history.listener.follow('up',()=>{
        keyboard.toggle()
    })

    history.listener.follow('enter',(event)=>{
        keyboard.value(event.value)

        sources.search(event.value, true)
    })

    history.listener.follow('back',destroy)

    search.find('.search__history').append(history.render())
}

function createKeyboard(){
    keyboard = new Keybord({
        layout: 'search'
    })

    keyboard.create()
    
    keyboard.listener.follow('change',(event)=>{
        input = event.value
        search.toggleClass('search__body--query-active', Boolean(input))

        if(input){
            search.find('.search__input').toggleClass('filled', true).html(input.replace(/\s/g,'&nbsp;'))

            sources.search(input)
        }
        else{
            search.find('.search__input').toggleClass('filled', false).text(Lang.translate('search_input') + '...')

            sources.search('')
        }
    })

    keyboard.listener.follow('down',()=>{
        if(input && !history.any()) sources.toggle()
        else if(history.any()) history.toggle()
    })

    keyboard.listener.follow('hover',()=>{
        input.length <= 2 ? sources.cancel() : sources.search(input)
    })

    keyboard.listener.follow('back',destroy)
}

function addSource(source){
    additional.push(source)
}

function removeSource(source){
    Arrays.remove(additional,source)
}

function render(js){
    return js ? html : $(html)
}

function destroy(){
    keyboard.destroy()
    history.destroy()
    sources.destroy()

    search.remove()

    html.empty()

    $('body').toggleClass('ambience--enable',false)
    $('body').toggleClass('search--open',false)

    if(params.onBack) params.onBack()
    else Controller.toggle('content')

    params = {}

    input = ''

    listener.send('close')
}

function close(){
    destroy()
}

export default {
    init,
    listener,
    open,
    render,
    addSource,
    removeSource,
    close
}
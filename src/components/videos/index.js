import Activity from '../../interaction/activity/activity'
import Controller from '../../core/controller'
import Input from '../../interaction/settings/input'
import Lang from '../../core/lang'
import Scroll from '../../interaction/scroll'
import Client, {region} from '../../videos/client'
import {accessToken, connected, toggle} from '../../videos/account'
import {play} from '../../videos/player'
import {card} from './card'
import {home} from './home'

const sections = [
    {id: 'home', label: 'videos_nav_home'},
    {id: 'search', label: 'videos_nav_search'},
    {id: 'subs', label: 'videos_nav_subs'},
    {id: 'you', label: 'videos_nav_you'}
]

/**
 * Video page: a full-width home with a hero and shelves per category, plus search,
 * subscriptions and the account. Without an account it shows trending videos only.
 */
function component(object){
    let instance = this
    let scroll = new Scroll({mask: true, over: true, step: 280})
    let shell = $('<div class="videos-root"></div>')
    let html = $('<div class="videos-page"></div>')
    let section = 'home'
    let query = ''
    let last
    let requestId = 0
    let destroyed = false

    function focusFresh(){
        let active = Activity.active()

        if(!destroyed && instance.activity && active && active.activity === instance.activity){
            Controller.collectionSet(shell)

            if(!last || !last.isConnected) Controller.collectionFocus(false, shell)
        }
    }

    function setStatus(text){
        html.find('.videos-page__status').text(text || '')
    }

    function content(){
        return html.find('.videos-page__content').empty()
    }

    function markSections(){
        html.find('.videos-page__tab').each((index, element)=>{
            $(element).toggleClass('active', $(element).data('section') == section)
        })
    }

    function showGrid(items){
        let grid = $('<div class="videos-page__grid"></div>')

        items.forEach(item=> grid.append(card(item, video=> play(video.id))))
        content().append(grid)
        setStatus(items.length ? '' : Lang.translate('videos_empty'))
        focusFresh()
    }

    function showConnect(){
        let button = $('<button class="videos-page__connect selector" type="button"></button>').text(Lang.translate('videos_connect_cta'))

        setStatus(Lang.translate('videos_connect_needed'))
        content().append(button)
        button.on('hover:enter click', ()=> toggle(render))
        focusFresh()
    }

    function showYou(current){
        return accessToken().then(token=> Client.me(token)).then(json=>{
            if(current != requestId) return

            let box = $('<div class="videos-page__profile"></div>')
            let name = $('<div class="videos-page__profile-name"></div>').text(json.name || Lang.translate('videos_you_title'))
            let button = $('<button class="videos-page__connect selector" type="button"></button>').text(Lang.translate('videos_disconnect'))

            box.append(name, button)
            content().append(box)
            button.on('hover:enter click', ()=> toggle(render))
            setStatus('')
            focusFresh()
        })
    }

    /**
     * Draw the open section; resolves once it is drawn
     * @returns {Promise<void>}
     */
    function load(){
        let current = ++requestId
        let isCurrent = ()=> current == requestId && !destroyed

        setStatus('')
        content().empty()

        if(section == 'home'){
            setStatus(Lang.translate('videos_loading'))
            home(content(), {region: region(), isCurrent: isCurrent, onPlay: video=> play(video.id), onDone: ()=>{
                setStatus('')
                focusFresh()
            }})

            return Promise.resolve()
        }

        if(section == 'search'){
            if(!query){
                setStatus(Lang.translate('videos_search_hint'))
                return Promise.resolve()
            }

            setStatus(Lang.translate('videos_loading'))
            return Client.search(query, region()).then(json=>{
                if(isCurrent()) showGrid(json.items)
            })
        }

        if(!connected()){
            showConnect()
            return Promise.resolve()
        }

        if(section == 'subs'){
            setStatus(Lang.translate('videos_loading'))
            return accessToken().then(token=> Client.feed(token)).then(json=>{
                if(isCurrent()) showGrid(json.items)
            })
        }

        return showYou(current)
    }

    function render(){
        markSections()

        load().catch(()=>{
            setStatus(Lang.translate('videos_network_error'))
            focusFresh()
        }).then(()=>{
            if(instance.activity) instance.activity.loader(false)
        })
    }

    function select(id){
        section = id

        if(id == 'search') return askQuery()

        render()
    }

    function askQuery(){
        Input.edit({
            title: Lang.translate('videos_search_title'),
            value: query,
            free: true,
            nosave: true
        }, value=>{
            query = value.trim()
            section = 'search'
            render()
        })
    }

    function build(){
        let tabs = sections.map(item=>`<button class="videos-page__tab selector" type="button" data-section="${item.id}">${Lang.translate(item.label)}</button>`).join('')

        html.append(`<nav class="videos-page__tabs">${tabs}</nav>
            <div class="videos-page__status"></div>
            <div class="videos-page__content"></div>`)

        html.find('.videos-page__tab').on('hover:enter click', event=> select($(event.currentTarget).data('section')))

        shell.on('hover:focus', '.selector', event=>{
            last = event.target

            scroll.update($(event.target), true)
        })

        scroll.minus()
        scroll.append(html)
        shell.prepend(scroll.render())
    }

    this.create = function(){
        this.activity.loader(true)
        build()
        render()

        return this.render()
    }

    this.start = function(){
        Controller.add('content', {
            link: this,
            toggle: ()=>{
                Controller.collectionSet(shell)
                Controller.collectionFocus(last || false, shell)
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else Controller.toggle('menu')
            },
            right: ()=> Navigator.move('right'),
            up: ()=>{
                if(Navigator.canmove('up')) Navigator.move('up')
                else Controller.toggle('head')
            },
            down: ()=> Navigator.move('down'),
            back: ()=> Activity.backward()
        })

        Controller.toggle('content')
    }

    this.pause = function(){}
    this.stop = function(){}
    this.render = function(){
        return shell
    }

    this.destroy = function(){
        destroyed = true
        requestId++

        scroll.destroy()
        shell.remove()
    }
}

export default component

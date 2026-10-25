import Controller from '../core/controller'
import Emit from '../utils/emit'
import Api from '../core/api/api'
import Lang from '../core/lang'
import Utils from '../utils/utils'
import Favorite from '../core/favorite'
import Router from '../core/router'
import Watch from './watch'
import Layer from '../core/layer'
import Extra from '../utils/tmdb_extra'

/**
 * Apple TV-style hero for the top of Home: full-bleed backdrop, title,
 * overview and Watch / Details / Add to List. Rotates through the first few
 * titles of the first row. Speaks the same item API as a line (toggle, use,
 * render, destroy) so items/main can stack it above the rows.
 */
class Hero extends Emit{
    constructor(cards){
        super()

        this.cards = cards.filter(c=>c.backdrop_path).slice(0, 5)
        this.index = 0
        this.firstLoaded = false
        this.transitionId = 0
    }

    create(){
        this.html = $(`<div class="hero-tv">
            <div class="hero-tv__backdrop">
                <img class="hero-tv__backdrop--current" />
                <img class="hero-tv__backdrop--next" />
            </div>
            <div class="hero-tv__shade"></div>
            <div class="hero-tv__body">
                <div class="hero-tv__title"></div>
                <div class="hero-tv__meta"></div>
                <div class="hero-tv__descr"></div>
                <div class="hero-tv__controls">
                    <div class="hero-tv__buttons">
                        <button class="hero-tv__button hero-tv__button--watch selector" type="button"><svg aria-hidden="true"><use xlink:href="#sprite-play"></use></svg><span>${Lang.translate('hooktv_watch_now')}</span></button>
                        <button class="hero-tv__button hero-tv__button--list selector" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg><span></span></button>
                        <button class="hero-tv__button hero-tv__button--info selector" type="button"><span>${Lang.translate('hooktv_details')}</span></button>
                    </div>
                    <div class="hero-tv__dots"></div>
                </div>
            </div>
        </div>`)

        this.cards.forEach((c, i)=>{
            $(`<button class="hero-tv__dot" type="button" aria-label="Go to slide ${i + 1}" aria-current="false"></button>`)
                .on('click', ()=>i !== this.index && this.show(i))
                .appendTo(this.html.find('.hero-tv__dots'))
        })

        this.html.find('.hero-tv__button--watch').on('hover:enter', ()=>Watch.start(this.card(), 'items_line'))
        this.html.find('.hero-tv__button--info').on('hover:enter', ()=>{
            document.body.classList.add('page-transition-from-hero')
            Router.call('full', this.card())
            setTimeout(()=>document.body.classList.remove('page-transition-from-hero'), 700)
        })
        this.html.find('.hero-tv__button--list').on('hover:enter', ()=>{
            Favorite.toggle('book', this.card())

            this.listState()
        })

        this.html.find('.selector').on('hover:focus', (e)=>{
            this.last = e.target

            this.emit('active')
        })

        this.html.on('mousemove', (e)=>{
            if(!Controller.own(this) || !this.html.hasClass('hero-tv--loaded')) return
            if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

            const rect = this.html[0].getBoundingClientRect()
            const x = (e.clientX - rect.left) / rect.width - 0.5
            const y = (e.clientY - rect.top) / rect.height - 0.5

            this.html.find('.hero-tv__backdrop--current').css({
                transform: `scale(1.01) translate3d(${x * 6}px, ${y * 6}px, 0)`
            })
        })

        this.html.on('mouseleave', ()=>{
            if(this.html.hasClass('hero-tv--loaded')){
                this.html.find('.hero-tv__backdrop--current').css({
                    transform: ''
                })
            }
        })

        this.swipe()

        this.show(0)

        this.timer = setInterval(()=>{
            let paused = Controller.own(this)
            let now = Date.now()

            // freeze the slide clock while paused, in step with the dot's paused animation
            if(paused && this.shownAt) this.shownAt += now - (this.tickAt || now)

            this.tickAt = now

            this.html.toggleClass('hero-tv--paused', paused)

            if(!paused && !this.loading && this.cards.length > 1 && this.shownAt && Date.now() - this.shownAt >= 6000){
                this.show((this.index + 1) % this.cards.length)
            }
        }, 200)
    }

    card(){
        return this.cards[this.index]
    }

    step(by){
        if(this.cards.length < 2) return

        this.show((this.index + by + this.cards.length) % this.cards.length)
    }

    /**
     * Swipe or drag sideways to change slides. Touch and mouse events, not
     * pointer events, so older TV browsers get it too. A vertical move is left
     * to the page scroll, and the click that ends a drag never reaches a button.
     */
    swipe(){
        let root  = this.html[0]
        let image = this.html.find('.hero-tv__backdrop--current')
        let start = null
        let dragged = false

        let point = (e)=>e.touches ? e.touches[0] || e.changedTouches[0] : e

        let begin = (e)=>{
            if(this.cards.length < 2 || (e.button !== undefined && e.button !== 0)) return

            let p = point(e)

            start   = {x: p.clientX, y: p.clientY, axis: ''}
            dragged = false
        }

        let move = (e)=>{
            if(!start) return

            let p  = point(e)
            let dx = p.clientX - start.x
            let dy = p.clientY - start.y

            // decide once, after a few pixels, whether this is a swipe or a scroll
            if(!start.axis && Math.abs(dx) + Math.abs(dy) > 10) start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'

            if(start.axis != 'x') return

            dragged = true

            if(e.cancelable && !e.touches) e.preventDefault()

            image.css({transition: 'none', transform: `translate3d(${dx * 0.25}px, 0, 0) scale(1.02)`})
        }

        let end = (e)=>{
            if(!start) return

            let p  = point(e)
            let dx = p ? p.clientX - start.x : 0

            image.css({transition: '', transform: ''})

            if(start.axis == 'x' && Math.abs(dx) > Math.min(60, root.offsetWidth * 0.08)) this.step(dx < 0 ? 1 : -1)

            start = null
        }

        root.addEventListener('touchstart', begin, {passive: true})
        root.addEventListener('touchmove', move, {passive: true})
        root.addEventListener('touchend', end)
        root.addEventListener('touchcancel', ()=>{ start = null; image.css({transition: '', transform: ''}) })

        root.addEventListener('mousedown', begin)
        window.addEventListener('mousemove', this.mousemove = move)
        window.addEventListener('mouseup', this.mouseup = end)

        // a drag that ends over a button is not a press
        root.addEventListener('click', (e)=>{
            if(dragged){
                dragged = false
                e.stopPropagation()
                e.preventDefault()
            }
        }, true)

        this.html.find('img').attr('draggable', 'false')
    }

    show(index){
        let card = this.cards[index]

        if(!card) return

        this.loading = true
        let transitionId = ++this.transitionId

        let year  = ((card.release_date || card.first_air_date || '') + '').slice(0, 4)
        let meta  = [year, card.name ? Lang.translate('menu_tv') : Lang.translate('menu_movies')]
        let vote  = parseFloat(card.vote_average || 0)

        if(vote) meta.push('★ ' + vote.toFixed(1))

        let currentImg = this.html.find('.hero-tv__backdrop--current')
        let nextImg = this.html.find('.hero-tv__backdrop--next')

        let activateDot = (i = index)=>{
            this.html.find('.hero-tv__dot')
                .removeClass('active')
                .attr('aria-current', 'false')
                .eq(i)
                .addClass('active')
                .attr('aria-current', 'true')
        }

        if(!this.firstLoaded){
            this.firstLoaded = true
            this.index = index
            activateDot()
            this.shownAt = Date.now()

            this.html.find('.hero-tv__title').text(card.title || card.name)
            this.html.find('.hero-tv__meta').text(meta.filter(Boolean).join('  ·  '))
            this.html.find('.hero-tv__descr').text(card.overview || '')

            this.loadLogo(card)

            Utils.imgLoad(currentImg, Api.img(card.backdrop_path, 'w1280'), ()=>{
                if(transitionId !== this.transitionId) return

                this.loading = false
                this.html.addClass('hero-tv--loaded')
            }, ()=>{
                if(transitionId !== this.transitionId) return

                this.loading = false
                currentImg.removeAttr('src')
                this.html.addClass('hero-tv--loaded')
            })

            this.listState()
            return
        }

        nextImg.css({
            opacity: '',
            transform: ''
        })

        // switch the indicator on tap, not after the backdrop downloads
        activateDot()
        this.shownAt = Date.now()

        Utils.imgLoad(nextImg, Api.img(card.backdrop_path, 'w1280'), ()=>{
            if(transitionId !== this.transitionId) return

            this.index = index
            this.loading = false
            this.html.removeClass('hero-tv--loaded').addClass('hero-tv--swapping')

            setTimeout(()=>{
                if(transitionId !== this.transitionId) return

                this.html.find('.hero-tv__title').text(card.title || card.name)
                this.html.find('.hero-tv__meta').text(meta.filter(Boolean).join('  ·  '))
                this.html.find('.hero-tv__descr').text(card.overview || '')

                this.loadLogo(card)
            }, 150)

            this.listState()

            setTimeout(()=>{
                if(transitionId !== this.transitionId) return

                currentImg.attr('src', nextImg.attr('src'))
                currentImg.css('transform', '')
                nextImg.css({
                    opacity: '',
                    transform: ''
                })

                this.html.removeClass('hero-tv--swapping').addClass('hero-tv--loaded')
            }, 460)
        }, ()=>{
            if(transitionId !== this.transitionId) return

            this.loading = false
            activateDot(this.index)
            nextImg.css({
                opacity: '',
                transform: ''
            })
        })
    }

    loadLogo(card){
        if(Lampa.Storage && Lampa.Storage.get('logo_plugin_enabled') == '1') return

        Extra.get(card).then(extra=>{
            if(!extra || !extra.logo || this.card() !== card) return

            this.html.find('.hero-tv__title').empty().append($('<img class="hero-tv__logo">').attr({src: extra.logo, alt: card.title || card.name}))
        })
    }

    listState(){
        let added = Favorite.check(this.card()).book

        this.html.find('.hero-tv__button--list').toggleClass('active', Boolean(added)).find('span').text(Lang.translate(added ? 'hooktv_in_list' : 'hooktv_add_list'))
    }

    toggle(){
        Controller.add('items_line', {
            link: this,
            toggle: ()=>{
                Controller.collectionSet(this.html)
                Controller.collectionFocus(this.last || this.html.find('.hero-tv__button--watch')[0], this.html)

                this.emit('toggle')
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                // the side menu is hidden in the minimal layout: step back a slide instead
                else if(window.lampa_settings.minimal_ui) this.step(-1)
                else Controller.toggle('menu')
            },
            right: ()=>{
                if(Navigator.canmove('right')) Navigator.move('right')
                else this.step(1)
            },
            down: this.emit.bind(this, 'down'),
            up: this.emit.bind(this, 'up'),
            back: this.emit.bind(this, 'back')
        })

        Controller.toggle('items_line')
    }

    render(js){
        return js ? this.html[0] : this.html
    }

    destroy(){
        clearInterval(this.timer)
        window.removeEventListener('mousemove', this.mousemove)
        window.removeEventListener('mouseup', this.mouseup)
        this.transitionId++

        this.html.remove()
    }
}

/**
 * Module for an items/main page: puts a Hero built from the first row with
 * artwork above the rows. While the page is active the content runs under
 * the glass bar (body.hero--page).
 */
Hero.module = {
    onBuild: function(data){
        let first = data.find(row=>row.results && row.results.filter(c=>c.backdrop_path).length)

        if(!first || this.hero) return

        let hero = this.hero = new Hero(first.results)

        hero.use({
            onDown: this.emit.bind(this, 'down'),
            onUp: this.emit.bind(this, 'up'),
            onBack: this.emit.bind(this, 'back'),
            onActive: ()=>this.active = 0,
            onToggle: ()=>this.scroll.update(hero.render(true))
        })

        hero.create()

        this.scroll.body(true).prepend(hero.render(true))
        this.scroll.render(true).classList.add('scroll--hero')

        // the scroll was sized before it became a hero; resize it to full screen
        Layer.update(this.scroll.render(true))

        this.items.unshift(hero)

        document.body.classList.add('hero--page')
    },
    onStart: function(){
        document.body.classList.toggle('hero--page', Boolean(this.hero))
    },
    onPause: function(){
        document.body.classList.remove('hero--page')
    },
    onDestroy: function(){
        document.body.classList.remove('hero--page')
    }
}

export default Hero

import Template from '../../interaction/template'
import Controller from '../../core/controller'
import Utils from '../../utils/utils'
import Api from '../../core/api/api'
import Arrays from '../../utils/arrays'
import Storage from '../../core/storage/storage'
import Lang from '../../core/lang'
import Emit from '../../utils/emit'
import TMDB from '../../core/api/sources/tmdb'
import Permit from '../../core/account/permit'

import Options from './start/options'
import Torrents from './start/torrents'
import Poster from './start/poster'
import Bookmarks from './start/bookmarks'
import Buttons from './start/buttons'
import Extra from '../../utils/tmdb_extra'

class Start extends Emit {
    constructor(data) {
        super()

        this.data  = data
        this.card  = data.movie

        Arrays.extend(this.card,{
            title: this.card.name,
            original_title: this.card.original_name,
            runtime: 0,
            img: this.card.poster_path ? Api.img(this.card.poster_path, Storage.field('poster_size')).replace(/\/w\d{1,4}/,'/w500') : './img/img_broken.svg'
        })

        Utils.canWatchChildren(TMDB.parsePG(data.movie), Permit.profile.age) && this.use(Torrents)

        this.use(Options)
        this.use(Poster)
        this.use(Bookmarks)
        this.use(Buttons)

        this.emit('init')
    }


    create(){
        let genres      = (this.card.genres || ['---']).slice(0,3).map(a => Utils.capitalizeFirstLetter(a.name)).join(', ')
        let countries   = TMDB.parseCountries(this.card)
        let seasons     = Utils.countSeasons(this.card)
        let tmdb_rating = parseFloat((this.card.vote_average || 0) +'').toFixed(1)

        let relise  = (this.card.release_date || this.card.first_air_date || '') + ''
        let year    = relise ? relise.slice(0,4) : ''
        let quality = !this.card.first_air_date ? this.card.release_quality || this.card.quality : false
        let pg      = TMDB.parsePG(this.card)
        let head    = []
        let info    = []

        if(tmdb_rating >= 10) tmdb_rating = 10

        this.html = Template.get('full_start_new',{
            title: this.card.title,
            original_title: this.card.original_title,
            descr: Utils.substr(this.card.overview || Lang.translate('full_notext'), 420),
            time: Utils.secondsToTime(this.card.runtime * 60, true),
            genres: Utils.substr(genres, 30),
            rating: tmdb_rating,
            seasons: seasons,
            countries: countries.join(', '),
            episodes: this.card.number_of_episodes,
            tagline: this.card.tagline
        })

        !window.lampa_settings.torrents_use && this.html.find('.view--torrent').addClass('hide')

        this.card.name && this.html.find('.full-start-new__poster').addClass('card--tv').append('<div class="card__type">TV</div>')
        this.card.adult && this.html.find('.full-start-new__poster').addClass('card--adult').append('<div class="card__type">ADULT</div>')

        // the release year and the countries sit in the rate line, each in its own chip
        if(year) this.html.find('.full-start__year').removeClass('hide').text(year)

        // each country is its own chip in the rate line
        countries.slice(0,5).forEach(c=>this.html.find('.full-start-new__rate-line').append($('<div class="full-start__country hk-chip"></div>').text(c)))


        !this.card.tagline && this.html.find('.full--tagline').remove()

        if(!this.card.tagline && this.card.title.length > 25) this.html.find('.full-start-new__title').addClass('twolines')

        // title logo in the interface language when TMDB has one (full card already carries its images)
        let logo = this.card.images ? Extra.pickLogo(this.card.images.logos, Storage.get('language', 'en')) : ''
        let showLogo = (src)=>src && this.html.find('.full-start-new__title').removeClass('twolines').addClass('full-start-new__title--logo').empty().append($('<img>').attr({src, alt: this.card.title}))

        if(logo) showLogo(logo)
        else Extra.get(this.card).then(extra=>extra && this.html && showLogo(extra.logo))


        seasons && info.push('<span>' + Lang.translate('title_seasons') + ': ' + seasons + '</span>')

        pg && this.html.find('.full-start__pg').removeClass('hide').text(pg)

        this.card.number_of_episodes && info.push('<span>'+Lang.translate('title_episodes') + ': ' + this.card.number_of_episodes + '</span>')

        !this.card.runtime && $('.tag--time', this.html).remove()
        
        this.card.number_of_seasons && this.html.find('.is--serial').removeClass('hide')

        this.card.vote_average == 0 && this.html.find('.rate--tmdb').addClass('hide')

        // the rating colour follows the score: strong, fair, weak
        let score = parseFloat(this.card.vote_average || 0)

        this.html.find('.rate--tmdb').addClass(score >= 7 ? 'rate--good' : score >= 5 ? 'rate--mid' : 'rate--bad')

        this.card.status && this.html.find('.full-start__status').removeClass('hide').text(Lang.translate('tv_status_' + this.card.status.toLowerCase().replace(/ /g,'_')))

        if(this.card.imdb_rating && parseFloat(this.card.imdb_rating) > 0){
            this.html.find('.rate--imdb').removeClass('hide').find('> div').eq(0).text(parseFloat(this.card.imdb_rating) >= 10 ? 10 : this.card.imdb_rating)
        }

        if(this.card.kp_rating && parseFloat(this.card.kp_rating) > 0){
            this.html.find('.rate--kp').removeClass('hide').find('> div').eq(0).text(parseFloat(this.card.kp_rating) >= 10 ? 10 : this.card.kp_rating)
        }

        // duration and genres share one chip row under the details line
        let chips = []

        if(this.card.runtime > 0) chips.push('<span class="full-start-new__runtime"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' + Utils.secondsToTime(this.card.runtime * 60, true) + '</span>')

        if(this.card.genres) this.card.genres.slice(0,5).forEach(a=>chips.push('<span class="hk-chip">' + Utils.capitalizeFirstLetter(a.name) + '</span>'))

        this.html.find('.full-start-new__genres').html(chips.join(''))

        if(quality){
            this.html.find('.tag--quality').removeClass('hide').find('> div').text(quality)
            
            info.push('<span>' + Lang.translate('player_quality') + ': ' + quality.toUpperCase() + '</span>')
        }

        if(this.card.next_episode_to_air){
            let air = Utils.parseToDate(this.card.next_episode_to_air.air_date)
            let now = Date.now()

            let day = Math.ceil((air.getTime() - now) / (24*60*60*1000))
            let txt = Lang.translate('full_next_episode')+': ' + Utils.parseTime(this.card.next_episode_to_air.air_date).short + ' / '+Lang.translate('full_episode_days_left')+': ' + day

            if(day > 0){
                $('.tag--episode', this.html).removeClass('hide').find('div').text(txt)

                info.push('<span>'+txt+'</span>')
            } 
        }

        this.html.find('.full-start-new__buttons .selector, .full-start-new__scroll').on('hover:focus hover:enter hover:hover hover:touch', (e)=>{
            this.last = e.target
        })
        
        this.html.find('.full-start-new__head').toggleClass('hide',!head.length).html(head.join(', '))
        this.html.find('.full-start-new__details').toggleClass('hide', !info.length).html(info.join('<span class="full-start-new__split">●</span>'))

        this.html.find('.full-start-new__scroll').on('hover:enter click', ()=>{
            let next = this.html[0].nextElementSibling
            let scroll = this.html.closest('.scroll')[0]

            if(next && scroll && scroll.Scroll) scroll.Scroll.update(next)
        })

        if(window.lampa_settings.read_only) this.html.find('.button--play').remove()

        this.emit('create')
    }

    toggle(){
        let controller = {
            link: this,
            toggle: ()=>{
                this.emit('groupButtons')
                
                Controller.collectionSet(this.html)
                Controller.collectionFocus(this.last || false, this.html)

                this.emit('toggle')
            },
            right: ()=>{
                Navigator.move('right')
            },
            left: ()=>{
                if(Navigator.canmove('left')) Navigator.move('left')
                else this.emit('left')
            },
            down: ()=>{
                if(Navigator.canmove('down')) Navigator.move('down')
                else this.emit('down')
            },
            up: ()=>{
                if(Navigator.canmove('up')) Navigator.move('up')
                else this.emit('up')
            },
            back: this.emit.bind(this, 'back'),
        }

        this.emit('controller', controller)

        Controller.add('full_start', controller)

        Controller.toggle('full_start')
    }

    render(js){
        return js ? this.html[0] : this.html
    }

    destroy(){

        this.html.remove()

        this.emit('destroy')
    }
}

export default Start
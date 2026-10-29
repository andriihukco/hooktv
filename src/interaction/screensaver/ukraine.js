import Utils from '../../utils/utils'
import Timer from '../../core/timer'
import Storage from '../../core/storage/storage'
import photos from './photos'
import weather from './weather'

/**
 * HOOK TV screensaver: a rotation of 4K Ukrainian landscapes. Slow Ken Burns slides with
 * the place and the photographer on the left, the clock on the right.
 */

let order = []

// a fresh shuffle each round, so no photo repeats until all were shown
function pick(){
    if(!order.length){
        order = photos.map((p, i)=>i)

        for(let i = order.length - 1; i > 0; i--){
            let j = Math.floor(Math.random() * (i + 1))
            let t = order[i]

            order[i] = order[j]
            order[j] = t
        }
    }

    return photos[order.pop()]
}

class Ukraine{
    constructor(){
        this.slide  = 'one'
        this.direct = ['lt','rt','br','lb','ct']
        this.tries  = 0
    }

    create(){
        this.html = $(`<div class="screensaver screensaver--ukraine">
            <div class="screensaver__slides">
                <img class="screensaver__slides-one" alt="" />
                <img class="screensaver__slides-two" alt="" />
            </div>
            <div class="screensaver__gradient"></div>
            <div class="screensaver__title">
                <div class="screensaver__title-name"></div>
                <div class="screensaver__title-tagline"></div>
            </div>
            <div class="screensaver__datetime">
                <div class="screensaver__datetime-time"><span class="time--clock"></span></div>
                <div class="screensaver__datetime-date"><span class="time--full"></span></div>
            </div>
            <div class="screensaver__weather"></div>
        </div>`)

        this.timer = ()=>this.next()

        Timer.add(25000, this.timer)

        this.time = Utils.time(this.html)

        // offline the strip stays empty, the photos and the clock carry on
        weather.load()
            .then(list => this.html.find('.screensaver__weather').html(weather.render(list)))
            .catch(()=>{})

        this.next()
    }

    next(){
        let photo = pick()
        let title = this.html.find('.screensaver__title')
        let to    = this.html.find('.screensaver__slides-' + (this.slide == 'one' ? 'two' : 'one'))[0]
        let uk    = Storage.get('language', 'uk') != 'en'

        to.onload = ()=>{
            this.tries = 0

            $(to).removeClass(this.direct.join(' ') + ' animate').addClass(this.direct[Math.floor(Math.random() * this.direct.length)])

            title.removeClass('visible')

            setTimeout(()=>{
                this.html.find('.screensaver__slides-' + this.slide).removeClass('visible')

                this.slide = this.slide == 'one' ? 'two' : 'one'

                $(to).addClass('visible').addClass('animate')

                title.find('.screensaver__title-name').text(uk ? photo.uk : photo.en)
                title.find('.screensaver__title-tagline').text((uk ? 'Фото: ' : 'Photo: ') + photo.author)
                title.addClass('visible')
            }, 100)
        }

        // a broken photo moves on to the next; offline, it stops after one round
        to.onerror = ()=>{
            if(++this.tries < photos.length) this.next()
        }

        to.src = photo.src
    }

    render(){
        return this.html
    }

    destroy(){
        Timer.remove(this.timer)

        this.time.destroy()

        this.html.remove()
    }
}

export default Ukraine

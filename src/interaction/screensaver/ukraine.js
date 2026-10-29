import Utils from '../../utils/utils'
import Timer from '../../core/timer'
import Storage from '../../core/storage/storage'
import Favorite from '../../core/favorite'
import Lang from '../../core/lang'
import photos from './photos'

/**
 * HOOK TV screensaver: a rotation of 4K Ukrainian landscapes. Slow Ken Burns slides with
 * the place and the photographer on the left, the clock on the right.
 */

let order = []
const widget_defaults = ['weather_combined', 'weather_forecast', 'clock', 'calendar', 'last_played', 'todo']
const widget_labels = {
    weather_combined: 'screensaver_widget_weather_combined',
    weather_forecast: 'screensaver_widget_weather_forecast',
    weather_current: 'screensaver_widget_weather_current',
    clock: 'screensaver_widget_clock',
    calendar: 'screensaver_widget_calendar',
    news: 'screensaver_widget_news',
    last_played: 'screensaver_widget_last_played',
    todo: 'screensaver_widget_todo',
    music: 'screensaver_widget_music'
}

function escapeHtml(value){
    return String(value || '').replace(/[&<>"']/g, char=>({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char])
}

function chosenWidgets(){
    return widget_defaults.map((fallback, i)=>({
        index: i + 1,
        type: Storage.field('screensaver_widget_' + (i + 1)) || fallback
    })).filter(widget=>widget.type != 'none')
}

function lastPlayed(){
    let favorites = Favorite.full()
    let id = favorites.history && favorites.history[0]

    return id && favorites.card && favorites.card.find(card=>card.id == id)
}

function tasks(){
    return String(Storage.field('screensaver_todo_list') || '')
        .split(/[,\n]+/)
        .map(task=>task.trim())
        .filter(Boolean)
        .slice(0, 5)
}

function clockWidget(){
    return `<div class="screensaver__clock">
        <div class="screensaver__clock-time"><span class="time--clock"></span></div>
        <div class="screensaver__clock-date"><span class="time--full"></span></div>
    </div>`
}

function currentWeather(data, compact, loading){
    if(!data || !data.current) return `<div class="screensaver__widget-empty">${Lang.translate(loading ? 'screensaver_weather_loading' : 'screensaver_weather_unavailable')}</div>`

    let current = data.current
    let code = Number(current.weather_code)
    let label = Lang.translate(weather.condition(code))
    let details = `<div class="screensaver__weather-details">
        <span>${Math.round(current.wind_speed_10m)} km/h ${Lang.translate('screensaver_weather_wind')}</span>
        <span>${Math.round(current.relative_humidity_2m)}% ${Lang.translate('screensaver_weather_humidity')}</span>
    </div>`

    if(compact) details = ''

    return `<div class="screensaver__weather-current">
        <div class="screensaver__weather-city">${escapeHtml(data.city)}</div>
        <div class="screensaver__weather-reading">
            <span class="screensaver__weather-temp">${Math.round(current.temperature_2m)}°</span>
            <span class="screensaver__weather-icon"><svg viewBox="0 0 24 24">${weather.icon(code)}</svg></span>
        </div>
        <div class="screensaver__weather-condition">${label}</div>
        ${details}
    </div>`
}

function hourlyWeather(data, loading){
    if(!data || !data.hours) return `<div class="screensaver__widget-empty">${Lang.translate(loading ? 'screensaver_weather_loading' : 'screensaver_weather_unavailable')}</div>`

    let hours = data.hours.slice(0, 4)

    if(!hours.length) return `<div class="screensaver__widget-empty">${Lang.translate('screensaver_weather_unavailable')}</div>`

    return `<div class="screensaver__weather-city">${escapeHtml(data.city)}</div>
        <div class="screensaver__forecast">${hours.map(item=>`
            <div class="screensaver__forecast-item">
                <span>${String(item.hour).padStart(2, '0')}:00</span>
                <svg viewBox="0 0 24 24">${weather.icon(item.kind == 'sun' ? 0 : item.kind == 'rain' ? 61 : item.kind == 'snow' ? 73 : item.kind == 'storm' ? 95 : 3)}</svg>
                <b>${item.temp}°</b>
            </div>`).join('')}
        </div>`
}

function weatherDetails(data, loading){
    if(!data || !data.current || !data.daily) return `<div class="screensaver__widget-empty">${Lang.translate(loading ? 'screensaver_weather_loading' : 'screensaver_weather_unavailable')}</div>`

    let current = data.current
    let daily = data.daily
    let code = Number(current.weather_code)

    return `<div class="screensaver__weather-city">${escapeHtml(data.city)}</div>
        <div class="screensaver__weather-reading">
            <span class="screensaver__weather-temp">${Math.round(current.temperature_2m)}°</span>
            <span class="screensaver__weather-icon"><svg viewBox="0 0 24 24">${weather.icon(code)}</svg></span>
        </div>
        <div class="screensaver__weather-condition">${Lang.translate(weather.condition(code))}</div>
        <div class="screensaver__weather-details">
            <span>${Lang.translate('screensaver_weather_feels')} ${Math.round(current.apparent_temperature)}°</span>
            <span>${Lang.translate('screensaver_weather_high_low')} ${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°</span>
        </div>`
}

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
        this.weatherData = false
        this.weatherLoading = true
        this.newsItems = false
        this.newsError = false
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
            <div class="screensaver__dashboard"></div>
        </div>`)

        this.timer = ()=>this.next()

        Timer.add(25000, this.timer)

        this.widgets = chosenWidgets()
        this.grid = this.html.find('.screensaver__dashboard')
        this.grid.addClass('screensaver__dashboard--columns-' + (Storage.field('screensaver_grid') == '2' ? '2' : '3'))

        this.widgets.forEach(widget=>{
            let card = $(`<section class="screensaver__widget screensaver__widget--${widget.type}" data-widget="${widget.index}">
                <div class="screensaver__widget-title"></div>
                <div class="screensaver__widget-content"></div>
            </section>`)

            card.find('.screensaver__widget-title').text(Lang.translate(widget_labels[widget.type] || 'screensaver_widget_none'))
            this.grid.append(card)
        })

        this.updateWidgets()
        this.time = Utils.time(this.html)

        if(this.widgets.some(widget=>widget.type.indexOf('weather_') === 0)){
            weather.load(Storage.field('screensaver_location'))
                .then(data=>{
                    if(this.destroyed) return

                    this.weatherData = data
                    this.weatherLoading = false
                    this.updateWidgets()
                })
                .catch(error=>{
                    if(this.destroyed) return

                    console.error('Screensaver weather request failed:', error.message)
                    this.weatherLoading = false
                    this.updateWidgets()
                })
        }

        if(this.widgets.some(widget=>widget.type == 'news')) this.loadNews()

        this.next()
    }

    updateWidgets(){
        if(!this.grid) return

        this.widgets.forEach(widget=>{
            let cell = this.grid.find('[data-widget="' + widget.index + '"] .screensaver__widget-content')

            if(widget.type == 'clock' && cell.find('.time--clock').length) return

            let content = ''

            if(widget.type == 'weather_current') content = currentWeather(this.weatherData, true, this.weatherLoading)
            else if(widget.type == 'weather_forecast') content = hourlyWeather(this.weatherData, this.weatherLoading)
            else if(widget.type == 'weather_combined') content = weatherDetails(this.weatherData, this.weatherLoading)
            else if(widget.type == 'clock') content = clockWidget()
            else if(widget.type == 'calendar'){
                let date = new Intl.DateTimeFormat(Storage.get('language', 'en'), {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                }).format(new Date())

                content = `<div class="screensaver__calendar-date">${escapeHtml(date)}</div>`
            }
            else if(widget.type == 'news'){
                if(this.newsError) content = `<div class="screensaver__widget-empty">${Lang.translate('screensaver_news_unavailable')}</div>`
                else if(this.newsItems && this.newsItems.length) content = `<div class="screensaver__news">${this.newsItems.map(item=>`<div>${escapeHtml(item)}</div>`).join('')}</div>`
                else content = `<div class="screensaver__widget-empty">${Lang.translate('screensaver_news_empty')}</div>`
            }
            else if(widget.type == 'last_played'){
                let card = lastPlayed()

                content = card
                    ? `<div class="screensaver__last-title">${escapeHtml(card.title || card.name)}</div><div class="screensaver__last-subtitle">${escapeHtml(card.original_name || card.original_title || '')}</div>`
                    : `<div class="screensaver__widget-empty">${Lang.translate('screensaver_last_empty')}</div>`
            }
            else if(widget.type == 'todo'){
                let list = tasks()

                content = list.length
                    ? `<div class="screensaver__todo">${list.map(task=>`<div><span></span>${escapeHtml(task)}</div>`).join('')}</div>`
                    : `<div class="screensaver__widget-empty">${Lang.translate('screensaver_todo_empty')}</div>`
            }
            else if(widget.type == 'music'){
                let track = Storage.get('music_last_track', false)

                content = track && track.title
                    ? `<div class="screensaver__music-title">${escapeHtml(track.title)}</div><div class="screensaver__music-artist">${escapeHtml(track.artist || '')}</div>`
                    : `<div class="screensaver__widget-empty">${Lang.translate('screensaver_music_empty')}</div>`
            }

            cell.html(content)
        })
    }

    loadNews(){
        let value = String(Storage.field('screensaver_news_url') || '').trim()

        if(!value) return

        let url

        try{
            url = new URL(value)
        }
        catch(error){
            console.error('Screensaver news feed URL is invalid:', error.message)
            this.newsError = true
            this.updateWidgets()
            return
        }

        if(url.protocol != 'https:' && url.protocol != 'http:'){
            console.error('Screensaver news feed must use HTTP or HTTPS')
            this.newsError = true
            this.updateWidgets()
            return
        }

        fetch(url.toString())
            .then(response=>{
                if(!response.ok) throw new Error(`News feed request failed (${response.status})`)

                return response.text()
            })
            .then(text=>{
                let document = new DOMParser().parseFromString(text, 'application/xml')

                if(document.querySelector('parsererror')) throw new Error('News feed is not valid XML')

                this.newsItems = Array.from(document.querySelectorAll('item > title'))
                    .map(item=>item.textContent.trim())
                    .filter(Boolean)
                    .slice(0, 3)

                if(!this.newsItems.length) throw new Error('News feed has no headline items')

                if(!this.destroyed) this.updateWidgets()
            })
            .catch(error=>{
                if(this.destroyed) return

                console.error('Screensaver news feed request failed:', error.message)
                this.newsError = true
                this.updateWidgets()
            })
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
        this.destroyed = true

        Timer.remove(this.timer)

        this.time.destroy()

        this.html.remove()
    }
}

export default Ukraine

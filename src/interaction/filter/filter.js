import Template from '../template'
import Controller from '../../core/controller'
import Lang from '../../core/lang'
import Storage from '../../core/storage/storage'
import TMDB from '../../core/api/sources/tmdb'

let html
let filterState = {
    genres: [],
    rating: { min: 0, max: 8 },
    countries: [],
    years: { min: 1900, max: new Date().getFullYear() }
}

const GENRES = {
    movie: [
        {id: 28, name: "#{filter_genre_ac}"},
        {id: 12, name: "#{filter_genre_ad}"},
        {id: 16, name: "#{filter_genre_mv}"},
        {id: 35, name: "#{filter_genre_cm}"},
        {id: 80, name: "#{filter_genre_cr}"},
        {id: 99, name: "#{filter_genre_dc}"},
        {id: 18, name: "#{filter_genre_dr}"},
        {id: 10751, name: "#{filter_genre_fm}"},
        {id: 14, name: "#{filter_genre_fe}"},
        {id: 36, name: "#{filter_genre_hi}"},
        {id: 27, name: "#{filter_genre_ho}"},
        {id: 10402, name: "#{filter_genre_mu}"},
        {id: 9648, name: "#{filter_genre_de}"},
        {id: 10749, name: "#{filter_genre_md}"},
        {id: 878, name: "#{filter_genre_fa}"},
        {id: 10770, name: "#{filter_genre_tv}"},
        {id: 53, name: "#{filter_genre_tr}"},
        {id: 10752, name: "#{filter_genre_mi}"},
        {id: 37, name: "#{filter_genre_ve}"}
    ],
    tv: [
        {id: 10759, name: "#{filter_genre_aa}"},
        {id: 16, name: "#{filter_genre_mv}"},
        {id: 35, name: "#{filter_genre_cm}"},
        {id: 80, name: "#{filter_genre_cr}"},
        {id: 99, name: "#{filter_genre_dc}"},
        {id: 18, name: "#{filter_genre_dr}"},
        {id: 10751, name: "#{filter_genre_fm}"},
        {id: 10762, name: "#{filter_genre_ch}"},
        {id: 9648, name: "#{filter_genre_de}"},
        {id: 10763, name: "#{filter_genre_nw}"},
        {id: 10764, name: "#{filter_genre_rs}"},
        {id: 10765, name: "#{filter_genre_hf}"},
        {id: 10766, name: "#{filter_genre_op}"},
        {id: 10767, name: "#{filter_genre_tc}"},
        {id: 10768, name: "#{filter_genre_mp}"},
        {id: 37, name: "#{filter_genre_ve}"}
    ]
}

const COUNTRIES = [
    {code: 'US', name: 'United States'},
    {code: 'GB', name: 'United Kingdom'},
    {code: 'CA', name: 'Canada'},
    {code: 'FR', name: 'France'},
    {code: 'DE', name: 'Germany'},
    {code: 'JP', name: 'Japan'},
    {code: 'KR', name: 'South Korea'},
    {code: 'IT', name: 'Italy'},
    {code: 'ES', name: 'Spain'},
    {code: 'RU', name: 'Russia'},
    {code: 'UA', name: 'Ukraine'},
    {code: 'IN', name: 'India'},
    {code: 'BR', name: 'Brazil'},
    {code: 'AU', name: 'Australia'},
    {code: 'MX', name: 'Mexico'}
]

function init(type = 'movie'){
    html = Template.get('filter')

    renderGenres(type)
    renderCountries()
    renderYears()
    renderRating()

    html.find('.filter__close').on('hover:enter click', (e)=>{
        if(DeviceInput.canClick(e.originalEvent)) close()
    })

    html.find('.filter__apply').on('hover:enter click', (e)=>{
        if(DeviceInput.canClick(e.originalEvent)) apply()
    })

    html.find('.filter__reset').on('hover:enter click', (e)=>{
        if(DeviceInput.canClick(e.originalEvent)) reset()
    })
}

function renderGenres(type){
    const genres = GENRES[type] || GENRES.movie
    const container = html.find('.filter__genres')

    genres.forEach(genre => {
        const isSelected = filterState.genres.includes(genre.id)
        const item = $(`
            <div class="filter__item selector ${isSelected ? 'selected' : ''}" data-id="${genre.id}">
                <div class="filter__checkbox"></div>
                <div class="filter__label">${Lang.translate(genre.name)}</div>
            </div>
        `)

        item.on('hover:enter click', (e)=>{
            if(DeviceInput.canClick(e.originalEvent)){
                toggleGenre(genre.id, item)
            }
        })

        container.append(item)
    })
}

function renderCountries(){
    const container = html.find('.filter__countries')

    COUNTRIES.forEach(country => {
        const isSelected = filterState.countries.includes(country.code)
        const item = $(`
            <div class="filter__item selector ${isSelected ? 'selected' : ''}" data-code="${country.code}">
                <div class="filter__checkbox"></div>
                <div class="filter__label">${country.name}</div>
            </div>
        `)

        item.on('hover:enter click', (e)=>{
            if(DeviceInput.canClick(e.originalEvent)){
                toggleCountry(country.code, item)
            }
        })

        container.append(item)
    })
}

function renderYears(){
    const container = html.find('.filter__years')
    const currentYear = new Date().getFullYear()

    container.html(`
        <div class="filter__range">
            <div class="filter__range-label">${Lang.translate('filter_year')}</div>
            <div class="filter__range-inputs">
                <input type="number" class="filter__range-min" value="${filterState.years.min}" min="1900" max="${currentYear}" />
                <span>-</span>
                <input type="number" class="filter__range-max" value="${filterState.years.max}" min="1900" max="${currentYear}" />
            </div>
        </div>
    `)

    container.find('.filter__range-min').on('change', (e)=>{
        filterState.years.min = parseInt(e.target.value) || 1900
    })

    container.find('.filter__range-max').on('change', (e)=>{
        filterState.years.max = parseInt(e.target.value) || currentYear
    })
}

function renderRating(){
    const container = html.find('.filter__rating')

    container.html(`
        <div class="filter__range">
            <div class="filter__range-label">${Lang.translate('filter_rating')}</div>
            <div class="filter__range-inputs">
                <input type="number" class="filter__range-min" value="${filterState.rating.min}" min="0" max="8" step="0.1" />
                <span>-</span>
                <input type="number" class="filter__range-max" value="${filterState.rating.max}" min="0" max="8" step="0.1" />
            </div>
        </div>
    `)

    container.find('.filter__range-min').on('change', (e)=>{
        filterState.rating.min = parseFloat(e.target.value) || 0
    })

    container.find('.filter__range-max').on('change', (e)=>{
        filterState.rating.max = Math.min(parseFloat(e.target.value) || 8, 8)
    })
}

function toggleGenre(id, element){
    const index = filterState.genres.indexOf(id)
    if(index > -1){
        filterState.genres.splice(index, 1)
        element.removeClass('selected')
    } else {
        filterState.genres.push(id)
        element.addClass('selected')
    }
}

function toggleCountry(code, element){
    const index = filterState.countries.indexOf(code)
    if(index > -1){
        filterState.countries.splice(index, 1)
        element.removeClass('selected')
    } else {
        filterState.countries.push(code)
        element.addClass('selected')
    }
}

function apply(){
    Storage.set('filter_state', JSON.stringify(filterState))
    close()
}

function reset(){
    filterState = {
        genres: [],
        rating: { min: 0, max: 8 },
        countries: [],
        years: { min: 1900, max: new Date().getFullYear() }
    }
    Storage.set('filter_state', JSON.stringify(filterState))
    close()
}

function close(){
    html.removeClass('open')
    setTimeout(()=>{
        html.remove()
    }, 300)
}

function open(type = 'movie'){
    const saved = Storage.get('filter_state')
    if(saved){
        try{
            filterState = JSON.parse(saved)
        } catch(e){
            console.error('Failed to parse filter state', e)
        }
    }

    init(type)
    $('body').append(html)

    setTimeout(()=>{
        html.addClass('open')
    }, 10)
}

function getState(){
    return filterState
}

export default {
    open,
    close,
    getState,
    render: (js) => js ? html[0] : html
}

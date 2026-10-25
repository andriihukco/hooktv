import Api from '../../core/api/api'
import Peek from './peek'

export default function addCardDetails(card, data){
    let view = card.querySelector('.card__view')

    if(!view) return

    let title = data.title || data.name || ''
    let release_year = ((data.release_date || data.first_air_date || '') + '').slice(0, 4)
    let genres = Array.isArray(data.genres)
        ? data.genres.map(genre => typeof genre == 'string' ? genre : genre?.name).filter(Boolean)
        : []

    if(!genres.length && Array.isArray(data.genre_ids)){
        let type = data.media_type

        if(type != 'movie' && type != 'tv') type = data.name || data.first_air_date ? 'tv' : 'movie'

        genres = Api.sources.tmdb.getGenresNameFromIds(type, data.genre_ids)
    }

    let details = document.createElement('div')
        details.className = 'card__hover-info'

    if(title){
        let title_elem = document.createElement('div')
            title_elem.className = 'card__hover-title'
            title_elem.innerText = title

        details.appendChild(title_elem)
    }

    let metadata = [release_year, genres.join(' · ')].filter(Boolean).join(' · ')

    if(metadata){
        let metadata_elem = document.createElement('div')
            metadata_elem.className = 'card__hover-meta'
            metadata_elem.innerText = metadata

        details.appendChild(metadata_elem)
    }

    if(data.overview){
        let description = document.createElement('div')
            description.className = 'card__hover-description'
            description.innerText = data.overview

        details.appendChild(description)
    }

    view.appendChild(details)
    card.classList.add('card--details-overlay')

    Peek.init()
}

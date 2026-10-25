import Lang from '../../core/lang'
import TMDB from '../../core/api/sources/tmdb'

/**
 * HOOK TV: the first Tastes step, drawn in the Settings panel. Each section is a Settings
 * title over a rounded group of chips. Everything is a .selector so remotes can reach it.
 */

const COUNTRIES = ['US', 'GB', 'FR', 'DE', 'IT', 'ES', 'JP', 'KR', 'UA', 'CN', 'IN', 'RU']
const RATINGS   = [0, 6, 7, 8]

function countryName(code){
    try {
        return new Intl.DisplayNames([navigator.language || 'en'], {type: 'region'}).of(code) || code
    }
    catch(e){
        return code
    }
}

function chip(label, active, onToggle){
    let node = $('<div class="selector tastes-chip"></div>').text(label)

    if(active) node.addClass('tastes-chip--active')

    node.on('hover:enter', ()=>{
        node.toggleClass('tastes-chip--active')
        onToggle(node.hasClass('tastes-chip--active'))
    })

    return node
}

/**
 * A Settings-style section: the title row, then a rounded group. Returns the group.
 */
function section(html, title){
    html.append($('<div class="settings-param-title"></div>').append($('<span></span>').text(Lang.translate(title))))

    let group = $('<div class="tastes-group"></div>')

    html.append(group)

    return group
}

/**
 * @param {object} profile - the saved or in-progress profile
 * @param {function} onNext - called with {genres, countries, actors, min_rating}
 * @returns {jQuery}
 */
function render(profile, onNext){
    let sel = {
        genres: profile.genres.slice(),
        countries: profile.countries.slice(),
        actors: profile.actors.slice(),
        min_rating: profile.min_rating
    }

    let html = $('<div class="tastes-pick"></div>')

    // genres: movie and tv lists merged, one chip per id
    let genre_row = section(html, 'tastes_genres')

    TMDB.get('genre/movie/list', {}, (movie)=>{
        TMDB.get('genre/tv/list', {}, (tv)=>{
            let all = (movie.genres || []).concat(tv.genres || [])
            let seen = {}

            all.forEach(g=>{
                if(seen[g.id]) return

                seen[g.id] = true

                genre_row.append(chip(g.name, sel.genres.indexOf(g.id) >= 0, (on)=>{
                    sel.genres = on ? sel.genres.concat(g.id) : sel.genres.filter(id=>id != g.id)
                }))
            })
        }, ()=>{})
    }, ()=>{})

    // countries: names come from the browser, so they match the interface language
    let country_row = section(html, 'tastes_countries')

    COUNTRIES.forEach(code=>{
        country_row.append(chip(countryName(code), sel.countries.indexOf(code) >= 0, (on)=>{
            sel.countries = on ? sel.countries.concat(code) : sel.countries.filter(c=>c != code)
        }))
    })

    // minimum rating: one choice, 0 means off
    let rating_row = section(html, 'tastes_min_rating')

    RATINGS.forEach(value=>{
        let node = $('<div class="selector tastes-chip"></div>')
            .text(value ? value + '+' : Lang.translate('tastes_rating_any'))
            .toggleClass('tastes-chip--active', sel.min_rating == value)

        node.on('hover:enter', ()=>{
            sel.min_rating = value

            rating_row.children().removeClass('tastes-chip--active')
            node.addClass('tastes-chip--active')
        })

        rating_row.append(node)
    })

    // actors: search by name, toggle the people you want
    let actors = section(html, 'tastes_actors')
    let search = $('<input class="tastes-pick__input" type="text" />').attr('placeholder', Lang.translate('tastes_actor_search'))
    let found  = $('<div class="tastes-pick__found"></div>')

    actors.append(search, found)

    let timer
    search.on('input', ()=>{
        clearTimeout(timer)

        timer = setTimeout(()=>{
            let query = search.val().trim()

            found.empty()

            if(!query) return

            TMDB.get('search/person', {query}, (json)=>{
                (json.results || []).slice(0, 8).forEach(person=>{
                    let on = sel.actors.some(a=>a.id == person.id)

                    found.append(chip(person.name, on, (state)=>{
                        sel.actors = state
                            ? sel.actors.concat({id: person.id, name: person.name})
                            : sel.actors.filter(a=>a.id != person.id)
                    }))
                })
            }, ()=>{})
        }, 400)
    })

    // the action row is a Settings row, so it reads like the rest of the panel
    let next = $('<div class="selector settings-param tastes-action"></div>').text(Lang.translate('tastes_next'))

    next.on('hover:enter', ()=>onNext(sel))

    html.append(next)

    return html
}

export default {render}

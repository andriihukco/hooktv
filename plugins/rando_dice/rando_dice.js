function startPlugin(){
    if(window.rando_dice_ready) return

    window.rando_dice_ready = true

    let component = 'rando_dice'

    let manifest = {
        type: 'video',
        version: '1.0.0',
        name: 'Rando Dice',
        description: 'Header dice button that opens a random top-rated title.',
        component: component
    }

    Lampa.Manifest.plugins = manifest

    let loading = false

    let settings = {
        media: 'rando_dice_media',
        sort: 'rando_dice_sort',
        minRating: 'rando_dice_min_rating',
        maxRating: 'rando_dice_max_rating',
        minVotes: 'rando_dice_min_votes',
        movieGenre: 'rando_dice_movie_genre',
        tvGenre: 'rando_dice_tv_genre',
        withoutGenre: 'rando_dice_without_genre',
        yearFrom: 'rando_dice_year_from',
        yearTo: 'rando_dice_year_to',
        maxPages: 'rando_dice_max_pages',
        requirePoster: 'rando_dice_require_poster',
        includeAdult: 'rando_dice_include_adult'
    }

    let movieGenres = {
        '': 'Any',
        '28': 'Action',
        '12': 'Adventure',
        '16': 'Animation',
        '35': 'Comedy',
        '80': 'Crime',
        '99': 'Documentary',
        '18': 'Drama',
        '10751': 'Family',
        '14': 'Fantasy',
        '36': 'History',
        '27': 'Horror',
        '10402': 'Music',
        '9648': 'Mystery',
        '10749': 'Romance',
        '878': 'Science Fiction',
        '10770': 'TV Movie',
        '53': 'Thriller',
        '10752': 'War',
        '37': 'Western'
    }

    let tvGenres = {
        '': 'Any',
        '10759': 'Action & Adventure',
        '16': 'Animation',
        '35': 'Comedy',
        '80': 'Crime',
        '99': 'Documentary',
        '18': 'Drama',
        '10751': 'Family',
        '10762': 'Kids',
        '9648': 'Mystery',
        '10763': 'News',
        '10764': 'Reality',
        '10765': 'Sci-Fi & Fantasy',
        '10766': 'Soap',
        '10767': 'Talk',
        '10768': 'War & Politics',
        '37': 'Western'
    }

    function yearValues(){
        let values = {
            '0': 'Any'
        }

        for(let year = new Date().getFullYear(); year >= 1900; year -= 5){
            values[year + ''] = year + ''
        }

        return values
    }

    function random(max){
        return Math.floor(Math.random() * max)
    }

    function storage(name, value){
        return Lampa.Storage.get(name, value)
    }

    function number(name, fallback, min, max){
        let value = parseFloat(storage(name, fallback))

        if(isNaN(value)) value = fallback
        if(typeof min == 'number') value = Math.max(min, value)
        if(typeof max == 'number') value = Math.min(max, value)

        return value
    }

    function chooseMethod(){
        let media = storage(settings.media, 'mixed')

        if(media == 'movie' || media == 'tv') return media

        return random(2) ? 'movie' : 'tv'
    }

    function addFilter(filter, name, value){
        if(value !== '' && typeof value !== 'undefined') filter[name] = value
    }

    function sortBy(method){
        let sort = storage(settings.sort, 'vote_average.desc')

        if(method == 'tv' && sort == 'release_date.desc') return 'first_air_date.desc'
        if(method == 'movie' && sort == 'first_air_date.desc') return 'release_date.desc'

        return sort
    }

    function createFilter(method){
        let filter = {
            sort_by: sortBy(method),
            include_adult: storage(settings.includeAdult, 'false') == 'true' ? 'true' : 'false'
        }

        let minRating = number(settings.minRating, 7.5, 0, 10)
        let maxRating = number(settings.maxRating, 10, 0, 10)
        let minVotes  = number(settings.minVotes, 500, 0)
        let yearFrom  = number(settings.yearFrom, 0, 0, 3000)
        let yearTo    = number(settings.yearTo, 0, 0, 3000)
        let genre     = storage(method == 'movie' ? settings.movieGenre : settings.tvGenre, '')

        addFilter(filter, 'vote_average.gte', minRating)
        addFilter(filter, 'vote_average.lte', Math.max(minRating, maxRating))
        addFilter(filter, 'vote_count.gte', minVotes)
        addFilter(filter, 'with_genres', genre)
        addFilter(filter, 'without_genres', storage(settings.withoutGenre, ''))

        if(yearFrom){
            addFilter(filter, method == 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte', yearFrom + '-01-01')
        }

        if(yearTo){
            addFilter(filter, method == 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte', yearTo + '-12-31')
        }

        return filter
    }

    function randomPage(){
        return random(number(settings.maxPages, 10, 1, 500)) + 1
    }

    function pickItem(items){
        let filtered = items.filter((item)=>{
            let hasPoster = storage(settings.requirePoster, 'true') !== 'true' || item.poster_path

            return item && item.id && (item.title || item.name) && hasPoster
        })

        return filtered[random(filtered.length)]
    }

    function openCard(card, method){
        card.source = card.source || 'tmdb'

        Lampa.Activity.push({
            url: card.url,
            component: 'full',
            id: card.id,
            method: method,
            card: card,
            source: 'tmdb'
        })
    }

    function showError(){
        Lampa.Noty.show('Rando Dice: no title matched these filters')
    }

    function loadRandom(attempts){
        let method = chooseMethod()
        let page   = randomPage()

        Lampa.Api.sources.tmdb.get('discover/' + method, {
            page: page,
            filter: createFilter(method)
        }, (json)=>{
            let total = Math.min(json.total_pages || page, number(settings.maxPages, 10, 1, 500))
            let card  = pickItem(json.results || [])

            if(!card && total && page > total){
                return loadRandom(attempts - 1)
            }

            if(card){
                loading = false

                Lampa.Loading.stop()
                openCard(card, method)
            }
            else if(attempts > 1) loadRandom(attempts - 1)
            else{
                loading = false

                Lampa.Loading.stop()
                showError()
            }
        }, ()=>{
            if(attempts > 1) loadRandom(attempts - 1)
            else{
                loading = false

                Lampa.Loading.stop()
                showError()
            }
        }, {life: 60 * 24})
    }

    function roll(){
        if(loading) return

        loading = true

        Lampa.Loading.start(()=>{
            loading = false
        })

        loadRandom(6)
    }

    function add(){
        if(Lampa.Head.render().find('.open--rando-dice').length) return

        let icon = `<svg viewBox="0 0 48 48" fill="none">
            <rect x="8" y="8" width="32" height="32" rx="7" stroke="currentColor" stroke-width="4"/>
            <circle cx="17" cy="17" r="3" fill="currentColor"/>
            <circle cx="24" cy="24" r="3" fill="currentColor"/>
            <circle cx="31" cy="31" r="3" fill="currentColor"/>
        </svg>`

        Lampa.Head.addIcon(icon, roll).addClass('open--rando-dice')
    }

    function addParam(name, type, values, valueDefault, field, description){
        Lampa.SettingsApi.addParam({
            component: component,
            param: {
                name: name,
                type: type,
                values: values || '',
                default: valueDefault
            },
            field: {
                name: field,
                description: description
            }
        })
    }

    function addTitle(title){
        Lampa.SettingsApi.addParam({
            component: component,
            param: {
                type: 'title'
            },
            field: {
                name: title
            }
        })
    }

    function addSettings(){
        Lampa.SettingsApi.addComponent({
            component: component,
            icon: `<svg viewBox="0 0 48 48" fill="none">
                <rect x="8" y="8" width="32" height="32" rx="7" stroke="white" stroke-width="4"/>
                <circle cx="17" cy="17" r="3" fill="white"/>
                <circle cx="24" cy="24" r="3" fill="white"/>
                <circle cx="31" cy="31" r="3" fill="white"/>
            </svg>`,
            name: 'Rando Dice'
        })

        addTitle('Selection')

        addParam(settings.media, 'select', {
            mixed: 'Movies and TV',
            movie: 'Movies only',
            tv: 'TV only'
        }, 'mixed', 'Media type')

        addParam(settings.sort, 'select', {
            'vote_average.desc': 'Highest rating',
            'vote_count.desc': 'Most votes',
            'popularity.desc': 'Most popular',
            'release_date.desc': 'Newest movies',
            'first_air_date.desc': 'Newest TV'
        }, 'vote_average.desc', 'Sort order')

        addParam(settings.maxPages, 'select', {
            '1': 'Top 20',
            '3': 'Top 60',
            '5': 'Top 100',
            '10': 'Top 200',
            '20': 'Top 400',
            '50': 'Top 1000'
        }, '10', 'Random pool size')

        addTitle('Rating')

        addParam(settings.minRating, 'select', {
            '0': 'Any',
            '5': '5+',
            '6': '6+',
            '7': '7+',
            '7.5': '7.5+',
            '8': '8+',
            '8.5': '8.5+',
            '9': '9+'
        }, '7.5', 'Minimum rating')

        addParam(settings.maxRating, 'select', {
            '10': 'Any',
            '9.5': 'Up to 9.5',
            '9': 'Up to 9',
            '8.5': 'Up to 8.5',
            '8': 'Up to 8'
        }, '10', 'Maximum rating')

        addParam(settings.minVotes, 'select', {
            '0': 'Any',
            '50': '50+',
            '100': '100+',
            '250': '250+',
            '500': '500+',
            '1000': '1000+',
            '2500': '2500+',
            '5000': '5000+'
        }, '500', 'Minimum votes')

        addTitle('Genres')

        addParam(settings.movieGenre, 'select', movieGenres, '', 'Movie genre')
        addParam(settings.tvGenre, 'select', tvGenres, '', 'TV genre')
        addParam(settings.withoutGenre, 'select', Object.assign({}, movieGenres, {'': 'None'}), '', 'Exclude genre', 'Uses TMDB genre ids; shared ids work for both movies and TV.')

        addTitle('Dates')

        addParam(settings.yearFrom, 'select', yearValues(), '0', 'Year from')
        addParam(settings.yearTo, 'select', yearValues(), '0', 'Year to')

        addTitle('Quality')

        addParam(settings.requirePoster, 'trigger', '', true, 'Require poster')
        addParam(settings.includeAdult, 'trigger', '', false, 'Include adult results')

        Lampa.SettingsApi.addParam({
            component: component,
            param: {
                name: 'rando_dice_roll_now',
                type: 'button'
            },
            field: {
                name: 'Roll now'
            },
            onChange: roll
        })
    }

    if(window.appready) add()
    else{
        Lampa.Listener.follow('app', function(e){
            if(e.type == 'ready') add()
        })
    }

    addSettings()
}

startPlugin()

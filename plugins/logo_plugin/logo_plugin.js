function startPlugin() {
    'use strict'

    window.logo_plugin_ready = true

    // Add settings parameter
    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'logo_plugin_enabled',
            type: 'select',
            values: {
                1: 'Скрыть',
                0: 'Отображать'
            },
            default: '0'
        },
        field: {
            name: 'Логотипы вместо названий',
            description: 'Отображает логотипы фильмов вместо текста'
        }
    })

    // Add CSS styles
    $('body').append(`
        <style>
        @@include('../plugins/logo_plugin/css/style.css')
        </style>
    `)

    // Function to load and display logo
    function loadLogo(data, titleElement) {
        if (!data.id || !titleElement.length) return

        var type = data.name ? 'tv' : 'movie'
        var url = Lampa.TMDB.api(type + '/' + data.id + '/images?api_key=4ef0d7355d9ffb5151e987764708ce96&language=' + Lampa.Storage.get('language'))

        $.get(url, function(response) {
            if (response.logos && response.logos[0]) {
                var logo = response.logos[0].file_path

                if (logo != '') {
                    // Replace the title with logo image
                    titleElement.html(
                        '<img class="logo-plugin-image" src="' +
                        Lampa.TMDB.image('/t/p/w500' + logo.replace('.svg', '.png')) +
                        '" alt="' + (data.title || data.name) + '"/>'
                    )
                }
            }
        })
    }

    // Listen for full screen movie/tv show view
    Lampa.Listener.follow('full', function(e) {
        if (e.type == 'complite' && Lampa.Storage.get('logo_plugin_enabled') != '1') {
            var data = e.data.movie
            var titleElement = e.object.activity.render().find('.full-start-new__title')

            loadLogo(data, titleElement)
        }
    })

    // Listen for hero section updates (home page)
    Lampa.Listener.follow('render', function(e) {
        if (e.type == 'items' && Lampa.Storage.get('logo_plugin_enabled') != '1') {
            // Check if this is a hero section
            var heroTitle = e.render.find('.hero-tv__title')

            if (heroTitle.length) {
                // Get the current card data from the hero
                var heroElement = e.render.find('.hero-tv')

                if (heroElement.length) {
                    // Access the hero instance through the component
                    var heroInstance = heroElement.data('hero')

                    if (heroInstance && heroInstance.card) {
                        loadLogo(heroInstance.card(), heroTitle)
                    }
                }
            }
        }
    })
}

if (!window.logo_plugin_ready) startPlugin()

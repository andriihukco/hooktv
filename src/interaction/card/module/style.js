import Template from '../../template'

export default {
    onCreate: function(){
        // a streaming service: its logo, round, or its name when there is no logo
        if(this.params.style.name == 'provider'){
            this.html.addClass('card--provider')

            this.html.find('.card__title, .card__age').remove()

            let badge = $('<div class="card__provider"></div>')

            if(this.data.logo) badge.append($('<img class="card__provider-logo">').attr({src: this.data.logo, alt: this.data.title || ''}))
            else badge.append(Template.elem('div', {class: 'card__provider-name', text: this.data.title || ''}))

            this.html.find('.card__view').append(badge)
            // the service's brand colour is the round background behind its logo
            if(this.data.brand) this.html.style.setProperty('--brand-bg', this.data.brand)
        }

        // a game: a rounded app-icon tile with its own gradient and glyph, the title stays below
        if(this.params.style.name == 'game'){
            this.html.addClass('card--game')

            this.html.find('.card__age').remove()

            this.html.find('.card__view').append($('<div class="card__game"></div>').css('background', `linear-gradient(145deg, ${this.data.c1}, ${this.data.c2})`).append($('<span class="card__game-glyph"></span>').text(this.data.emoji)))
        }

        if(this.params.style.name == 'collection'){
            this.html.addClass('card--collection')

            this.html.find('.card__age')?.remove()
        }

        if(this.params.style.name == 'wide'){
            this.html.find('.card__title')?.remove()
            this.html.find('.card__age')?.remove()

            this.html.addClass('card--wide')
                    
            this.data.poster = this.data.cover

            let promo_wrap = Template.elem('div', {class: 'card__promo'})

            // a streaming service shows its own logo instead of the name
            if(this.data.logo){
                promo_wrap.append($('<img class="card__promo-logo">').attr({src: this.data.logo, alt: this.data.title || ''}))
            }
            else if(this.data.title || this.data.name){
                promo_wrap.append(Template.elem('div', {class: 'card__promo-title', text: this.data.title || this.data.name}))
            }

            if(this.data.overview){
                promo_wrap.append(Template.elem('div', {class: 'card__promo-text', text: this.data.overview.slice(0,110) + (this.data.overview.length > 110 ? '...' : '')}))
            }
            
            this.html.find('.card__view').append(promo_wrap)
            
        }
    }
}
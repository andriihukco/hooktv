import Template from '../../template'
import Lang from '../../../core/lang'
import {iconHTML} from '../../../games/icons'
import Material from '../../../utils/material'

// a colour darkened toward black: `keep` is how much of it stays (0..1)
function shade(hex, keep){
    let n = parseInt(hex.replace('#', ''), 16)
    let c = [n >> 16, (n >> 8) & 255, n & 255].map(v=>Math.round(v * keep))

    return 'rgb(' + c.join(', ') + ')'
}

export default {
    onCreate: function(){
        // a streaming service: its logo, round, or its name when there is no logo
        if(this.params.style.name == 'provider'){
            this.html.addClass('card--provider')

            this.html.find('.card__title, .card__age').remove()

            let badge = $('<div class="card__provider"></div>')

            if(this.data.logo) badge.append($('<img class="card__provider-logo">').attr({src: this.data.logo, alt: this.data.title || ''}))
            else{
                // a page tile: its Material icon fills the same box as a channel logo, the title sits under the circle
                if(this.data.icon){
                    let icon = $(Template.elem('div', {class: 'card__provider-name card__provider-name--icon'})).prepend(Material.icon(this.data.icon))

                    badge.append(icon)
                    this.html.append(Template.elem('div', {class: 'card__provider-caption', text: this.data.title || ''}))
                }
                else badge.append(Template.elem('div', {class: 'card__provider-name', text: this.data.title || ''}))
            }

            this.html.find('.card__view').append(badge)
            // the service's brand colour is the round background behind its logo
            if(this.data.brand) this.html.style.setProperty('--brand-bg', this.data.brand)
        }

        // a game: an app-store icon, its name below and a Play Game label where there is no hover pane (phones, touch)
        if(this.params.style.name == 'game'){
            this.html.addClass('card--game')

            this.html.find('.card__age').remove()

            // a category: a folder showing the first four of its game icons, with its game count below
            if(this.data.category){
                let tile   = this.data.c1 || '#3E91FF'
                let folder = $('<div class="card__game card__folder"></div>').css({'--tile': tile, '--inner': shade(tile, 0.62)})

                ;(this.data.games || []).slice(0, 4).forEach(id=>folder.append($(iconHTML(id))))
                this.html.find('.card__view').append(folder)
                this.html.append($('<div class="card__game-play"></div>').text((this.data.games || []).length + ' ' + Lang.translate('hooktv_games_count')))
            }
            else{
                this.html.find('.card__view').append($('<div class="card__game"></div>').append($(iconHTML(this.data.game))))
                this.html.append($('<div class="card__game-play"></div>').text(Lang.translate('hooktv_play_game')))
            }
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
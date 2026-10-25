import Controller from '../../../core/controller'
import Lang from '../../../core/lang'
import Watch from '../../../interaction/watch'
import Bell from '../../../interaction/bell'
import Template from '../../../interaction/template'
import Utils from '../../../utils/utils'

export default {
    onCreate: function(){
        // shared through api/title.js, which serves link-preview tags and then opens the app at ?card=&media=&source=
        this.html.find('.button--share').on('hover:enter', ()=>{
            let media = this.card.name ? 'tv' : 'movie'
            let link  = location.origin + '/api/title?card=' + this.card.id + '&media=' + media + '&source=' + (this.card.source || 'tmdb')

            Utils.copyTextToClipboard(link, ()=>{
                Bell.push({text: Lang.translate('copy_secuses'), icon: Template.string('icon_check')})
            })
        })

        // Torrents (when enabled) live in the ⋯ menu instead of the action row
        this.torrent_option = (e)=>{
            if(e.type !== 'options' || e.link !== this) return

            let torrent = this.html.find('.view--torrent').not('.hide')

            if(torrent.length) e.options.unshift({
                title: Lang.translate('full_torrents'),
                onSelect: ()=>{
                    Controller.toggle('content')

                    torrent.trigger('hover:enter')
                }
            })
        }

        Lampa.Listener.follow('full', this.torrent_option)
    },
    onDestroy: function(){
        Lampa.Listener.remove('full', this.torrent_option)
    },
    onGroupButtons: function(){
        let play = this.html.find('.button--play')

        // One tap: Українська / Оригінал, then the best source plays
        play.unbind('hover:enter').on('hover:enter',()=>{
            Watch.start(this.card)
        }).on('hover:focus', ()=>{
            this.last = play[0]
        })

        play.removeClass('hide')
    }
}

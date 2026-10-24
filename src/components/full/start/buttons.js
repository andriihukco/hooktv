import Controller from '../../../core/controller'
import Lang from '../../../core/lang'
import Watch from '../../../interaction/watch'

export default {
    onCreate: function(){
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

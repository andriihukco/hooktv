import Controller from '../../../core/controller'
import Lang from '../../../core/lang'
import Watch from '../../../interaction/watch'
import Bell from '../../../interaction/bell'
import Template from '../../../interaction/template'
import Utils from '../../../utils/utils'
import Auth from '../../../core/supa/auth'
import Reactions from '../../../core/supa/reactions'

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

        // Like / dislike: counts and your own vote come from Supabase. The same button again removes the vote, the other one switches it.
        let media = ()=> this.card.name ? 'tv' : 'movie'
        let busy  = false

        let paintReactions = (state)=>{
            this.html.find('.button--like').toggleClass('voted', state.mine == 'like')
            this.html.find('.button--dislike').toggleClass('voted', state.mine == 'dislike')
            this.html.find('.button--like-count').text(Utils.bigNumberToShort(state.likes))
            this.html.find('.button--dislike-count').text(Utils.bigNumberToShort(state.dislikes))
        }

        let castReaction = (type)=>{
            if(busy) return

            if(!Auth.session()) return Bell.push({text: Lang.translate('reactions_signin')})

            busy = true

            Reactions.vote(media(), this.card.id, type).then((state)=>{
                busy = false

                paintReactions(state)
            }).catch(()=>{
                busy = false

                Bell.push({text: Lang.translate('reactions_failed')})
            })
        }

        this.html.find('.button--like').on('hover:enter', ()=>castReaction('like'))
        this.html.find('.button--dislike').on('hover:enter', ()=>castReaction('dislike'))

        Reactions.counts(media(), this.card.id).then(paintReactions).catch(()=>{})

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

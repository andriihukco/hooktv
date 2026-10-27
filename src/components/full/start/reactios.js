import Utils from '../../../utils/utils'
import Favorite from '../../../core/favorite'
import Storage from '../../../core/storage/storage'

export default {
    onCreate: function(){
        if(!Storage.field('card_interfice_reactions') || window.lampa_settings.disable_features.reactions) return this.html.find('.button--like, .button--dislike').remove()

        let reactions_data = this.data.reactions

        // like = fire + nice, dislike = bore + shit: the five CUB reactions folded into two counts.
        // The counts are the real CUB ratings, shown on load. Our own taps are not sent anywhere:
        // a like saves the title to Saved > Liked, a dislike is only remembered on this device.
        let thumbs = {
            like:    {groups: ['fire', 'nice']},
            dislike: {groups: ['bore', 'shit']}
        }

        let card_id = (this.card.name ? 'tv' : 'movie') + '_' + this.card.id

        let disliked = ()=> Storage.get('mine_dislikes', {})[card_id] ? true : false

        let count = (types)=>types.reduce((sum, type)=>{
            let find = reactions_data && reactions_data.result && reactions_data.result.find(r=>r.type == type)

            return sum + (find ? find.counter : 0)
        }, 0)

        let paint = ()=>{
            Object.keys(thumbs).forEach(key=>{
                let el = this.html.find('.button--' + key)

                el.find('.button--' + key + '-count').text(Utils.bigNumberToShort(count(thumbs[key].groups)))
                el.toggleClass('voted', key == 'like' ? Boolean(Favorite.check(this.card).like) : disliked())
            })
        }

        this.html.find('.button--like').on('hover:enter', ()=>{
            let dislikes = Storage.get('mine_dislikes', {})

            delete dislikes[card_id]

            Storage.set('mine_dislikes', dislikes)

            Favorite.toggle('like', this.card)

            paint()
        })

        this.html.find('.button--dislike').on('hover:enter', ()=>{
            let dislikes = Storage.get('mine_dislikes', {})

            if(dislikes[card_id]) delete dislikes[card_id]
            else{
                dislikes[card_id] = true

                if(Favorite.check(this.card).like) Favorite.remove('like', this.card)
            }

            Storage.set('mine_dislikes', dislikes)

            paint()
        })

        paint()
    }
}

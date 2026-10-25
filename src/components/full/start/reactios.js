import Utils from '../../../utils/utils'
import Api from '../../../core/api/api'
import Storage from '../../../core/storage/storage'
import Lang from '../../../core/lang'

/**
 * HOOK TV: the details page has two votes only, Like and Dislike. Cub keeps five reactions;
 * like = fire + nice, dislike = bore + shit. Each button shows the sum of its two counts,
 * and a vote sends one of them (nice / bore) to cub.
 */
export default {
    onCreate: function(){
        if(!Storage.field('card_interfice_reactions') || window.lampa_settings.disable_features.reactions) return this.html.find('.button--like, .button--dislike').remove()

        let reactions_data = this.data.reactions
        let id = ()=>(this.card.name ? 'tv' : 'movie') + '_' + this.card.id

        let vote = (type, add = false)=>{
            let mine = Storage.get('mine_reactions',{})

            if(!mine[id()]) mine[id()] = []

            let ready = mine[id()].indexOf(type) >= 0

            if(add){
                if(!ready) mine[id()].push(type)

                Storage.set('mine_reactions', mine)
            }

            return ready
        }

        let thumbs = {
            like:    {groups: ['fire', 'nice'], send: 'nice'},
            dislike: {groups: ['bore', 'shit'], send: 'bore'}
        }

        let count = (types)=>types.reduce((sum, type)=>{
            let find = reactions_data && reactions_data.result && reactions_data.result.find(r=>r.type == type)

            return sum + (find ? find.counter : 0)
        }, 0)

        let voted = (types)=>types.some(type=>vote(type))

        // one vote at a time: the key of the thumb the user chose, if any
        let active = ()=>Object.keys(thumbs).find(key=>voted(thumbs[key].groups)) || null

        let forget = (type)=>{
            let mine = Storage.get('mine_reactions',{})

            mine[id()] = (mine[id()] || []).filter(t=>t !== type)

            Storage.set('mine_reactions', mine)
        }

        // cub takes one reaction per title: once this device has its vote there, changes stay here
        let reacted = ()=>Boolean(Storage.get('reacted_titles',{})[id()])

        let remember = ()=>{
            let all = Storage.get('reacted_titles',{})

            all[id()] = true

            Storage.set('reacted_titles', all)
        }

        let paint = ()=>{
            Object.keys(thumbs).forEach(key=>{
                let el = this.html.find('.button--' + key)

                el.find('span').text(Utils.bigNumberToShort(count(thumbs[key].groups) + (thumbs[key].added || 0)))
                el.toggleClass('voted', active() === key)
            })
        }

        Object.keys(thumbs).forEach(key=>{
            let thumb = thumbs[key]

            this.html.find('.button--' + key).on('hover:enter', ()=>{
                let before = active()

                // tapping the chosen one takes the vote back
                if(before === key){
                    forget(thumb.send)

                    thumb.added = (thumb.added || 0) - 1

                    return paint()
                }

                // a change here moves the vote on this device only
                if(before || reacted()){
                    if(before){
                        forget(thumbs[before].send)

                        thumbs[before].added = (thumbs[before].added || 0) - 1
                    }

                    vote(thumb.send, true)

                    thumb.added = (thumb.added || 0) + 1

                    return paint()
                }

                Api.sources.cub.reactionsAdd({
                    method: this.card.name ? 'tv' : 'movie',
                    id: this.card.id,
                    type: thumb.send
                },()=>{
                    remember()

                    vote(thumb.send, true)

                    thumb.added = (thumb.added || 0) + 1

                    paint()
                },()=>{
                    // cub already has this title's vote from this account: keep the choice here, no notice
                    remember()

                    vote(thumb.send, true)

                    thumb.added = (thumb.added || 0) + 1

                    paint()
                })
            })
        })

        paint()
    }
}

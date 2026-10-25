import Controller from '../../../core/controller'
import Select from '../../../interaction/select'
import Utils from '../../../utils/utils'
import Reactions from '../../../core/api/sources/reactions'
import Storage from '../../../core/storage/storage'
import Lang from '../../../core/lang'

export default {
    onCreate: function(){
        if(!Storage.field('card_interfice_reactions') || window.lampa_settings.disable_features.reactions) return this.html.find('.full-start-new__reactions, .button--reaction, .button--like, .button--dislike').remove()

        let reactions_data = this.data.reactions

        let vote = (type, add = false)=>{
            let mine = Storage.get('mine_reactions',{})
            let id   = (this.card.name ? 'tv' : 'movie') + '_' + this.card.id
    
            if(!mine[id]) mine[id] = []
    
            let ready = mine[id].indexOf(type) >= 0 
    
            if(add){
                if(!ready) mine[id].push(type)
    
                Storage.set('mine_reactions', mine)
            }
    
            return ready
        }
        
        let draw = ()=>{
            // the five-reaction row is not in the template any more; the thumbs below still show the counts
            if(reactions_data && reactions_data.result && reactions_data.result.length && this.html.find('.full-start-new__reactions').length){
                let reactions = reactions_data.result
                let reactions_body = this.html.find('.full-start-new__reactions')[0]

                reactions.sort((a,b)=>{
                    return a.counter > b.counter ? -1 : a.counter < b.counter ? 1 : 0
                })

                reactions_body.empty()

                reactions.forEach(r=>{
                    let reaction = document.createElement('div'),
                        icon     = document.createElement('img'),
                        count    = document.createElement('div'),
                        wrap     = document.createElement('div')

                    reaction.addClass('reaction')
                    icon.addClass('reaction__icon')
                    count.addClass('reaction__count')

                    reaction.addClass('reaction--' + r.type)

                    count.text(Utils.bigNumberToShort(r.counter))

                    icon.style.opacity = 0

                    Utils.imgLoad(icon, Reactions.image(r.type), ()=>{
                        icon.style.opacity = 1
                    })

                    reaction.append(icon)
                    reaction.append(count)

                    wrap.append(reaction)

                    if(vote(r.type)) reaction.addClass('reaction--voted')

                    reactions_body.append(wrap)
                })
            }
        }

        let items = [
            {type: 'fire'},
            {type: 'nice'},
            {type: 'think'},
            {type: 'bore'},
            {type: 'shit'}
        ]

        items.forEach(a=>{
            a.template = 'selectbox_icon',
            a.icon     = '<img src="'+Reactions.image(a.type)+'" />'
            a.ghost    = vote(a.type)
            a.noenter  = a.ghost
            a.title    = Lang.translate('reactions_' + a.type)
        })

        this.html.find('.button--reaction').on('hover:enter',()=>{
            Select.show({
                title: Lang.translate('title_reactions'),
                items: items,
                onSelect: (a)=>{
                    Controller.toggle('content')

                    Reactions.add({
                        method: this.card.name ? 'tv' : 'movie',
                        id: this.card.id,
                        type: a.type
                    },()=>{
                        vote(a.type, true)

                        let find = reactions_data.result.find(r=>r.type == a.type)

                        if(find) find.counter++
                        else{
                            reactions_data.result.push({
                                type: a.type,
                                counter: 1
                            })
                        }

                        a.ghost   = true
                        a.noenter = true

                        draw()
                    },(e)=>{
                        Lampa.Noty.show(Lang.translate('reactions_ready'))
                    })
                },
                onBack: ()=>{
                    Controller.toggle('content')
                }
            })
        })

        // like = fire + nice, dislike = bore + shit: the five server reactions folded into two votes
        let thumbs = {
            like:    {groups: ['fire', 'nice'], send: 'nice'},
            dislike: {groups: ['bore', 'shit'], send: 'bore'}
        }

        let count = (types)=>types.reduce((sum, type)=>{
            let find = reactions_data && reactions_data.result && reactions_data.result.find(r=>r.type == type)

            return sum + (find ? find.counter : 0)
        }, 0)

        // my thumb for this card: which one is active, and which votes the server already has.
        // The server only adds votes, so a sent vote is never sent again and never removed.
        let card_id = (this.card.name ? 'tv' : 'movie') + '_' + this.card.id

        let mine = ()=>{
            let all = Storage.get('mine_thumbs', {})

            return all[card_id] || {active: null, sent: []}
        }

        let keep = (state)=>{
            let all = Storage.get('mine_thumbs', {})

            all[card_id] = state

            Storage.set('mine_thumbs', all)
        }

        let paint = ()=>{
            Object.keys(thumbs).forEach(key=>{
                let el = this.html.find('.button--' + key)

                el.find('span').text(Utils.bigNumberToShort(count(thumbs[key].groups) + (thumbs[key].added || 0)))
                el.toggleClass('voted', mine().active === key)
            })
        }

        Object.keys(thumbs).forEach(key=>{
            let thumb = thumbs[key]

            this.html.find('.button--' + key).on('hover:enter', ()=>{
                let state = mine()

                // tap the active thumb again: remove it on this screen only
                if(state.active === key){
                    state.active = null

                    keep(state)

                    return paint()
                }

                // like, or switch from the other thumb: the choice shows at once
                state.active = key

                keep(state)

                paint()

                // the vote already reached the server before: nothing more to send
                if(state.sent.indexOf(thumb.send) >= 0 || thumb.pending) return

                thumb.pending = true

                Reactions.add({
                    method: this.card.name ? 'tv' : 'movie',
                    id: this.card.id,
                    type: thumb.send
                },()=>{
                    thumb.pending = false

                    let now = mine()

                    if(now.sent.indexOf(thumb.send) < 0) now.sent.push(thumb.send)

                    keep(now)

                    thumb.added = (thumb.added || 0) + 1

                    paint()
                },()=>{
                    thumb.pending = false

                    // the vote did not reach the server, so the thumb goes back
                    let now = mine()

                    if(now.active === key){
                        now.active = null

                        keep(now)

                        paint()
                    }
                })
            })
        })

        paint()

        draw()
    }
}
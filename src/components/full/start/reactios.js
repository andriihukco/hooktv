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

        let voted = (types)=>types.some(type=>vote(type))

        let paint = ()=>{
            Object.keys(thumbs).forEach(key=>{
                let el = this.html.find('.button--' + key)

                el.find('span').text(Utils.bigNumberToShort(count(thumbs[key].groups) + (thumbs[key].added || 0)))
                el.toggleClass('voted', voted(thumbs[key].groups))
            })
        }

        Object.keys(thumbs).forEach(key=>{
            let thumb = thumbs[key]

            this.html.find('.button--' + key).on('hover:enter', ()=>{
                if(voted(thumb.groups)) return Lampa.Noty.show(Lang.translate('reactions_ready'))

                Reactions.add({
                    method: this.card.name ? 'tv' : 'movie',
                    id: this.card.id,
                    type: thumb.send
                },()=>{
                    vote(thumb.send, true)

                    thumb.added = (thumb.added || 0) + 1

                    paint()
                },()=>{
                    Lampa.Noty.show(Lang.translate('reactions_ready'))
                })
            })
        })

        paint()

        draw()
    }
}
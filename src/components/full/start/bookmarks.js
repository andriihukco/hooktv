import Template from "../../../interaction/template"
import Controller from '../../../core/controller'
import Select from '../../../interaction/select'
import Favorite from '../../../core/favorite'
import Lang from '../../../core/lang'
import Platform from '../../../core/platform'

export default {
    onCreate: function(){
        let btn = this.html.find('.button--book')

        btn.on('hover:enter',()=>{
            if(btn.hasClass('loading')) return

            let status = Favorite.check(this.card)

            let label = (a)=>{
                btn.addClass('loading')

                Favorite.toggle(a.type, this.card)

                if(a.collect) Controller.toggle('content')
            }

            let items = ['book', 'like', 'wath', 'history'].map(type=>{
                return {
                    title: Lang.translate('title_' + type),
                    type: type,
                    checkbox: true,
                    checked: status[type]
                }
            })


            Select.show({
                title: Lang.translate('settings_input_links'),
                items: items,
                onCheck: label,
                onSelect: label,
                onBack: ()=>{
                    btn.removeClass('loading')

                    Controller.toggle('content')
                },
            })
        })

        this.emit('updateFavorite')

        this.listenerFavorite = (e)=>{
            if(e.target == 'favorite'){
                btn.removeClass('loading')

                if(e.card){
                    if(e.card.id == this.card.id) this.emit('updateFavorite')
                }
                else this.emit('updateFavorite')
            }
        }

        Lampa.Listener.follow('state:changed', this.listenerFavorite)
    },
    onUpdateFavorite: function(){
        let status = Favorite.check(this.card)
        let any    = Favorite.checkAnyNotHistory(status)
        let marks  = ['look', 'viewed', 'scheduled', 'continued', 'thrown']
        let any_marker = marks.find(m=>status[m])

        $('.button--book path', this.html).attr('fill', any ? 'currentColor' : 'transparent')

        this.html.find('.full-start-new__poster .card__marker').remove()

        if(any_marker && Platform.screen('tv')){
            let marker = Template.elem('div', {class: 'card__marker', children: [
                Template.elem('span')
            ]})

            this.html.find('.full-start-new__poster').append(marker)
            

            marker.find('span').text(Lang.translate('title_' + any_marker))
            marker.removeClass(marks.map(m=>'card__marker--' + m).join(' ')).addClass('card__marker--' + any_marker)
        }
    },
    onDestroy: function(){
        Lampa.Listener.remove('state:changed', this.listenerFavorite)
    }
}
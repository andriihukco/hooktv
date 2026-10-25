import Controller from '../../../core/controller'
import Select from '../../../interaction/select'
import Lang from '../../../core/lang'

export default {
    onCreate: function(){
        this.html.find('.button--options').on('hover:enter',()=>{
            let options = []

            Lampa.Listener.send('full', {
                link: this,
                type:'options',
                props: this.props,
                options
            })


            Select.show({
                title: Lang.translate('more'),
                items: options,
                onSelect: ()=>{
                    Controller.toggle('content')
                },
                onBack: ()=>{
                    Controller.toggle('content')
                }
            })
        })
    }
}
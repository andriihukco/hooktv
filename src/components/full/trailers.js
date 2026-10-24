import Constructor from '../../interaction/constructor'
import MaskHelper from '../../utils/mask'
import Callback from '../../core/module/callback'
import Utils from '../../utils/utils'
import Line from '../../interaction/items/line/line'
import LineModule from '../../interaction/items/line/module/module'
import Trailers from './start/trailers'

const Modules = {
    View: {
        onCreate: function(){
            this.html = $(`<div class="full-trailer selector layer--visible">
                <div class="full-trailer__img"><img /><div class="full-trailer__play"><svg><use xlink:href="#sprite-play"></use></svg></div></div>
                <div class="full-trailer__name"></div>
                <div class="full-trailer__descr"></div>
            </div>`)[0]

            $(this.html).find('.full-trailer__name').text(this.data.title)
            $(this.html).find('.full-trailer__descr').text(this.data.subtitle)

            this.html.on('visible', ()=>{
                Utils.imgLoad($(this.html).find('img'), this.data.img, ()=>this.html.classList.add('full-trailer--loaded'))
            })
        }
    },
    Callback
}

const Trailer = Constructor(Modules)
const ALL = new MaskHelper(Object.keys(Modules)).MASK.all

/**
 * Row of trailers under the description: thumbnails play in place, no menu.
 */
function TrailersRow(data){
    Utils.extendItemsParams(data.results, {
        module: ALL,
        createInstance: (item)=>new Trailer(item),
        emit: {
            onEnter: (html, item)=>Trailers.play(item, data.results)
        }
    })

    return Utils.createInstance(Line, data, {
        module: LineModule.only('Items', 'Create')
    })
}

export default TrailersRow

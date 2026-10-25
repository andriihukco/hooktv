export default {
    onCreate: function(){
        let im = this.html.find('.full--poster')

        // HOOK TV: every screen shows the real poster in its 2:3 frame; phones used to load
        // the backdrop here for Lampa's full-width layout, which this frame crops into a still
        this.img_poster = im[0] || {}

        this.img_poster.onerror = (e)=>{
            this.img_poster.src = './img/img_broken.svg'
        }

        this.img_poster.onload = (e)=>{
            im.parent().addClass('loaded')
        }

        this.img_poster.src = this.card.img
    }
}

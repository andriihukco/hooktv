import Subscribe from '../utils/subscribe'
import Keypad from "../core/keypad"
import Storage from "../core/storage/storage"

import Ukraine from './screensaver/ukraine'

/**
 * Скринсейвер
 * @class
 * @returns {Screensaver}
 */
class Screensaver{
    constructor(){
        this.listener = Subscribe()

        this.enabled = false
        this.worked  = false
        // a full-screen game holds the screen: nothing starts the screensaver until it is closed
        this.suspended = false

        this.screensaver
        this.timer

        this.time_reset = 0
        this.time_start = 0

        // HOOK TV: the 4K Ukrainian landscape rotation is the only screensaver
        this.class_list = {
            ukraine: Ukraine
        }
    }

    init(){
        this.html = $('<div class="screensaver-layer"></div>')

        this.html.on('click',this.stop.bind(this))

        $('body').append(this.html)

        this.resetTimer()

        Keypad.listener.follow('keydown',(e) => {
            this.resetTimer()

            if(this.worked) {
                this.stopSlideshow()

                e.event.preventDefault()
            }
        })

        Keypad.listener.follow('keyup',(e) => {
            if(this.worked) e.event.preventDefault()
        })

        $(window).on('mousedown',(e)=>{
            this.resetTimer()
        })

        $(window).on('focus',this.resetTimer.bind(this))
    }

    toggle(enabled){
        this.enabled = enabled

        this.resetTimer()
    
        this.listener.send('toggle',{status: this.enabled})
    }

    enable(){
        this.toggle(true)
    }

    disable(){
        this.toggle(false)
    }

    isWorked(){
        return this.enabled ? this.worked : this.enabled
    }

    stop(){
        if(this.isWorked()) this.stopSlideshow()
    }

    show(type, params){
        clearTimeout(this.timer)

        this.listener.send('start',{})

        let Class = this.class_list[type] || Ukraine

        this.screensaver = new Class(params)
        this.screensaver.create()

        this.html.append(this.screensaver.render())

        this.html.fadeIn(300)

        this.worked = true
    }

    suspend(){
        this.suspended = true

        if(this.worked) this.stopSlideshow()

        clearTimeout(this.timer)
    }

    resume(){
        this.suspended = false

        this.resetTimer()
    }

    resetTimer(){
        clearTimeout(this.timer)

        this.time_reset = Date.now()

        if(!Storage.field('screensaver') || !this.enabled || this.worked || this.suspended) return

        let timeout = 1000 * 60 * Storage.field('screensaver_time')

        this.timer = setTimeout(()=>{
            //для ведра, когда в приложении появляется фокус срабатывает таймер
            if(Date.now() - this.time_reset <= timeout + 100) this.show()
            else this.resetTimer()
        }, timeout)
    }

    stopSlideshow(){
        this.worked = false
        
        this.html.fadeOut(300,()=>{
            this.html.removeClass('visible')

            if(this.screensaver){
                this.screensaver.destroy()
                this.screensaver = false
            }
        })
    
        this.resetTimer()

        this.listener.send('stop',{})
    }
}


export default new Screensaver()

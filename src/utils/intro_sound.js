/**
 * Launch sound: audio/hooktv.mp3, cut to a short sting that fades out.
 * Browsers hold audio until a click or key press, so a blocked start waits
 * for the next one.
 */

const LENGTH = 2.6 // seconds of sound before it stops
const FADE   = 0.7 // seconds at the end spent fading to silence

function fade(audio){
    let started = Date.now()

    let timer = setInterval(()=>{
        let left = LENGTH - (Date.now() - started) / 1000

        audio.volume = Math.max(0, Math.min(1, left / FADE))

        if(left <= 0){
            clearInterval(timer)
            audio.pause()
        }
    }, 50)
}

function play(){
    try{
        let audio = new Audio('./audio/hooktv.mp3')

        // retries on the next click or key press when the browser blocked the start
        let retry = ()=>{
            audio.play().then(()=>{
                window.removeEventListener('pointerdown', retry)
                window.removeEventListener('keydown', retry)

                fade(audio)
            }).catch(()=>{})
        }

        audio.play().then(()=>fade(audio)).catch(()=>{
            window.addEventListener('pointerdown', retry)
            window.addEventListener('keydown', retry)
        })
    }
    catch(e){
        console.log('IntroSound', 'unavailable:', e.message)
    }
}

export default {
    play
}

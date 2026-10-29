import IntroSound from '../utils/intro_sound'

let html
let destroyed = false
let currentStep = 0
let totalSteps = 5
let shown = -1
let ticker

// a title opened inside the app is a pushState to /movie/…, where a relative ./img path would
// resolve under /movie/ (index.html sets <base> only on a full load), so the web uses the root
const SPLASH = (/^https?:$/.test(location.protocol) ? '/' : './') + 'img/splash.svg?v=2.98'

/**
 * Cinema-style status lines, one per stage, shown in order. Translations
 * load after the splash, so the copy lives here, picked by the saved language.
 */
const PHRASES = {
    uk: ['Вмикаємо проектор', 'Гасимо світло в залі', 'Шукаємо найкращі місця', 'Підбираємо фільми', 'Завантажуємо сцени', 'Налаштовуємо звук', 'Починаємо показ'],
    ru: ['Включаем проектор', 'Гасим свет в зале', 'Ищем лучшие места', 'Подбираем фильмы', 'Загружаем сцены', 'Настраиваем звук', 'Начинаем показ'],
    en: ['Warming up the projector', 'Dimming the lights', 'Finding the best seats', 'Finding titles', 'Loading scenes', 'Tuning the sound', 'Starting the show']
}

function phrases(){
    let code = ''

    try{ code = localStorage.getItem('language') || '' }
    catch(e){}

    return PHRASES[code] || PHRASES.en
}

/**
 * Moves the status line forward to `index` (never back), crossfading it
 * @param {number} index
 */
function phrase(index){
    let list = phrases()

    index = Math.min(index, list.length - 1)

    if(index <= shown || !html) return

    shown = index

    let el = html.find('.welcome__status')

    el.removeClass('welcome__status--in')

    // restart the fade on the next frame
    setTimeout(()=>{
        el.text(list[index] + '…').addClass('welcome__status--in')
    }, 30)
}

/**
 * Отображает прогресс загрузки приложения: анимированный логотип HOOK TV
 * @returns {void}
 */
function init(sound = true){
    window.hooktv_splash_start = Date.now()

    let content = `
        <div class="welcome__logo">
            <img src="${SPLASH}" alt="HOOK TV"/>
        </div>
        <div class="welcome__loading">
            <div class="welcome__status"></div>
        </div>
    `

    let existing = $('.welcome')
    if(existing.find('.welcome__logo').length){
        // index.html already painted the splash with the first line; keep it running
        html = existing.eq(0)
        shown = 0
    } else if(existing.length){
        html = existing.eq(0)
        html.html(content)
    } else {
        html = $(`<div class="welcome">${content}</div>`)
        $('body').append(html)
    }

    step(0)

    // browsers hold the chime until the first click or key press
    if(sound) IntroSound.play()

    // stages can be quick or stall; keep the line moving at a steady pace
    ticker = setInterval(()=>phrase(shown + 1), 1400)
}

/**
 * Обновляет шаг загрузки
 * @param {number} position - номер шага
 */
function step(position){
    if(destroyed) return
    
    currentStep = position
    
    // the chasing light on the logo is the progress indicator
    const progress = ((position + 1) / totalSteps) * 100

    phrase(position)

    console.log('LoadingProgress', 'step:', position, progress + '%')
}

/**
 * Обновляет статус загрузки
 * @param {string} text - текст статуса
 */
function status(text){
    if(destroyed) return

    // technical stage names stay in the console; the splash shows phrase()
    console.log('LoadingProgress', 'status:', text)
}

/**
 * Удаляет прогресс загрузки с анимацией
 * @returns {void}
 */
function destroy(){
    if(destroyed) return
    
    destroyed = true

    clearInterval(ticker)
    IntroSound.stop()
    
    // the logo scales out over the interface (welcome.scss)
    if(html) html.addClass('welcome--zoom')
    $('.welcome').addClass('welcome--zoom')

    // Remove after animation completes
    setTimeout(() => {
        if(html) html.remove()
        $('.welcome').remove()
    }, 1000)
}

/**
 * Full-screen logo while a movie searches for sources (no chime)
 */
function watch(){
    destroyed = false
    shown = -1

    // a zoom from the previous movie may still be fading out
    $('.welcome').remove()

    init(false)
}

/**
 * Hands the screen to the movie: the logo zooms in and fades out over it
 */
function zoom(){
    if(!html) return

    destroyed = true
    clearInterval(ticker)

    let el = html

    html = null

    el.addClass('welcome--zoom')

    setTimeout(()=>el.remove(), 900)
}

/**
 * Устанавливает общее количество шагов
 * @param {number} total - общее количество шагов
 */
function setTotalSteps(total){
    totalSteps = total
}

export default {
    init,
    watch,
    zoom,
    step,
    status,
    destroy,
    setTotalSteps
}

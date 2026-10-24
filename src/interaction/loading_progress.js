import IntroSound from '../utils/intro_sound'

let html
let destroyed = false
let currentStep = 0
let totalSteps = 5
let shown = -1
let ticker

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

    // Inline copy of img/logo.svg split into parts that move on their own;
    // inline rather than fetched so it also plays from file:// on TVs
    let loop = 'M82.93 23C82.93 13.61 90.55 6 99.93 6C109.32 6 116.94 13.61 116.94 23C116.94 32.39 109.32 40 99.93 40C90.55 40 82.93 32.39 82.93 23C82.93 13.61 75.32 6 65.93 6C56.55 6 48.93 13.61 48.93 23C48.93 32.39 56.55 40 65.93 40C75.32 40 82.93 32.39 82.93 23Z'

    let content = `
        <div class="welcome__logo">
            <svg viewBox="-1.6 -6 254.1 58" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="HOOK TV">
                <path class="welcome__h" fill="white" d="M31.34 44.184V1.224H43.4V44.184H31.34ZM4.4 44.184V1.224H16.49V44.184H4.4ZM11.57 27.834V16.824H36.71V27.834H11.57Z"/>
                <path class="welcome__loop" d="${loop}" pathLength="100" stroke-width="12" stroke-linejoin="round" stroke="white"/>
                <path class="welcome__chase" d="${loop}" pathLength="100" stroke-width="12" stroke-linejoin="round" stroke="#D6FF5C"/>
                <path class="welcome__k" fill="white" d="M130.25 36.654L130.16 21.744L146.57 1.224H160.55L141.23 23.724L130.25 36.654ZM122.42 44.184V1.224H134.51V44.184H122.42ZM147.59 44.184L135.2 24.984L142.94 15.984L161.72 44.184H147.59Z"/>
                <path class="welcome__t" fill="#D6FF5C" d="M175.684 44.184V7.074H187.744V44.184H175.684ZM163.444 12.234V1.224H199.954V12.234H163.444Z"/>
                <path class="welcome__v" fill="#D6FF5C" d="M218.977 44.184L202.477 1.224H215.257L222.727 22.494L224.707 28.824H224.977L226.927 22.524L233.947 1.224H246.487L229.867 44.184H218.977Z"/>
            </svg>
        </div>
        <div class="welcome__loading">
            <div class="welcome__status"></div>
        </div>
    `

    let existing = $('.welcome')
    if(existing.length){
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
    
    // Fade out animation
    if(html) html.addClass('welcome--fade-out')
    $('.welcome').addClass('welcome--fade-out')
    
    // Remove after animation completes
    setTimeout(() => {
        if(html) html.remove()
        $('.welcome').remove()
    }, 500)
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

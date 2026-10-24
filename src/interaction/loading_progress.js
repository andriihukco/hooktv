import Lang from '../core/lang'
import Brand from '../core/brand'

let html
let destroyed = false
let currentStep = 0
let totalSteps = 5

/**
 * Отображает прогресс загрузки приложения с Netflix-style анимацией
 * @returns {void}
 */
function init(){
    const brandName = Brand.getName('short')
    
    let content = `
        <div class="welcome__logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4"/>
                <path d="M50 20 L50 50 L70 65" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
                <circle cx="50" cy="50" r="5" fill="currentColor"/>
            </svg>
        </div>
        <div class="welcome__brand-name">${brandName}</div>
        <div class="welcome__loading">
            <div class="welcome__progress-bar">
                <div class="welcome__progress-fill"></div>
            </div>
            <div class="welcome__status">Initializing...</div>
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
}

/**
 * Обновляет шаг загрузки
 * @param {number} position - номер шага
 */
function step(position){
    if(destroyed) return
    
    currentStep = position
    
    // Update progress bar
    const progress = ((position + 1) / totalSteps) * 100
    html.find('.welcome__progress-fill').css('width', progress + '%')
    
    // Update status text
    const statusText = Lang.translate('loading_progress_step_' + position) || `Loading ${position + 1}/${totalSteps}`
    html.find('.welcome__status').text(statusText)

    console.log('LoadingProgress', 'step:', position, progress + '%')
}

/**
 * Обновляет статус загрузки
 * @param {string} text - текст статуса
 */
function status(text){
    if(destroyed) return

    html.find('.welcome__status').text(text)

    console.log('LoadingProgress', 'status:', text)
}

/**
 * Удаляет прогресс загрузки с анимацией
 * @returns {void}
 */
function destroy(){
    if(destroyed) return
    
    destroyed = true
    
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
 * Устанавливает общее количество шагов
 * @param {number} total - общее количество шагов
 */
function setTotalSteps(total){
    totalSteps = total
}

export default {
    init,
    step,
    status,
    destroy,
    setTotalSteps
}

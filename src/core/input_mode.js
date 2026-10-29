/**
 * Tracks the last input device. Mouse hover also sets the focus class, so the CSS
 * uses this flag to keep the white focus ring for the remote and keyboard only.
 */
const CLASS = 'input--pointer'

function init(){
    document.addEventListener('pointermove', ()=>document.body.classList.add(CLASS), { capture: true, passive: true })
    document.addEventListener('keydown', ()=>document.body.classList.remove(CLASS), { capture: true })
}

export default {
    init,
    CLASS
}

import Material from '../../utils/material'

/**
 * Главное меню настроек: интерфейс. Вход в аккаунт - первая строка интерфейса.
 */
let html = `<div>
    <div class="settings-folder selector" data-component="interface">
        <div class="settings-folder__icon">
            ${Material.icon('tv')}
        </div>
        <div class="settings-folder__name">#{settings_main_interface}</div>
    </div>
</div>`

export default html

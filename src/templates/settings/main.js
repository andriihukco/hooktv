import Material from '../../utils/material'

/**
 * Главное меню настроек: интерфейс и вход в аккаунт.
 * Вход скрывается, если аккаунты выключены (см. interaction/settings/main.js).
 */
let html = `<div>
    <div class="settings-folder selector" data-component="interface">
        <div class="settings-folder__icon">
            ${Material.icon('tv')}
        </div>
        <div class="settings-folder__name">#{settings_main_interface}</div>
    </div>

    <div class="settings-folder selector" data-component="account">
        <div class="settings-folder__icon">
            ${Material.icon('person')}
        </div>
        <div class="settings-folder__name">#{settings_login}</div>
    </div>
</div>`

export default html

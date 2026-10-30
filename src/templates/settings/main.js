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

    <div class="settings-folder selector" data-component="whats_new" data-static="1">
        <div class="settings-folder__icon">
            ${Material.icon('info')}
        </div>
        <div class="settings-folder__name">#{release_info}</div>
        <span class="whats-new-dot hide"></span>
    </div>

    <!-- BUILD: the version row; five presses on it open the admin login (admin_gate.js) -->
    <div class="settings-folder selector" data-build="1" data-static="1">
        <div class="settings-folder__icon">
            ${Material.icon('info')}
        </div>
        <div class="settings-folder__name">#{settings_build}</div>
        <span class="settings-folder__value"></span>
    </div>
</div>`

export default html

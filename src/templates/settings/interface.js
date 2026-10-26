import Material from '../../utils/material'

let html = `<div>
    <!-- Login is paused: restore this row to show the sign-in / sign-up entry again (hidden when accounts are off)
    <div class="settings-folder selector" data-component="account">
        <div class="settings-folder__icon">
            ${Material.icon('person')}
        </div>
        <div class="settings-folder__name">#{settings_login}</div>
    </div>
    -->

    <!-- Tastes is paused: restore this row together with TastesSettings.init in app.js
    <div class="settings-folder settings-folder--tastes selector" data-component="tastes">
        <div class="settings-folder__icon">
            ${Material.icon('auto_awesome')}
        </div>
        <div class="settings-folder__name">#{tastes_title}</div>
    </div>
    -->

    <!-- one group per topic, most used first: language, how the app looks, what plays -->
    <div class="settings-param-title"><span>#{hooktv_group_language}</span></div>

    <div class="settings-param selector" data-static="true">
        <div class="settings-param__name">#{settings_interface_lang}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{hooktv_group_appearance}</span></div>

    <div class="settings-param selector" data-type="select" data-name="interface_brightness">
        <div class="settings-param__name">#{settings_interface_brightness}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="interface_size">
        <div class="settings-param__name">#{settings_interface_size}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{hooktv_section_dub}</span></div>

    <div class="settings-param selector" data-type="select" data-name="hooktv_dub">
        <div class="settings-param__name">#{hooktv_dub_default}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{hooktv_dub_default_descr}</div>
    </div>
</div>`

export default html
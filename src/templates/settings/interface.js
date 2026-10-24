let html = `<div>
    <div class="settings-param selector" data-static="true">
        <div class="settings-param__name">#{settings_interface_lang}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="interface_theme">
        <div class="settings-param__name">#{settings_interface_theme}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_interface_theme_descr}</div>
    </div>

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

    <div class="settings-param-title"><span>#{settings_interface_background}</span></div>

    <div class="settings-param selector" data-type="toggle" data-name="background">
        <div class="settings-param__name">#{settings_interface_background_use}</div>
        <div class="settings-param__value"></div>
    </div>


</div>`

export default html
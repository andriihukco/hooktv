import Material from '../../utils/material'

let html = `<div>
    <!-- ACCOUNT SYNC -->
    <div class="settings-folder selector" data-component="account" data-static="true">
        <div class="settings-folder__icon">
            ${Material.icon('person')}
        </div>
        <div class="settings-folder__name">#{settings_cub_sync}</div>
    </div>

    <!-- PARSER / ONLINE SOURCES -->
    <div class="settings-folder selector" data-component="parser" data-static="true">
        <div class="settings-folder__icon">
            ${Material.icon('search')}
        </div>
        <div class="settings-folder__name">#{settings_main_parser}</div>
    </div>

    <!-- TMDB -->
    <div class="settings-folder selector" data-component="tmdb" data-static="true">
        <div class="settings-folder__icon">
            ${Material.icon('movie')}
        </div>
        <div class="settings-folder__name">TMDB</div>
    </div>

    <!-- PLUGINS -->
    <div class="settings-folder selector" data-component="plugins" data-static="true">
        <div class="settings-folder__icon">
            ${Material.icon('extension')}
        </div>
        <div class="settings-folder__name">#{settings_main_plugins}</div>
    </div>

    <!-- DETAILED SETTINGS -->
    <div class="settings-param-title"><span>#{hooktv_group_start}</span></div>

    <div class="settings-param selector" data-type="select" data-name="start_page">
        <div class="settings-param__name">#{settings_rest_start}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_start_descr}</div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="source">
        <div class="settings-param__name">#{settings_rest_source_use}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_source_descr}</div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="protocol">
        <div class="settings-param__name">#{settings_rest_protocol_use}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_protocol_descr}</div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="request_caching">
        <div class="settings-param__name">#{settings_request_caching_use}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_request_caching_descr}</div>
    </div>

    <div class="settings-param-title"><span>#{settings_rest_screensaver}</span></div>

    <div class="settings-param selector" data-type="toggle" data-name="screensaver">
        <div class="settings-param__name">#{settings_rest_screensaver_use}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_type">
        <div class="settings-param__name">#{settings_rest_screensaver_type}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_grid">
        <div class="settings-param__name">#{screensaver_grid}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="input" data-name="screensaver_location" placeholder="#{screensaver_location_placeholder}">
        <div class="settings-param__name">#{screensaver_location}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="input" data-name="screensaver_news_url" placeholder="#{screensaver_news_url_placeholder}">
        <div class="settings-param__name">#{screensaver_news_url}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="input" data-name="screensaver_todo_list" placeholder="#{screensaver_todo_placeholder}">
        <div class="settings-param__name">#{screensaver_todo_list}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title"><span>#{screensaver_grid_slots}</span></div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_widget_1">
        <div class="settings-param__name">#{screensaver_slot_1}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_widget_2">
        <div class="settings-param__name">#{screensaver_slot_2}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_widget_3">
        <div class="settings-param__name">#{screensaver_slot_3}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_widget_4">
        <div class="settings-param__name">#{screensaver_slot_4}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_widget_5">
        <div class="settings-param__name">#{screensaver_slot_5}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_widget_6">
        <div class="settings-param__name">#{screensaver_slot_6}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="screensaver_time">
        <div class="settings-param__name">#{settings_rest_screensaver_time}</div>
        <div class="settings-param__value"></div>
    </div>

    
    <div class="settings-param-title"><span>#{hooktv_group_cards}</span></div>

    <div class="settings-param selector" data-type="select" data-name="pages_save_total">
        <div class="settings-param__name">#{settings_rest_pages}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_pages_descr}</div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="time_offset">
        <div class="settings-param__name">#{settings_rest_time}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="navigation_type">
        <div class="settings-param__name">#{settings_rest_navigation}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector" data-type="select" data-name="keyboard_type">
        <div class="settings-param__name">#{settings_rest_keyboard}</div>
        <div class="settings-param__value"></div>
    </div>


    <div class="settings-param selector" data-type="toggle" data-name="card_quality">
        <div class="settings-param__name">#{settings_rest_card_quality}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_card_quality_descr}</div>
    </div>

    <div class="settings-param selector" data-type="toggle" data-name="card_episodes">
        <div class="settings-param__name">#{settings_rest_card_episodes}</div>
        <div class="settings-param__value"></div>
        <div class="settings-param__descr">#{settings_rest_card_episodes_descr}</div>
    </div>

    <div class="settings-param selector" data-type="input" data-name="device_name" placeholder="#{settings_rest_device_placeholder}">
        <div class="settings-param__name">#{settings_rest_device}</div>
        <div class="settings-param__value"></div>
    </div>
</div>`

export default html

let html = `<div>
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
</div>`

export default html

let html = `<div>
    <div class="settings-param selector" data-type="toggle" data-name="account_use">
        <div class="settings-param__name">#{settings_cub_sync}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param-title settings--account-signin"><span>#{settings_cub_signin}</span></div>

    <div class="settings-param selector settings--account-signin settings--account-email" data-static="true">
        <div class="settings-param__name">#{account_signin_email}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector settings--account-signin settings--account-password" data-static="true">
        <div class="settings-param__name">#{account_signin_password}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector settings--account-signin settings--account-do-signin" data-static="true">
        <div class="settings-param__name">#{account_signin_button}</div>
    </div>

    <div class="settings-param selector settings--account-signin settings--account-do-signup" data-static="true">
        <div class="settings-param__name">#{account_signup_button}</div>
    </div>

    <div class="settings-param selector settings--account-signin settings--account-resend hide" data-static="true">
        <div class="settings-param__name">#{account_resend}</div>
    </div>

    <div class="settings-param selector settings--account-signin settings--account-tv hide" data-static="true">
        <div class="settings-param__name">#{account_tv_signin_title}</div>
    </div>

    <div class="settings-param-title settings--account-user hide"><span>#{settings_cub_account}</span></div>

    <div class="settings-param selector settings--account-user settings--account-user-info hide" data-static="true">
        <div class="settings-param__name">#{settings_cub_logged_in_as}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector settings--account-user settings--account-user-profile hide" data-static="true">
        <div class="settings-param__name">#{settings_cub_profile}</div>
        <div class="settings-param__value"></div>
    </div>

    <div class="settings-param selector settings--account-user settings--account-user-out hide" data-static="true">
        <div class="settings-param__name">#{settings_cub_logout}</div>
    </div>

    <div class="settings-param-title settings--account-user hide"><span>#{hooktv_group_data}</span></div>

    <div class="settings-param selector settings--account-user settings--account-user-sync hide" data-static="true">
        <div class="settings-param__name">#{settings_cub_sync_btn}</div>
        <div class="settings-param__value">#{settings_cub_sync_btn_descr}</div>
    </div>
</div>`

export default html

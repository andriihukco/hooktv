(function(){
    'use strict'

    var state = {original: null, draft: null, catalog: null, panel: 'plugins', saving: false, locale: 'en'}
    var status = document.getElementById('status')
    var workspace = document.getElementById('workspace')
    var loginPanel = document.getElementById('login-panel')
    var translations = {
        en: {
            adminNav: 'Admin', dashboard: 'Dashboard', sourcesAndPlugins: 'Sources & plugins', agentBoard: 'Agent board',
            language: 'Admin language', systemConfiguration: 'SYSTEM CONFIGURATION', intro: 'Choose which media sections, local bundles and online providers are available to every HOOK TV device.',
            reload: 'Reload', save: 'Save changes', adminAccess: 'ADMIN ACCESS', signInTitle: 'Sign in to manage this system',
            signInDescription: 'Your credentials are sent to the HOOK TV admin endpoint and are not stored in this browser.',
            username: 'Admin username', password: 'Admin password', signIn: 'Sign in', registryCounts: 'Registry counts', localBundles: 'local bundles',
            onlineProviders: 'online providers', communityPlugins: 'community plugins', systemAreas: 'System areas', installedPlugins: 'Installed plugins',
            onlineSources: 'Online sources', systemFlags: 'System flags', localPluginBundles: 'Local plugin bundles',
            localPluginDescription: 'Only bundles shipped with HOOK TV can be enabled here.', filterPlugins: 'Filter plugins',
            onlineProvidersTitle: 'Online providers', onlineProvidersDescription: 'These switches apply globally. A device can still hide any provider in its own settings.',
            filterProviders: 'Filter providers', filterCommunityPlugins: 'Filter community plugins', communityPluginsTitle: 'Community plugins',
            communityPluginsDescription: 'Each external plugin is off by default. Enabling one allows its remote script to run on HOOK TV devices.',
            systemFlagsTitle: 'System flags', systemFlagsDescription: 'Control which sections and integrations the app exposes on launch.',
            applyNote: 'Saved changes reach devices the next time they launch or reload HOOK TV.',
            statusChecking: 'Checking admin access…', statusLoading: 'Loading saved configuration…', statusSignIn: 'Sign in to continue.',
            statusLoaded: 'Configuration loaded. Changes are not active until saved.', statusSaving: 'Saving system configuration…',
            statusSaved: 'Saved. Devices will apply changes on their next launch.', statusLoadFailed: 'Could not load system configuration.',
            statusSaveFailed: 'Could not save system configuration.', statusServiceUnavailable: 'The admin service is unavailable.',
            statusNetworkError: 'Could not connect to the admin service.', statusSessionExpired: 'Your admin session expired. Sign in again.',
            statusConflict: 'Settings changed elsewhere. Reload before saving.', statusLocked: 'Too many attempts. Try again in 15 minutes.',
            statusLoginFailed: 'Incorrect username or password.', statusNoLocalMatch: 'No local plugin matches this filter.',
            statusNoSourceMatch: 'No online provider matches this filter.', statusNoExternalMatch: 'No community plugin matches this filter.',
            statusOnByDefault: 'on by default', statusOffByDefault: 'off by default', statusRequires: 'Requires',
            statusReviewPending: 'Review pending', statusSyntaxChecked: 'JavaScript syntax checked; not approved',
            statusDefault: 'defaults', revision: 'Revision', original: 'Original plugin',
            featureMovies: 'Movies', featureMoviesDescription: 'Show or hide the movie section.',
            featureSeries: 'Series', featureSeriesDescription: 'Show or hide the series section.',
            featureLiveTv: 'Live TV', featureLiveTvDescription: 'Controls the TV section and IPTV plugin.',
            featureMusic: 'Music', featureMusicDescription: 'Controls the music section and Radio plugin.',
            featureGames: 'Games', featureGamesDescription: 'Show or hide the games section.',
            featureVideos: 'Videos', featureVideosDescription: 'Show or hide the video section.',
            featureOnline: 'Online sources', featureOnlineDescription: 'Allow online providers and online-source plugins.',
            featurePlugins: 'Plugin loading', featurePluginsDescription: 'Allow selected local and community plugins to load.'
        },
        uk: {
            adminNav: 'Адміністрування', dashboard: 'Огляд', sourcesAndPlugins: 'Джерела й плагіни', agentBoard: 'Дошка агентів',
            language: 'Мова адміністратора', systemConfiguration: 'НАЛАШТУВАННЯ СИСТЕМИ', intro: 'Керуйте розділами медіа, вбудованими плагінами та онлайн-сервісами на пристроях HOOK TV.',
            reload: 'Оновити', save: 'Зберегти зміни', adminAccess: 'ДОСТУП АДМІНІСТРАТОРА', signInTitle: 'Увійдіть, щоб керувати системою',
            signInDescription: 'Облікові дані надсилаються до служби HOOK TV і не зберігаються в цьому браузері.',
            username: 'Ім’я адміністратора', password: 'Пароль адміністратора', signIn: 'Увійти', registryCounts: 'Кількість елементів', localBundles: 'вбудовані плагіни',
            onlineProviders: 'онлайн-сервіси', communityPlugins: 'плагіни спільноти', systemAreas: 'Розділи системи', installedPlugins: 'Встановлені плагіни',
            onlineSources: 'Онлайн-джерела', systemFlags: 'Функції системи', localPluginBundles: 'Вбудовані плагіни',
            localPluginDescription: 'Тут можна ввімкнути плагіни, що постачаються з HOOK TV.', filterPlugins: 'Пошук плагінів',
            onlineProvidersTitle: 'Онлайн-сервіси', onlineProvidersDescription: 'Ці перемикачі діють глобально. На пристрої сервіс можна приховати окремо.',
            filterProviders: 'Пошук сервісів', filterCommunityPlugins: 'Пошук плагінів спільноти', communityPluginsTitle: 'Плагіни спільноти',
            communityPluginsDescription: 'Зовнішні плагіни вимкнені за замовчуванням. Увімкнення дозволяє виконувати віддалений код на пристроях HOOK TV.',
            systemFlagsTitle: 'Функції системи', systemFlagsDescription: 'Керуйте розділами та інтеграціями, доступними після запуску.',
            applyNote: 'Пристрої застосують збережені зміни під час наступного запуску або перезавантаження HOOK TV.',
            statusChecking: 'Перевірка доступу адміністратора…', statusLoading: 'Завантаження налаштувань…', statusSignIn: 'Увійдіть, щоб продовжити.',
            statusLoaded: 'Налаштування завантажено. Зміни діятимуть після збереження.', statusSaving: 'Збереження налаштувань системи…',
            statusSaved: 'Збережено. Пристрої застосують зміни під час наступного запуску.', statusLoadFailed: 'Не вдалося завантажити налаштування системи.',
            statusSaveFailed: 'Не вдалося зберегти налаштування системи.', statusServiceUnavailable: 'Служба адміністратора недоступна.',
            statusNetworkError: 'Не вдалося підключитися до служби адміністратора.', statusSessionExpired: 'Сеанс адміністратора завершився. Увійдіть знову.',
            statusConflict: 'Налаштування змінилися в іншому сеансі. Оновіть панель перед збереженням.', statusLocked: 'Забагато спроб. Спробуйте знову через 15 хвилин.',
            statusLoginFailed: 'Неправильне ім’я або пароль.', statusNoLocalMatch: 'Немає вбудованих плагінів за цим запитом.',
            statusNoSourceMatch: 'Немає онлайн-сервісів за цим запитом.', statusNoExternalMatch: 'Немає плагінів спільноти за цим запитом.',
            statusOnByDefault: 'увімкнено за замовчуванням', statusOffByDefault: 'вимкнено за замовчуванням', statusRequires: 'Потрібно ввімкнути',
            statusReviewPending: 'Очікує перевірки', statusSyntaxChecked: 'Синтаксис JavaScript перевірено; плагін не схвалено',
            statusDefault: 'типові налаштування', revision: 'Версія налаштувань', original: 'Оригінальний плагін',
            featureMovies: 'Фільми', featureMoviesDescription: 'Показувати або приховувати розділ фільмів.',
            featureSeries: 'Серіали', featureSeriesDescription: 'Показувати або приховувати розділ серіалів.',
            featureLiveTv: 'Телебачення', featureLiveTvDescription: 'Керує розділом телебачення та плагіном IPTV.',
            featureMusic: 'Музика', featureMusicDescription: 'Керує розділом музики та плагіном Радіо.',
            featureGames: 'Ігри', featureGamesDescription: 'Показувати або приховувати розділ ігор.',
            featureVideos: 'Відео', featureVideosDescription: 'Показувати або приховувати розділ відео.',
            featureOnline: 'Онлайн-джерела', featureOnlineDescription: 'Дозволити онлайн-сервіси та плагіни онлайн-джерел.',
            featurePlugins: 'Завантаження плагінів', featurePluginsDescription: 'Дозволити запуск вибраних вбудованих плагінів і плагінів спільноти.'
        }
    }
    var featureLabels = {
        movies: ['featureMovies', 'featureMoviesDescription'],
        series: ['featureSeries', 'featureSeriesDescription'],
        live_tv: ['featureLiveTv', 'featureLiveTvDescription'],
        music: ['featureMusic', 'featureMusicDescription'],
        games: ['featureGames', 'featureGamesDescription'],
        videos: ['featureVideos', 'featureVideosDescription'],
        online_sources: ['featureOnline', 'featureOnlineDescription'],
        plugins: ['featurePlugins', 'featurePluginsDescription']
    }

    function t(key){
        return translations[state.locale][key] || translations.en[key] || key
    }

    function applyLocale(){
        document.documentElement.lang = state.locale
        document.querySelectorAll('[data-i18n]').forEach(function(element){
            var key = element.dataset.i18n
            if(translations[state.locale][key]) element.textContent = t(key)
        })
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(element){
            element.placeholder = t(element.dataset.i18nPlaceholder)
        })
        document.querySelectorAll('[data-i18n-aria]').forEach(function(element){
            element.setAttribute('aria-label', t(element.dataset.i18nAria))
        })
        document.title = t('sourcesAndPlugins') + ' — HOOK TV Admin'
        document.getElementById('admin-locale').value = state.locale
    }

    function esc(value){
        return String(value).replace(/[&<>"']/g, function(char){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]
        })
    }

    function cleanConfig(config){
        return {schema: config.schema, flags: config.flags, plugins: config.plugins, onlineSourceOverrides: config.onlineSourceOverrides, externalPlugins: config.externalPlugins}
    }

    function setStatus(message, kind){
        status.textContent = message
        status.dataset.state = kind || ''
    }

    function errorMessage(error, fallback){
        if(error.status === 401) return t('statusSessionExpired')
        if(error.status === 409) return t('statusConflict')
        if(error.status >= 500) return t('statusServiceUnavailable')
        return t(error.status ? fallback : 'statusNetworkError')
    }

    function switchButton(kind, key, value, disabled, label){
        return '<button type="button" class="switch" role="switch" aria-label="' + esc(label || key) + '" aria-checked="' + (value ? 'true' : 'false') + '" data-switch="' + esc(kind) + '" data-key="' + esc(key) + '" data-blocked="' + (disabled ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') + '></button>'
    }

    function renderPlugins(){
        var query = document.getElementById('plugin-search').value.trim().toLowerCase()
        var items = state.catalog.plugins.filter(function(plugin){
            return (plugin.name + ' ' + plugin.id + ' ' + plugin.description).toLowerCase().indexOf(query) >= 0
        })
        var box = document.getElementById('plugin-list')

        box.innerHTML = items.length ? items.map(function(plugin){
            var enabled = state.draft.plugins[plugin.id]
            var missingFeature = plugin.requiresFlag && !state.draft.flags[plugin.requiresFlag]
            var paused = state.draft.flags.plugins === false || missingFeature
            var requiredFeature = missingFeature ? '<span>' + esc(t('statusRequires')) + ' ' + esc(t(featureLabels[plugin.requiresFlag][0])) + '</span>' : ''
            return '<article class="managed-row' + (paused ? ' managed-row--paused' : '') + '"><div><div class="managed-row__title">' + esc(plugin.name) + '<span class="category">' + esc(plugin.category) + '</span></div><div class="managed-row__meta"><code>' + esc(plugin.id) + '</code><code>/plugins/' + esc(plugin.bundle) + '</code>' + requiredFeature + '</div><div class="managed-row__description">' + esc(plugin.description) + '</div></div>' + switchButton('plugin', plugin.id, enabled, !!paused, plugin.name) + '</article>'
        }).join('') : '<p class="empty-state">' + esc(t('statusNoLocalMatch')) + '</p>'
    }

    function sourceEnabled(source){
        var overrides = state.draft.onlineSourceOverrides
        return Object.prototype.hasOwnProperty.call(overrides, source.key) ? overrides[source.key] : source.off !== true
    }

    function renderSources(){
        var query = document.getElementById('source-search').value.trim().toLowerCase()
        var items = state.catalog.onlineSources.filter(function(source){
            return (source.display_name + ' ' + source.key + ' ' + (source.quality || '')).toLowerCase().indexOf(query) >= 0
        })
        var box = document.getElementById('source-list')

        box.innerHTML = items.length ? items.map(function(source){
            var enabled = sourceEnabled(source)
            var defaultLabel = source.off ? t('statusOffByDefault') : t('statusOnByDefault')
            var paused = state.draft.flags.online_sources === false
            return '<article class="managed-row' + (paused ? ' managed-row--paused' : '') + '"><div><div class="managed-row__title">' + esc(source.display_name) + '<span class="category">' + esc(source.quality || 'provider') + '</span></div><div class="managed-row__meta"><code>' + esc(source.key) + '</code><span>' + defaultLabel + '</span></div></div>' + switchButton('source', source.key, enabled, paused, source.display_name) + '</article>'
        }).join('') : '<p class="empty-state">' + esc(t('statusNoSourceMatch')) + '</p>'
    }

    function renderFeatures(){
        document.getElementById('feature-list').innerHTML = Object.keys(featureLabels).map(function(key){
            var label = t(featureLabels[key][0])
            return '<article class="feature-row"><div><strong>' + esc(label) + '</strong><span>' + esc(t(featureLabels[key][1])) + '</span></div>' + switchButton('flag', key, state.draft.flags[key], false, label) + '</article>'
        }).join('')
    }

    function renderExternalPlugins(){
        var query = document.getElementById('external-search').value.trim().toLowerCase()
        var items = state.catalog.externalPlugins.filter(function(plugin){
            return (plugin.title + ' ' + plugin.titleUk + ' ' + plugin.originalName + ' ' + plugin.category + ' ' + plugin.url + ' ' + plugin.description).toLowerCase().indexOf(query) >= 0
        })
        var box = document.getElementById('external-list')

        box.innerHTML = items.length ? items.map(function(plugin){
            var title = state.locale === 'uk' ? plugin.titleUk : plugin.title
            var category = state.locale === 'uk' ? plugin.categoryUk : plugin.category
            var description = state.locale === 'uk' ? plugin.descriptionUk : plugin.description
            var audit = plugin.audit
            var review = audit && audit.validPluginResponse ? t('statusSyntaxChecked') : t('statusReviewPending')
            var paused = state.draft.flags.plugins === false
            var enabled = state.draft.externalPlugins[plugin.url] === true
            return '<article class="managed-row managed-row--external' + (paused ? ' managed-row--paused' : '') + '"><div class="managed-row__copy"><div class="managed-row__title">' + esc(title) + '<span class="category">' + esc(category) + '</span></div><div class="managed-row__description">' + esc(description) + '</div><div class="managed-row__original">' + esc(t('original')) + ': ' + esc(plugin.originalName) + '</div><div class="managed-row__meta"><code>' + esc(plugin.url) + '</code><span class="audit-state ' + (audit ? '' : 'audit-state--blocked') + '">' + esc(review) + '</span></div></div>' + switchButton('external', plugin.url, enabled, paused, title + ' — ' + plugin.originalName) + '</article>'
        }).join('') : '<p class="empty-state">' + esc(t('statusNoExternalMatch')) + '</p>'
    }

    function render(){
        renderPlugins()
        renderSources()
        renderFeatures()
        renderExternalPlugins()
        document.getElementById('metric-bundles').textContent = state.catalog.plugins.length
        document.getElementById('metric-sources').textContent = state.catalog.onlineSources.length
        document.getElementById('metric-audit').textContent = state.catalog.externalPlugins.length
        document.getElementById('revision').textContent = t('revision') + ' ' + state.original.revision + (state.original.updatedAt ? ' · ' + new Date(state.original.updatedAt).toLocaleString(state.locale === 'uk' ? 'uk-UA' : 'en-US') : ' · ' + t('statusDefault'))
        document.getElementById('save').disabled = state.saving || JSON.stringify(cleanConfig(state.original)) === JSON.stringify(cleanConfig(state.draft))
    }

    function setBusy(busy){
        state.saving = busy
        document.getElementById('refresh').disabled = busy
        document.querySelectorAll('[data-switch]').forEach(function(button){
            button.disabled = busy || button.dataset.blocked === 'true'
        })
        if(state.original) document.getElementById('save').disabled = busy || JSON.stringify(cleanConfig(state.original)) === JSON.stringify(cleanConfig(state.draft))
    }

    function selectPanel(name){
        state.panel = name
        document.querySelectorAll('[data-tab]').forEach(function(tab){
            var selected = tab.dataset.tab === name
            tab.setAttribute('aria-selected', selected ? 'true' : 'false')
            tab.tabIndex = selected ? 0 : -1
        })
        document.querySelectorAll('[data-panel]').forEach(function(panel){ panel.hidden = panel.dataset.panel !== name })
    }

    async function load(){
        setStatus(t('statusLoading'))
        try {
            var response = await fetch('/api/admin/system-config', {cache: 'no-store', credentials: 'same-origin'})
            if(response.status === 401){
                workspace.hidden = true
                loginPanel.hidden = false
                setStatus(t('statusSignIn'))
                return
            }
            var data = await response.json()
            if(!response.ok) throw Object.assign(new Error(data.error || 'HTTP ' + response.status), {status: response.status})
            state.original = data.config
            state.draft = JSON.parse(JSON.stringify(data.config))
            state.catalog = data.catalog
            loginPanel.hidden = true
            workspace.hidden = false
            setStatus(t('statusLoaded'), 'success')
            render()
        } catch(error){
            setStatus(errorMessage(error, 'statusLoadFailed'), 'error')
        }
    }

    async function save(){
        if(state.saving || !state.original) return

        setStatus(t('statusSaving'))
        setBusy(true)
        try {
            var response = await fetch('/api/admin/system-config', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({expectedRevision: state.original.revision, config: cleanConfig(state.draft)})
            })
            var data = await response.json()
            if(!response.ok) throw Object.assign(new Error(data.error || 'HTTP ' + response.status), {status: response.status})
            state.original = data.config
            state.draft = JSON.parse(JSON.stringify(data.config))
            setStatus(t('statusSaved'), 'success')
        } catch(error){
            setStatus(errorMessage(error, 'statusSaveFailed'), 'error')
        } finally {
            setBusy(false)
            if(state.original) render()
        }
    }

    document.getElementById('login-form').addEventListener('submit', async function(event){
        event.preventDefault()
        var errorBox = document.getElementById('login-error')
        var username = document.getElementById('admin-username').value
        var password = document.getElementById('admin-password').value
        errorBox.textContent = ''
        try {
            var response = await fetch('/api/admin/login', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: username, password: password})
            })
            var data = await response.json()
            if(!response.ok) throw new Error(response.status === 429 ? t('statusLocked') : t('statusLoginFailed'))
            this.reset()
            await load()
        } catch(error){
            errorBox.textContent = error.message || t('statusLoginFailed')
        }
    })

    document.getElementById('refresh').addEventListener('click', function(){
        var dirty = state.original && JSON.stringify(cleanConfig(state.original)) !== JSON.stringify(cleanConfig(state.draft))
        if(!dirty || window.confirm('Discard unsaved changes and reload?')) load()
    })
    document.getElementById('save').addEventListener('click', save)
    document.getElementById('plugin-search').addEventListener('input', renderPlugins)
    document.getElementById('source-search').addEventListener('input', renderSources)
    document.getElementById('external-search').addEventListener('input', renderExternalPlugins)
    document.getElementById('admin-locale').addEventListener('change', function(){
        state.locale = this.value === 'uk' ? 'uk' : 'en'
        localStorage.setItem('hooktv_admin_locale', state.locale)
        applyLocale()
        if(state.catalog && state.draft){
            render()
            setStatus(t('statusLoaded'), 'success')
        }
    })

    document.querySelector('[role="tablist"]').addEventListener('click', function(event){
        var tab = event.target.closest('[data-tab]')
        if(tab) selectPanel(tab.dataset.tab)
    })
    document.querySelector('[role="tablist"]').addEventListener('keydown', function(event){
        if(['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) < 0) return
        var tabs = Array.from(document.querySelectorAll('[data-tab]'))
        var current = tabs.findIndex(function(tab){ return tab.dataset.tab === state.panel })
        var next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length
        event.preventDefault()
        selectPanel(tabs[next].dataset.tab)
        tabs[next].focus()
    })
    document.getElementById('workspace').addEventListener('click', function(event){
        var button = event.target.closest('[data-switch]')
        if(!button || button.disabled) return
        var kind = button.dataset.switch
        var key = button.dataset.key
        var value = button.getAttribute('aria-checked') !== 'true'
        if(kind === 'flag'){
            state.draft.flags[key] = value
            if(!value) state.catalog.plugins.filter(function(plugin){ return plugin.requiresFlag === key }).forEach(function(plugin){ state.draft.plugins[plugin.id] = false })
        }
        if(kind === 'plugin') state.draft.plugins[key] = value
        if(kind === 'source'){
            var source = state.catalog.onlineSources.find(function(item){ return item.key === key })
            if(value === (source.off !== true)) delete state.draft.onlineSourceOverrides[key]
            else state.draft.onlineSourceOverrides[key] = value
        }
        if(kind === 'external') state.draft.externalPlugins[key] = value
        render()
    })

    state.locale = localStorage.getItem('hooktv_admin_locale') === 'uk' ? 'uk' : 'en'
    applyLocale()
    load()
})();

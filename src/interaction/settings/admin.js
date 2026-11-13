import Template from '../template'
import Params from './params'
import {adminText, getAdminLocale, setAdminLocale} from './admin_locale'

const COMPONENT = 'hooktv_admin'
let templateReady = false
let openListenerReady = false

const featureLabels = {
    movies: {en: 'Movies', uk: 'Фільми'},
    series: {en: 'Series', uk: 'Серіали'},
    live_tv: {en: 'Live TV', uk: 'Телебачення'},
    music: {en: 'Music', uk: 'Музика'},
    games: {en: 'Games', uk: 'Ігри'},
    videos: {en: 'Videos', uk: 'Відео'},
    online_sources: {en: 'Online sources', uk: 'Онлайн-джерела'},
    plugins: {en: 'Plugin loading', uk: 'Завантаження плагінів'}
}

function cleanConfig(config){
    return {
        schema: config.schema,
        flags: {...config.flags},
        plugins: {...config.plugins},
        onlineSourceOverrides: {...config.onlineSourceOverrides},
        externalPlugins: {...config.externalPlugins}
    }
}

function configChanged(state){
    return JSON.stringify(cleanConfig(state.original)) !== JSON.stringify(cleanConfig(state.draft))
}

function setStatus(root, message, kind = ''){
    root.find('.hooktv-admin__status').text(message).attr('data-state', kind)
}

function section(root, title){
    const heading = $('<div class="settings-param-title"><span></span></div>')
    heading.find('span').text(title)
    root.append(heading)
}

function updateRow(row, enabled){
    row.attr('aria-checked', enabled ? 'true' : 'false')
    row.find('.hooktv-admin-row__state').text(adminText(enabled ? 'enabled' : 'disabled'))
    row.toggleClass('hooktv-admin-row--enabled', enabled)
}

function activate(row, action){
    let lastRemoteActivation = 0

    row.on('hover:enter', ()=>{
        lastRemoteActivation = Date.now()
        action()
    }).on('click', ()=>{
        if(Date.now() - lastRemoteActivation > 120) action()
    })
}

function appendRow(root, options){
    const row = $('<div class="settings-param selector hooktv-admin-row"></div>')
        .attr('role', options.role || 'switch')
        .attr('tabindex', '0')
        .attr('aria-label', options.ariaLabel || options.title)
        .attr('data-managed-kind', options.kind || '')
        .attr('data-managed-key', options.key || '')
        .attr('data-requires-flag', options.requiresFlag || '')

    if(options.role === 'button') row.attr('aria-pressed', options.pressed ? 'true' : 'false')
    else row.attr('aria-checked', options.enabled ? 'true' : 'false')

    const copy = $('<div class="hooktv-admin-row__copy"></div>')
    const title = $('<div class="settings-param__name hooktv-admin-row__name"></div>').text(options.title)
    copy.append(title)

    if(options.description){
        copy.append($('<div class="settings-param__descr hooktv-admin-row__description"></div>').text(options.description))
    }

    if(options.originalName){
        copy.append($('<div class="hooktv-admin-row__original"></div>').text(adminText('original') + ': ' + options.originalName))
    }

    if(options.meta){
        copy.append($('<div class="hooktv-admin-row__meta"></div>').text(options.meta))
    }

    row.append(copy)

    if(options.role === 'button'){
        row.append($('<div class="settings-param__value hooktv-admin-row__state"></div>').text(options.pressed ? adminText('selected') : ''))
    } else {
        row.append($('<div class="settings-param__value hooktv-admin-row__state"></div>').text(adminText(options.enabled ? 'enabled' : 'disabled')))
        row.toggleClass('hooktv-admin-row--enabled', Boolean(options.enabled))
    }

    root.append(row)

    return row
}

function rowDisabled(state, row){
    const kind = row.attr('data-managed-kind')
    const requiredFlag = row.attr('data-requires-flag')

    if(kind === 'plugin' && state.draft.flags.plugins === false) return true
    if(kind === 'external' && state.draft.flags.plugins === false) return true
    if(kind === 'source' && state.draft.flags.online_sources === false) return true
    if(requiredFlag && state.draft.flags[requiredFlag] === false) return true

    return false
}

function refreshRows(root, state){
    root.find('[data-managed-kind]').each(function(){
        const row = $(this)
        const kind = row.attr('data-managed-kind')
        const key = row.attr('data-managed-key')
        let enabled = false

        if(kind === 'flag') enabled = Boolean(state.draft.flags[key])
        if(kind === 'plugin') enabled = Boolean(state.draft.plugins[key])
        if(kind === 'external') enabled = Boolean(state.draft.externalPlugins[key])
        if(kind === 'source'){
            const source = state.catalog.onlineSources.find(item=>item.key === key)
            enabled = Object.prototype.hasOwnProperty.call(state.draft.onlineSourceOverrides, key)
                ? state.draft.onlineSourceOverrides[key]
                : Boolean(source && source.off !== true)
        }

        const disabled = rowDisabled(state, row)

        updateRow(row, enabled)
        row.attr('aria-disabled', disabled ? 'true' : 'false')
        row.toggleClass('hooktv-admin-row--disabled', disabled)
    })
}

function syncFooter(root, state){
    const changed = configChanged(state)
    const save = root.find('[data-admin-action="save"]')

    save.attr('aria-disabled', state.saving || !changed ? 'true' : 'false')
    save.toggleClass('hooktv-admin-row--disabled', state.saving || !changed)
    save.find('.hooktv-admin-row__state').text(state.saving ? adminText('saving') : changed ? adminText('changes') : adminText('unchanged'))
}

function renderPanel(root, state){
    const locale = getAdminLocale()
    root.empty().attr('role', 'region').attr('aria-label', adminText('heading', locale))

    const intro = $('<div class="hooktv-admin__intro"></div>')
    intro.append($('<div class="hooktv-admin__eyebrow"></div>').text('HOOK TV'))
    intro.append($('<h2 class="hooktv-admin__heading"></h2>').text(adminText('heading', locale)))
    if(state.original){
        intro.append($('<div class="hooktv-admin__revision"></div>').text(adminText('revision', locale) + ' ' + state.original.revision))
    }
    root.append(intro)

    const status = $('<div class="hooktv-admin__status" role="status" aria-live="polite"></div>')
    root.append(status)

    section(root, adminText('language', locale))
    ;['en', 'uk'].forEach(code=>{
        const selected = locale === code
        const row = appendRow(root, {
            role: 'button',
            title: adminText(code === 'en' ? 'english' : 'ukrainian', locale),
            pressed: selected,
            ariaLabel: adminText(code === 'en' ? 'english' : 'ukrainian', locale) + (selected ? ', ' + adminText('selected', locale) : '')
        }).attr('data-admin-locale', code)

        row.toggleClass('hooktv-admin-row--selected', selected)
        activate(row, ()=>{
            if(getAdminLocale() === code) return
            setAdminLocale(code)
            renderPanel(root, state)
            const next = root.find('[data-admin-locale="' + code + '"]')[0]
            if(next) Navigator.focused(next)
        })
    })

    if(!state.catalog || !state.draft){
        setStatus(root, adminText('loading', locale))
        return
    }

    section(root, adminText('features', locale))
    Object.keys(featureLabels).forEach(key=>{
        const label = featureLabels[key][locale]
        const row = appendRow(root, {
            title: label,
            description: key === 'plugins' ? adminText('localBundle', locale) : '',
            enabled: state.draft.flags[key],
            ariaLabel: label,
            kind: 'flag',
            key
        })

        activate(row, ()=>{
            const next = !state.draft.flags[key]
            state.draft.flags[key] = next

            if(!next){
                state.catalog.plugins.filter(plugin=>plugin.requiresFlag === key).forEach(plugin=>{
                    state.draft.plugins[plugin.id] = false
                })
            }

            updateRow(row, next)
            refreshRows(root, state)
            syncFooter(root, state)
        })
    })

    section(root, adminText('plugins', locale))
    state.catalog.plugins.forEach(plugin=>{
        const enabled = Boolean(state.draft.plugins[plugin.id])
        const row = appendRow(root, {
            title: plugin.name,
            description: plugin.description,
            meta: plugin.category,
            enabled,
            ariaLabel: plugin.name,
            kind: 'plugin',
            key: plugin.id,
            requiresFlag: plugin.requiresFlag
        })

        activate(row, ()=>{
            if(rowDisabled(state, row)) return
            const next = !state.draft.plugins[plugin.id]
            state.draft.plugins[plugin.id] = next
            updateRow(row, next)
            syncFooter(root, state)
        })
    })

    section(root, adminText('onlineSources', locale))
    state.catalog.onlineSources.forEach(source=>{
        const enabled = Object.prototype.hasOwnProperty.call(state.draft.onlineSourceOverrides, source.key)
            ? state.draft.onlineSourceOverrides[source.key]
            : source.off !== true
        const row = appendRow(root, {
            title: source.display_name,
            description: source.quality || adminText('onlineMedia', locale),
            enabled,
            ariaLabel: source.display_name,
            kind: 'source',
            key: source.key
        })

        activate(row, ()=>{
            if(rowDisabled(state, row)) return
            const next = !((Object.prototype.hasOwnProperty.call(state.draft.onlineSourceOverrides, source.key)
                ? state.draft.onlineSourceOverrides[source.key]
                : source.off !== true))

            if(next === (source.off !== true)) delete state.draft.onlineSourceOverrides[source.key]
            else state.draft.onlineSourceOverrides[source.key] = next

            updateRow(row, next)
            syncFooter(root, state)
        })
    })

    section(root, adminText('externalPlugins', locale))
    state.catalog.externalPlugins.forEach(plugin=>{
        const title = locale === 'uk' ? plugin.titleUk : plugin.title
        const category = locale === 'uk' ? plugin.categoryUk : plugin.category
        const description = locale === 'uk' ? plugin.descriptionUk : plugin.description
        const audit = plugin.audit ? plugin.audit.status + (plugin.audit.validPluginResponse ? ' · syntax valid' : '') : adminText('reviewPending', locale)
        const row = appendRow(root, {
            title: title || adminText('unknownSource', locale),
            description,
            originalName: plugin.originalName,
            meta: category + ' · ' + audit,
            enabled: Boolean(state.draft.externalPlugins[plugin.url]),
            ariaLabel: (title || adminText('unknownSource', locale)) + ', ' + plugin.originalName,
            kind: 'external',
            key: plugin.url
        })

        activate(row, ()=>{
            if(rowDisabled(state, row)) return
            const next = !state.draft.externalPlugins[plugin.url]
            state.draft.externalPlugins[plugin.url] = next
            updateRow(row, next)
            syncFooter(root, state)
        })
    })

    section(root, adminText('changes', locale))
    const save = appendRow(root, {
        role: 'button',
        title: adminText('save', locale),
        pressed: false,
        ariaLabel: adminText('save', locale)
    }).attr('data-admin-action', 'save')
    activate(save, ()=>saveConfig(root, state))

    const reload = appendRow(root, {
        role: 'button',
        title: adminText('reload', locale),
        pressed: false,
        ariaLabel: adminText('reload', locale)
    }).attr('data-admin-action', 'reload')
    activate(reload, ()=>{
        if(configChanged(state)){
            setStatus(root, adminText('saveBeforeReload'), 'warning')
            return
        }

        loadConfig(root)
    })

    setStatus(root, adminText(state.original ? 'loaded' : 'loading', locale), state.original ? 'success' : '')
    refreshRows(root, state)
    syncFooter(root, state)
    Params.listener.send('update_scroll')

    const first = root.find('.selector').first()[0]
    if(first) Navigator.focused(first)
}

function requestConfig(){
    return fetch('/api/admin/system-config', {
        credentials: 'same-origin',
        cache: 'no-store'
    }).then(async response=>{
        const data = await response.json()
        if(!response.ok) throw Object.assign(new Error(data.error || 'HTTP ' + response.status), {status: response.status})
        return data
    })
}

function loadConfig(root){
    const state = {original: null, draft: null, catalog: null, saving: false}
    renderPanel(root, state)
    setStatus(root, adminText('loading'), '')

    requestConfig().then(data=>{
        state.original = data.config
        state.draft = JSON.parse(JSON.stringify(data.config))
        state.catalog = data.catalog
        renderPanel(root, state)
    }).catch(error=>{
        const message = error.status === 401 ? adminText('signInAgain') : (error.message || adminText('loadFailed'))
        setStatus(root, message, 'error')
    })
}

function saveConfig(root, state){
    if(state.saving || !configChanged(state)) return

    state.saving = true
    setStatus(root, adminText('saving'), '')
    syncFooter(root, state)

    fetch('/api/admin/system-config', {
        method: 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            expectedRevision: state.original.revision,
            config: cleanConfig(state.draft)
        })
    }).then(async response=>{
        const data = await response.json()
        if(!response.ok) throw Object.assign(new Error(data.error || 'HTTP ' + response.status), {status: response.status})
        state.original = data.config
        state.draft = JSON.parse(JSON.stringify(data.config))
        setStatus(root, adminText('saved'), 'success')
    }).catch(error=>{
        setStatus(root, error.message || adminText('saveFailed'), 'error')
    }).finally(()=>{
        state.saving = false
        syncFooter(root, state)
    })
}

function handleOpen(event){
    $('body').toggleClass('hooktv-admin-open', event.name === COMPONENT)

    if(event.name !== COMPONENT) return

    const root = $(event.body).find('.hooktv-admin-settings')
    if(root.length) loadConfig(root)
}

function open(){
    if(!templateReady){
        Template.add('settings_' + COMPONENT, '<div class="hooktv-admin-settings"></div>')
        templateReady = true
    }

    const settings = window.Lampa && window.Lampa.Settings
    if(!settings) return

    if(!openListenerReady){
        settings.listener.follow('open', handleOpen)
        settings.listener.follow('close', ()=> $('body').removeClass('hooktv-admin-open'))
        openListenerReady = true
    }

    settings.create(COMPONENT)
}

export default {open}

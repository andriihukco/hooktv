(function(){
    'use strict'

    var cacheKey = 'hooktv_system_config_v1'
    var defaults = {
        schema: 1,
        flags: {
            movies: true,
            series: true,
            live_tv: true,
            music: true,
            games: true,
            videos: true,
            online_sources: true,
            plugins: true
        },
        plugins: {
            hooktv_core: true,
            hooktv_registry: true,
            collections: false,
            dlna: false,
            etor: false,
            halloween: false,
            iptv: false,
            logo_plugin: false,
            online: false,
            online_prestige: false,
            radio: false,
            record: false,
            snow: false,
            tmdb_proxy: false,
            tracks: false,
            twolines: false,
            view_plugin: false,
            'womens-day': false,
            zen_mode: false
        },
        externalPlugins: {},
        onlineSourceOverrides: {}
    }

    function isRecord(value){
        return value !== null && typeof value === 'object' && !Array.isArray(value)
    }

    function parse(value){
        if(!isRecord(value) || value.schema !== defaults.schema) return null
        if(!isRecord(value.flags) || !isRecord(value.plugins) || !isRecord(value.onlineSourceOverrides)) return null
        if(value.externalPlugins !== undefined && !isRecord(value.externalPlugins)) return null

        var config = {
            schema: defaults.schema,
            flags: Object.assign({}, defaults.flags),
            plugins: Object.assign({}, defaults.plugins),
            externalPlugins: {},
            onlineSourceOverrides: {}
        }

        for(var flag in value.flags){
            if(!Object.prototype.hasOwnProperty.call(config.flags, flag) || typeof value.flags[flag] !== 'boolean') return null
            config.flags[flag] = value.flags[flag]
        }

        for(var plugin in value.plugins){
            if(!Object.prototype.hasOwnProperty.call(config.plugins, plugin) || typeof value.plugins[plugin] !== 'boolean') return null
            config.plugins[plugin] = value.plugins[plugin]
        }

        for(var source in value.onlineSourceOverrides){
            if(!/^[a-z0-9_-]+$/.test(source) || typeof value.onlineSourceOverrides[source] !== 'boolean') return null
            config.onlineSourceOverrides[source] = value.onlineSourceOverrides[source]
        }

        var externalPlugins = value.externalPlugins || {}
        for(var url in externalPlugins){
            if(!/^https?:\/\//i.test(url) || typeof externalPlugins[url] !== 'boolean') return null
            config.externalPlugins[url] = externalPlugins[url]
        }

        return config
    }

    function apply(config){
        var enabled = Object.keys(config.plugins).filter(function(id){ return config.plugins[id] })
        var current = isRecord(window.hook_settings) ? window.hook_settings : {}

        window.hook_settings = Object.assign({}, current, {
            hooktv_system_flags: config.flags,
            hooktv_system_plugins: enabled,
            hooktv_system_external_plugins: config.externalPlugins,
            hooktv_system_source_overrides: config.onlineSourceOverrides
        })
    }

    function readCache(){
        try {
            var value = localStorage.getItem(cacheKey)
            return value ? parse(JSON.parse(value)) : null
        } catch(error){
            return null
        }
    }

    function writeCache(config){
        try {
            localStorage.setItem(cacheKey, JSON.stringify(config))
        } catch(error){
            // A storage quota or privacy setting must not prevent the app from starting.
        }
    }

    function load(){
        var cached = readCache()
        apply(cached || defaults)

        var controller = new AbortController()
        var timeout = setTimeout(function(){ controller.abort() }, 1200)

        return fetch('/api/system-config', {cache: 'no-store', signal: controller.signal})
            .then(function(response){
                if(!response.ok) throw new Error('HTTP ' + response.status)
                return response.json()
            })
            .then(function(value){
                var config = parse(value)
                if(!config) throw new Error('Invalid system configuration')
                writeCache(config)
                apply(config)
            })
            .catch(function(){
                if(!cached) apply(defaults)
            })
            .then(function(){ clearTimeout(timeout) })
    }

    window.hooktv_system_ready = load()
})();

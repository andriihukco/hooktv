import Brand from './brand.js'

let object = {
    author: 'HOOK TV',
    github: 'https://github.com/streamflow/app',
    css_version: '1.0.0',
    app_version: '1.0.0',
    website: 'https://streamflow.tv',
    apk_link_download: ''
}

// Initialize brand values after Brand is ready
try {
    object.author = Brand.getName('company')
    object.github = Brand.getUrl('github')
    object.css_version = Brand.getConfig().app.display_version
    object.app_version = Brand.getConfig().app.display_version
    object.website = Brand.getUrl('website')
    object.apk_link_download = Brand.getUrl('apk_download')
} catch (e) {
    console.warn('Brand not initialized yet, using defaults')
}

let plugins = []

Object.defineProperty(object, 'app_digital', { get: ()=> parseInt(object.app_version.replace(/\./g,'')) })
Object.defineProperty(object, 'css_digital', { get: ()=> parseInt(object.css_version.replace(/\./g,'')) })

Object.defineProperty(object, 'plugins', {
    get: ()=> plugins,
    set: (plugin)=> {
        if(typeof plugin == 'object' && typeof plugin.type == 'string'){
            plugins.push(plugin)
        }
    }
})

/**
 * Ссылка на GitHub с файлами приложения
 */
Object.defineProperty(object, 'github_lampa', { 
    get: ()=> './',
    set: ()=> {}
})

Object.defineProperty(object, 'github_repo', {
    get: ()=> {
        try {
            return Brand.getUrl('github')
        } catch (e) {
            return object.github
        }
    },
    set: ()=> {}
})

/**
 * Старые зеркала
 */
Object.defineProperty(object, 'old_mirrors', { 
    get: ()=> ['cub.red', 'standby.cub.red', 'kurwa-bober.ninja', 'nackhui.com'],
    set: ()=> {}
})

/**
 * Список зеркал приложения (для failover)
 */
Object.defineProperty(object, 'app_mirrors', {
    get: ()=> {
        try {
            let default_mirrors = (Brand.getConfig().urls && Brand.getConfig().urls.mirrors && Brand.getConfig().urls.mirrors.length)
                ? Brand.getConfig().urls.mirrors
                : ['cub.rip', 'durex.monster', 'cubnotrip.top']
            let user_mirrors = localStorage.getItem('app_mirrors') || localStorage.getItem('cub_mirrors') || '[]'

            try {
                user_mirrors = JSON.parse(user_mirrors)
            } catch (e) {
                user_mirrors = []
            }

            if(Object.prototype.toString.call( user_mirrors ) === '[object Array]' && user_mirrors.length){
                return default_mirrors.concat(user_mirrors)
            }

            return default_mirrors
        } catch (e) {
            return ['cub.rip', 'durex.monster', 'cubnotrip.top']
        }
    },
    set: ()=> {}
})

// Alias cub_mirrors to app_mirrors for backward compatibility
Object.defineProperty(object, 'cub_mirrors', {
    get: ()=> object.app_mirrors,
    set: ()=> {}
})

/**
 * Список зеркал для сокета, вынесены отдельно, так как могут отличаться от обычных зеркал
 */
Object.defineProperty(object, 'socket_mirrors', {
    get: ()=> {
        try {
            let mirrors = (Brand.getConfig().services && Brand.getConfig().services.socket && Brand.getConfig().services.socket.mirrors && Brand.getConfig().services.socket.mirrors.length)
                ? Brand.getConfig().services.socket.mirrors
                : ['cub.rip', 'kurwa-bober.ninja', 'nackhui.com']
            return mirrors
        } catch (e) {
            return ['cub.rip', 'kurwa-bober.ninja', 'nackhui.com']
        }
    },
    set: ()=> {}
})

// Alias soc_mirrors to socket_mirrors for backward compatibility
Object.defineProperty(object, 'soc_mirrors', {
    get: ()=> object.socket_mirrors,
    set: ()=> {}
})

/**
 * Текущее доменное имя приложения
 */
Object.defineProperty(object, 'app_domain', {
    get: ()=> {
        try {
            let use = localStorage.getItem('app_domain') || localStorage.getItem('cub_domain') || ''

            return object.app_mirrors.indexOf(use) > -1 ? use : object.app_mirrors[0] || 'cub.rip'
        } catch (e) {
            return object.website || 'cub.rip'
        }
    }
})

// Alias cub_domain and cub_site to app_domain for backward compatibility
Object.defineProperty(object, 'cub_domain', {
    get: ()=> object.app_domain,
    set: ()=> {}
})

Object.defineProperty(object, 'cub_site', {
    get: ()=> object.cub_domain,
    set: ()=> {}
})

/**
 * Ссылка на QR код для авторизации
 */
Object.defineProperty(object, 'qr_auth', {
    get: ()=> {
        try {
            return object.app_domain + '/img/other/qr-code-strong.png'
        } catch (e) {
            return object.website + '/img/other/qr-code-strong.png'
        }
    }
})

// Alias qr_site to qr_auth for backward compatibility
Object.defineProperty(object, 'qr_site', {
    get: ()=> object.qr_auth,
    set: ()=> {}
})

/**
 * Ссылка на QR для добавления устройства
 */
Object.defineProperty(object, 'qr_device_add', {
    get: ()=> {
        try {
            return object.app_domain + '/img/other/qr-add-device.png'
        } catch (e) {
            return object.website + '/img/other/qr-add-device.png'
        }
    }
})

export default object

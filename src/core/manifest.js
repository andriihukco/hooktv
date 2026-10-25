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

export default object

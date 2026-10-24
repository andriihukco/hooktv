/**
 * Brand Configuration System
 * Centralized branding with customizable tokens for complete rebranding capability
 */

const BRAND_CONFIG = {
    // Basic Brand Information
    name: {
        short: 'HOOK',           // Short brand name (displayed in UI)
        full: 'HOOK TV',         // Full brand name
        company: 'HOOK TV',     // Company name
        product: 'HOOK TV'    // Product name
    },
    
    // URLs and Links
    urls: {
        website: '',
        github: '',
        support: '',
        privacy: '',
        terms: '',
        apk_download: '',
        api_base: '',
        mirrors: [] // Additional mirror URLs for failover
    },
    
    // App Identity
    app: {
        id: 'tv.streamflow.app',
        version: '1.0.0',
        build_number: '1',
        display_version: '1.0.0'
    },
    
    // Visual Branding
    visual: {
        // Primary colors (electric lime)
        primary: '#C8F542',
        primary_hover: '#D6FF5C',
        primary_dark: '#A6D12A',
        on_primary: '#0B0F00',

        // Background colors
        background: '#000000',
        surface_1: '#121214',
        surface_2: '#1C1C1F',
        glass: 'rgba(30, 30, 32, 0.62)',

        // Text colors
        text_primary: '#FFFFFF',
        text_secondary: 'rgba(255, 255, 255, 0.62)',

        // Accent colors
        accent: '#C8F542',
        accent_hover: '#D6FF5C',
        focus_ring: '#C8F542',

        // UI elements
        border: 'rgba(255, 255, 255, 0.12)',
        divider: '#1C1C1F',
        overlay: 'rgba(0, 0, 0, 0.7)',

        // Gradients
        gradient_primary: 'linear-gradient(135deg, #D6FF5C 0%, #A6D12A 100%)',
        gradient_card: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)'
    },
    
    // Logo and Icons
    logo: {
        path: './img/logo',
        extension: 'svg',
        favicon: './favicon.ico',
        icon: './img/icon.png'
    },
    
    // Text/Strings (can be overridden by language files)
    text: {
        welcome: 'Welcome to HOOK TV',
        loading: 'Loading...',
        error: 'Something went wrong',
        retry: 'Retry',
        cancel: 'Cancel',
        confirm: 'Confirm',
        search: 'Search titles, people, genres',
        my_list: 'My List',
        continue_watching: 'Continue Watching',
        popular: 'Popular on HOOK TV',
        new_releases: 'New Releases',
        top_10: 'Top 10 Today'
    },
    
    // Feature Flags
    features: {
        // Account & Sync
        account_sync: true,
        account_cloud: true,
        
        // Content
        torrents: true,
        online_sources: true,
        iptv: true,
        
        // Social
        reactions: true,
        discussions: true,
        reviews: true,
        
        // Advanced
        ai_recommendations: true,
        parental_control: true,
        subtitles: true,
        
        // Extensions
        plugins: true,
        themes: true,
        
        // Technical
        torrserver: true,
        proxy: false,
        vpn: false
    },
    
    // Service Configuration
    services: {
        // TMDB API
        tmdb: {
            enabled: true,
            api_key: '', // Will be loaded from secure storage
            image_base: 'https://image.tmdb.org/t/p/',
            image_sizes: {
                poster: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
                backdrop: ['w300', 'w780', 'w1280', 'original'],
                profile: ['w45', 'w185', 'h632', 'original'],
                still: ['w92', 'w185', 'w300', 'original']
            }
        },
        
        // Torrent Server
        torrserver: {
            enabled: true,
            default_url: 'http://localhost:8090',
            preload: true,
            save_to_db: true
        },
        
        // Socket/Real-time
        socket: {
            enabled: true,
            url: undefined, // Will use default from manifest
            methods: true
        }
    },
    
    // Content Moderation
    moderation: {
        dmca_block: false,
        lgbt_block: false,
        custom_blacklist: []
    },
    
    // UI/UX Settings
    ui: {
        // Layout
        card_size: 'medium', // small, medium, large
        card_quality: true,
        blur_poster: true,
        
        // Navigation
        navigation_type: 'dpad', // dpad, mouse, touch
        keyboard_type: 'normal', // normal, integrated
        
        // Performance
        request_caching: true,
        pages_save_total: 5,
        
        // Screensaver
        screensaver: true,
        screensaver_type: 'default', // default, clock, dim
        screensaver_time: 10 // minutes
    },
    
    // Platform-specific overrides
    platform: {
        android: {
            enable_torrents: true,
            enable_plugins: true
        },
        ios: {
            enable_torrents: false,
            enable_plugins: false
        },
        web: {
            enable_torrents: true,
            enable_plugins: true
        },
        tv: {
            enable_torrents: true,
            enable_plugins: true
        }
    },
    
    // Metadata
    metadata: {
        author: 'HOOK TV',
        license: 'Proprietary',
        copyright: `© ${new Date().getFullYear()} HOOK TV. All rights reserved.`
    }
}

/**
 * Brand Manager Class
 * Handles brand configuration and provides access to brand tokens
 */
class BrandManager {
    constructor() {
        this.config = BRAND_CONFIG
        this.overrides = {}
        this.loadOverrides()
    }
    
    /**
     * Load brand overrides from localStorage or remote config
     */
    loadOverrides() {
        try {
            const stored = localStorage.getItem('brand_overrides')
            if (stored) {
                this.overrides = JSON.parse(stored)
                this.applyOverrides()
            }
        } catch (e) {
            console.warn('Failed to load brand overrides:', e)
        }
    }
    
    /**
     * Apply overrides to base configuration
     */
    applyOverrides() {
        this.config = this.deepMerge(this.config, this.overrides)
    }
    
    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        const output = { ...target }
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] })
                    } else {
                        output[key] = this.deepMerge(target[key], source[key])
                    }
                } else {
                    Object.assign(output, { [key]: source[key] })
                }
            })
        }
        
        return output
    }
    
    /**
     * Check if value is object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item)
    }
    
    /**
     * Get brand name
     */
    getName(type = 'short') {
        return this.config.name[type] || this.config.name.short
    }
    
    /**
     * Get URL
     */
    getUrl(type) {
        return this.config.urls[type] || ''
    }
    
    /**
     * Get color
     */
    getColor(type) {
        return this.config.visual[type] || '#FFFFFF'
    }
    
    /**
     * Get feature flag
     */
    getFeature(feature) {
        return this.config.features[feature] !== undefined 
            ? this.config.features[feature] 
            : false
    }
    
    /**
     * Get service config
     */
    getService(service) {
        return this.config.services[service] || {}
    }
    
    /**
     * Get UI setting
     */
    getUI(setting) {
        return this.config.ui[setting]
    }
    
    /**
     * Get text/string
     */
    getText(key) {
        return this.config.text[key] || key
    }
    
    /**
     * Override brand configuration
     */
    setOverride(path, value) {
        const keys = path.split('.')
        let current = this.overrides
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {}
            }
            current = current[keys[i]]
        }
        
        current[keys[keys.length - 1]] = value
        
        this.saveOverrides()
        this.applyOverrides()
    }
    
    /**
     * Save overrides to localStorage
     */
    saveOverrides() {
        try {
            localStorage.setItem('brand_overrides', JSON.stringify(this.overrides))
        } catch (e) {
            console.warn('Failed to save brand overrides:', e)
        }
    }
    
    /**
     * Reset to default brand configuration
     */
    reset() {
        this.overrides = {}
        this.config = BRAND_CONFIG
        this.saveOverrides()
    }
    
    /**
     * Get full configuration
     */
    getConfig() {
        return this.config
    }
    
    /**
     * Export configuration as JSON
     */
    export() {
        return JSON.stringify(this.config, null, 2)
    }
    
    /**
     * Import configuration from JSON
     */
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString)
            this.overrides = imported
            this.applyOverrides()
            this.saveOverrides()
            return true
        } catch (e) {
            console.error('Failed to import brand configuration:', e)
            return false
        }
    }
}

// Create singleton instance
const Brand = new BrandManager()

export default Brand

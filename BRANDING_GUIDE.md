# HOOK TV Branding Guide

## Complete Rebranding Instructions

This guide explains how to completely rebrand the application with a new name, colors, and identity.

## Quick Start

### 1. Basic Brand Customization

Edit `src/core/brand.js` to change the basic brand identity:

```javascript
const BRAND_CONFIG = {
    name: {
        short: 'YourBrand',           // Short name (displayed in UI)
        full: 'YourBrand TV',         // Full brand name
        company: 'YourCompany Inc',   // Company name
        product: 'YourBrand Media'    // Product name
    },
    
    urls: {
        website: 'https://yourbrand.tv',
        github: 'https://github.com/yourbrand/app',
        // ... other URLs
    },
    
    visual: {
        primary: '#YOUR_COLOR',       // Primary brand color
        background: '#000000',       // Background color
        // ... other colors
    }
}
```

### 2. Runtime Brand Override

You can override brand settings at runtime using the Brand API:

```javascript
import Brand from './core/brand'

// Change brand name
Brand.setOverride('name.short', 'NewBrand')

// Change primary color
Brand.setOverride('visual.primary', '#FF0000')

// Change website URL
Brand.setOverride('urls.website', 'https://newbrand.tv')
```

### 3. CSS Custom Properties

All colors are available as CSS custom properties in `src/sass/brand.scss`:

```css
:root {
    --brand-primary: #C8F542;
    --brand-on-primary: #0B0F00;
    --brand-background: #000;
    --text-primary: #fff;
    /* ... more variables */
}
```

Use these in your component styles:

```css
.my-button {
    background-color: var(--brand-primary);
    color: var(--brand-text-primary);
}
```

## Brand Configuration Structure

### Complete Configuration Object

```javascript
{
    // Brand Names
    name: {
        short: 'HOOK',                 // UI display name
        full: 'HOOK TV',               // Full name
        company: 'HOOK TV',            // Legal company
        product: 'HOOK TV'             // Product name
    },
    
    // URLs
    urls: {
        website: '',
        github: '',
        support: '',
        privacy: '',
        terms: '',
        apk_download: '',
        api_base: '',
        mirrors: []                    // Failover mirrors
    },
    
    // App Identity
    app: {
        id: 'tv.streamflow.app',
        version: '1.0.0',
        build_number: '1',
        display_version: '1.0.0'
    },
    
    // Visual Design
    visual: {
        primary: '#C8F542',
        primary_hover: '#D6FF5C',
        primary_dark: '#A6D12A',
        on_primary: '#0B0F00',
        background: '#000000',
        surface_1: '#121214',
        surface_2: '#1C1C1F',
        glass: 'rgba(30, 30, 32, 0.62)',
        text_primary: '#FFFFFF',
        text_secondary: 'rgba(255, 255, 255, 0.62)',
        accent: '#C8F542',
        accent_hover: '#D6FF5C',
        focus_ring: '#C8F542',
        border: 'rgba(255, 255, 255, 0.12)',
        divider: '#1C1C1F',
        overlay: 'rgba(0, 0, 0, 0.7)',
        gradient_primary: 'linear-gradient(135deg, #D6FF5C 0%, #A6D12A 100%)',
        gradient_card: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%)'
    },
    
    // Logo Paths
    logo: {
        path: './img/logo',
        extension: 'svg',
        favicon: './favicon.ico',
        icon: './img/icon.png'
    },
    
    // UI Text
    text: {
        welcome: 'Welcome to HOOK TV',
        loading: 'Loading...',
        error: 'Something went wrong',
        // ... more strings
    },
    
    // Feature Flags
    features: {
        account_sync: true,
        torrents: true,
        online_sources: true,
        iptv: true,
        // ... more features
    },
    
    // Service Configuration
    services: {
        tmdb: { /* TMDB config */ },
        torrserver: { /* Torrent server config */ },
        socket: { /* Socket config */ }
    },
    
    // Content Moderation
    moderation: {
        dmca_block: false,
        lgbt_block: false,
        custom_blacklist: []
    },
    
    // UI Settings
    ui: {
        card_size: 'medium',
        card_quality: true,
        blur_poster: true,
        navigation_type: 'dpad',
        // ... more settings
    },
    
    // Platform-specific
    platform: {
        android: { /* Android overrides */ },
        ios: { /* iOS overrides */ },
        web: { /* Web overrides */ },
        tv: { /* TV overrides */ }
    }
}
```

## Brand API Methods

### Get Methods

```javascript
// Get brand name
Brand.getName('short')        // Returns: 'HOOK'
Brand.getName('full')         // Returns: 'HOOK TV'

// Get URL
Brand.getUrl('website')       // Returns: '' (not set yet)
Brand.getUrl('github')        // Returns: '' (not set yet)

// Get color
Brand.getColor('primary')     // Returns: '#C8F542'
Brand.getColor('background')  // Returns: '#000000'

// Get feature flag
Brand.getFeature('torrents')  // Returns: true

// Get service config
Brand.getService('tmdb')      // Returns: TMDB config object

// Get UI setting
Brand.getUI('card_size')      // Returns: 'medium'

// Get text string
Brand.getText('welcome')      // Returns: 'Welcome to HOOK TV'

// Get full config
Brand.getConfig()             // Returns: complete config object
```

### Set Methods

```javascript
// Set override using dot notation
Brand.setOverride('name.short', 'NewBrand')
Brand.setOverride('visual.primary', '#FF0000')
Brand.setOverride('urls.website', 'https://newbrand.tv')

// Overrides are saved to localStorage automatically
```

### Utility Methods

```javascript
// Reset to default configuration
Brand.reset()

// Export configuration as JSON
const json = Brand.export()

// Import configuration from JSON
Brand.import(jsonString)
```

## Rebranding Checklist

### Step 1: Update Brand Configuration
- [ ] Edit `src/core/brand.js` with new brand name
- [ ] Update all URLs (website, github, support, etc.)
- [ ] Change visual colors (primary, background, text)
- [ ] Update app version and build number
- [ ] Set feature flags according to your needs

### Step 2: Update Assets
- [ ] Replace logo files in `./img/logo/`
- [ ] Update favicon.ico
- [ ] Update app icon
- [ ] Replace any brand-specific images

### Step 3: Update Text/Strings
- [ ] Edit `text` object in brand config
- [ ] Update language files in `src/lang/`
- [ ] Check all user-facing strings
- [ ] Update welcome screen text

### Step 4: Update Documentation
- [ ] Update README.md
- [ ] Update LICENSE file
- [ ] Update package.json (name, description, author)
- [ ] Update any online documentation

### Step 5: Remove Old Branding
- [ ] Search and replace old brand name in code
- [ ] Remove old URLs and references
- [ ] Clean up old logo assets
- [ ] Update any hardcoded brand strings

### Step 6: Test
- [ ] Verify brand name displays correctly
- [ ] Check all colors are applied
- [ ] Test all URLs work
- [ ] Verify feature flags work as expected
- [ ] Test on different platforms

## Remote Brand Configuration

You can load brand configuration from a remote server:

```javascript
// Fetch brand config from server
fetch('https://yourbrand.tv/brand-config.json')
    .then(res => res.json())
    .then(config => {
        Brand.import(JSON.stringify(config))
    })
```

Example remote config:

```json
{
    "name": {
        "short": "RemoteBrand",
        "full": "RemoteBrand TV"
    },
    "visual": {
        "primary": "#00FF00",
        "background": "#000000"
    },
    "urls": {
        "website": "https://remotebrand.tv"
    }
}
```

## White-Label Deployment

For white-label deployments, you can:

1. **Pre-configure brand in build**:
   ```javascript
   // In src/core/brand.js
   const BRAND_CONFIG = {
       name: { short: 'WhiteLabelBrand' },
       // ... your white-label config
   }
   ```

2. **Load from environment variables**:
   ```javascript
   const BRAND_CONFIG = {
       name: {
           short: process.env.BRAND_NAME || 'DefaultBrand'
       },
       // ...
   }
   ```

3. **Load from remote config at runtime**:
   ```javascript
   // On app startup
   const remoteConfig = await fetchBrandConfig()
   Brand.import(remoteConfig)
   ```

## Platform-Specific Branding

You can have different branding per platform:

```javascript
// In src/core/brand.js
platform: {
    android: {
        name: { short: 'BrandAndroid' },
        visual: { primary: '#FF0000' }
    },
    ios: {
        name: { short: 'BrandiOS' },
        visual: { primary: '#0000FF' }
    }
}
```

Access platform-specific config:

```javascript
const platform = Platform.get() // 'android', 'ios', 'web', 'tv'
const platformConfig = Brand.getConfig().platform[platform]
```

## Removing CUB References

The following files have been updated to remove CUB branding:

- `src/core/manifest.js` - Removed CUB mirrors and domain references
- `src/interaction/torserver.js` - Updated torrent titles to use brand name
- `src/templates/settings/main.js` - Removed CUB sync from main settings
- `src/templates/settings/more.js` - Moved CUB sync to advanced settings

To complete CUB removal:

1. Search for remaining references:
   ```bash
   grep -r "cub" src/ --ignore-case
   ```

2. Update language files in `src/lang/`
3. Update any hardcoded URLs
4. Remove CUB-specific services if not needed

## Color Scheme Examples

### HOOK TV Electric Lime (Default)
```javascript
visual: {
    primary: '#C8F542',
    background: '#000000',
    text_primary: '#FFFFFF'
}
```

### Dark Blue Theme
```javascript
visual: {
    primary: '#3B82F6',
    background: '#0F172A',
    text_primary: '#FFFFFF'
}
```

### Purple Theme
```javascript
visual: {
    primary: '#8B5CF6',
    background: '#1E1B4B',
    text_primary: '#FFFFFF'
}
```

### Green Theme
```javascript
visual: {
    primary: '#10B981',
    background: '#064E3B',
    text_primary: '#FFFFFF'
}
```

## Support

For questions or issues with branding:
- Check the design system: `DESIGN_SYSTEM.md`
- Review the API documentation above
- Test changes in development before production

## License

This branding system is part of the HOOK TV application. Ensure your branding complies with the application license.

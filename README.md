# HOOK TV

Modern streaming application with Netflix-inspired UI/UX, built-in torrent support, and customizable branding.

HOOK TV is a streaming app for web, Android TV, and TV platforms. It is built for a couch-first experience: large focus states, a light and a dark theme that match Apple's system look, and a settings screen that shows only the essentials.

## Features

- **Apple-style themes**: Light, dark, or follow the system. Switch in Settings → Interface → Theme.
- **Brightness control**: Dim the screen in software from 100% down to 40%, without touching the device.
- **Essential settings first**: The main menu holds Interface, Player, TorrServer, Parental Control, and Other. Everything else lives under Other.
- **One-tap TorrServer setup**: Settings → TorrServer → "Find server automatically" looks for TorrServer on this device and connects to it.
- **Rounded, filled icons**: Material Icons (Rounded, Filled) are inlined as SVG, so there is no icon font to download.
- **Lightweight release builds**: `npm run release` produces a minified web bundle.
- **Minimal, Netflix-style navigation**: one top bar with Home, Movies, Series and Favorites, plus search and settings. The product profile lives in `window.lampa_settings` in `src/app.js` (`minimal_ui`, `account_use`, `plugins_use`, `torrents_use`).
- **No playback source is bundled**: playback needs a licensed source to be added to the app. Torrent and plugin sources are off in this profile.

## Branding

Complete rebranding is possible through the centralized brand configuration system. See [BRANDING_GUIDE.md](BRANDING_GUIDE.md) for detailed instructions.

### Quick Brand Change

Edit `src/core/brand.js`:

```javascript
const BRAND_CONFIG = {
    name: {
        short: 'HOOK',
        full: 'HOOK TV'
    },
    visual: {
        primary: '#0A84FF',
        background: '#000000'
    }
}
```

## Design System

The application follows a comprehensive design system documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

### Key Design Principles

- Content-first design
- Smooth motion and animations
- Clear visual hierarchy
- Accessibility-first approach
- Responsive across all devices

## Architecture

- **Modular Components**: Reusable UI components with clear separation of concerns
- **Service Layer**: Business logic separated from UI
- **State Management**: Centralized state with local storage persistence
- **Plugin System**: Extensible architecture for adding features
- **Theme System**: Design tokens in `src/sass/theme/tokens.scss`; the active theme is set as `data-theme` on `<html>`
- **Icons**: `src/templates/icons/sprite.js` (navigation and head), `src/utils/material.js` (inline glyphs)

## Configuration

### Brand Configuration

See `src/core/brand.js` for all brand-related settings.

### Feature Flags

Enable/disable features through the brand configuration:

```javascript
features: {
    torrents: true,
    online_sources: true,
    iptv: true,
    account_sync: true
}
```

### Service Configuration

Configure external services (TMDB, TorrServer, etc.) in brand config. The API and CDN endpoints in `src/core/brand.js` are the defaults; change them there before you deploy your own copy.

## Documentation

| Document | For |
|---|---|
| [Development, stage and production](docs/DEVELOPMENT.md) | Setting up, running, staging, deploying, environment variables |
| [Git workflow](docs/GIT_WORKFLOW.md) | Branches, features, fixes, commit and push (with diagrams) |
| [Engineering audit](docs/AUDIT.md) | Current state, risks and findings |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | What to fix next, in what order |

## Migration

For migration from previous versions, see [UPGRADE.md](UPGRADE.md).

## Contributing

We welcome contributions! Please:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure accessibility standards

## License

Proprietary - All rights reserved.

## Support

For support and documentation, see the in-app documentation or contact the development team.

## Acknowledgments

Built with modern web technologies and inspired by the best streaming platforms.


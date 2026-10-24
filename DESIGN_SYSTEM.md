# HOOK TV Design System

## Overview
Apple TV-inspired UI/UX design system for HOOK TV: a calm black interface with an electric-lime accent, frosted glass and large rounded posters, across TV, phone and desktop.

## Design Principles

### 1. Content-First Design
- **Focus**: Content is the hero. UI elements should be subtle and fade into the background.
- **Implementation**: Dark backgrounds, minimal chrome, large immersive posters
- **Guideline**: Use 16:9 or 2.39:1 aspect ratios for cinematic feel

### 2. Smooth Motion
- **Principle**: All interactions should feel fluid and responsive
- **Timing**: 
  - Fast transitions: 150ms (hover states, button interactions)
  - Base transitions: 200ms (panel slides, card scaling)
  - Slow transitions: 300ms (page transitions, modal animations)
- **Easing**: cubic-bezier(0.4, 0, 0.2, 1) for natural feel

### 3. Visual Hierarchy
- **Primary Actions**: Electric-lime accent (`#C8F542`) with near-black text (`#0B0F00`)
- **Secondary Actions**: Subtle gray with white text
- **Tertiary Actions**: Minimal outlines or ghost buttons
- **Typography**: Clear size and weight differentiation

### 4. Accessibility
- **Contrast**: Minimum 4.5:1 for text, 3:1 for large text
- **Focus States**: 3px lime ring with a 2px black gap for TV/keyboard navigation (`@include hk-focus`)
- **Touch Targets**: Minimum 44x44px for mobile

## Color System

### Primary Colors
```css
--brand-primary: #C8F542;        /* Electric lime */
--brand-primary-hover: #D6FF5C;  /* Hover */
--brand-primary-dark: #A6D12A;   /* Pressed / dark */
--brand-on-primary: #0B0F00;     /* Text on lime (>= 14:1) */
```

### Background and Surfaces
```css
--brand-background: #000;        /* Main background */
--surface-1: #121214;            /* Raised */
--surface-2: #1C1C1F;            /* Raised, nested */
--glass: rgba(30,30,32,.62);     /* Frosted panels */
--glass-blur: blur(30px) saturate(1.4); /* Static, never animated */
```

### Text Colors
```css
--text-primary: #fff;
--text-secondary: rgba(255,255,255,.62);
--focus-ring: #C8F542;
```

### Mixins (`src/sass/brand.scss`)
- `@include hk-focus` - 3px lime ring with a 2px black gap.
- `@include hk-glass` - glass background plus static backdrop blur.
- `@include hk-hover { &:hover { ... } }` - hover only under `(hover: hover) and (pointer: fine)`.

### Logo
- `public/img/logo.svg` - dark pill with white "HOOK" (second O is a lime play button) and lime "TV" to the right.
- `public/img/logo-icon.svg` - the lime play-O in a dark rounded square (app icon, favicon source).

## Typography Scale

### Font Families
- **Primary**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif
- **Monospace**: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace

### Size Scale
```css
--font-size-xs: 0.75rem;    /* 12px - Captions, labels */
--font-size-sm: 0.875rem;   /* 14px - Secondary text */
--font-size-base: 1rem;     /* 16px - Body text */
--font-size-lg: 1.125rem;   /* 18px - Subheadings */
--font-size-xl: 1.25rem;    /* 20px - Headings */
--font-size-2xl: 1.5rem;    /* 24px - Large headings */
--font-size-3xl: 2rem;      /* 32px - Hero text */
--font-size-4xl: 2.5rem;    /* 40px - Display text */
--font-size-5xl: 3rem;      /* 48px - Hero display */
```

### Weight Scale
```css
--font-weight-normal: 400;   /* Regular */
--font-weight-medium: 500;   /* Medium */
--font-weight-semibold: 600; /* Semibold */
--font-weight-bold: 700;     /* Bold */
```

## Spacing System

### Scale (based on 4px grid)
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

## Component Architecture

### 1. Card Components
**Purpose**: Display content in a grid layout

**Variants**:
- `CardSmall`: 120px width (mobile lists)
- `CardMedium`: 160px width (standard grid)
- `CardLarge`: 200px width (featured content)
- `CardHero`: Full-width banner

**States**:
- Default: Dark overlay, subtle border
- Hover/Focus: Scale 1.05, bright border, full poster reveal
- Loading: Skeleton animation
- Error: Placeholder with retry option

**Structure**:
```
.card
  ├── .card__poster (image)
  ├── .card__overlay (gradient)
  ├── .card__badge (quality, new, etc.)
  ├── .card__title (text)
  └── .card__meta (year, rating, etc.)
```

### 2. Navigation Components
**Purpose**: Main app navigation

**Components**:
- `NavigationBar`: Top horizontal navigation
- `SidebarNavigation`: Left vertical navigation (desktop)
- `BottomNavigation`: Mobile bottom tabs

**Pattern**:
- Active item: Bright accent color, underline
- Inactive: Gray, subtle
- Hover: Lighter gray, scale 1.02

### 3. Player Components
**Purpose**: Video playback interface

**Features**:
- Custom controls (play/pause, seek, volume)
- Quality selector
- Subtitle toggle
- Fullscreen toggle
- Picture-in-picture
- Playback speed control
- Keyboard shortcuts

**Design**:
- Minimal controls auto-hide after 3s
- Progress bar with hover preview
- Smooth seek animations
- TV-optimized large buttons

### 4. Search Components
**Purpose**: Content discovery

**Features**:
- Real-time search with debouncing
- Category filters
- Recent searches
- Trending searches
- Voice search (if supported)

**Layout**:
- Centered search bar (hero)
- Results grid below
- Infinite scroll

### 5. Modal Components
**Purpose**: Overlays and dialogs

**Types**:
- `ModalAlert`: Simple confirm/cancel
- `ModalForm`: Input form
- `ModalContent`: Rich content (full details, settings)
- `ModalBottomSheet`: Mobile-optimized slide-up

**Behavior**:
- Backdrop blur
- Smooth slide/fade animations
- Escape key to close
- Click outside to close

## Layout Patterns

### 1. Hero Section
- Full-width banner (16:9 or 2.39:1)
- Gradient overlay from bottom
- Title, description, action buttons
- Auto-rotating carousel

### 2. Content Rows
- Horizontal scrolling rows
- Title on left
- "See All" link on right
- Cards with consistent spacing
- Smooth momentum scrolling

### 3. Grid Layout
- Responsive grid (2-6 columns based on screen size)
- Gap: 16px (mobile), 24px (desktop)
- Consistent card sizes within row
- Lazy loading for performance

### 4. Full Details Page
- Large hero backdrop (blurred)
- Poster on left (desktop) / top (mobile)
- Title, metadata, description
- Action buttons (play, add to list, share)
- Cast, crew, similar content sections

## Animation Guidelines

### Transitions
```css
/* Fast interactions */
transition: all var(--transition-fast) cubic-bezier(0.4, 0, 0.2, 1);

/* Standard transitions */
transition: all var(--transition-base) cubic-bezier(0.4, 0, 0.2, 1);

/* Slow page transitions */
transition: all var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1);
```

### Key Animations
- **Card Hover**: Scale 1.05, shadow increase
- **Button Press**: Scale 0.95
- **Page Load**: Fade in from bottom
- **Modal Open**: Scale 0.9 → 1.0, fade in
- **Skeleton Loading**: Shimmer effect

## Responsive Breakpoints

```css
$media_xl: 1400px; /* Extra large desktop */
$media_lg: 991px;  /* Large desktop */
$media_md: 767px;  /* Tablet */
$media_sm: 580px;  /* Small tablet */
$media_xm: 480px;  /* Large phone */
$media_xs: 400px;  /* Small phone */
```

## Platform-Specific Guidelines

### TV
- Large focus states (3px border)
- D-pad navigation support
- 10-foot UI (large text, high contrast)
- Simplified controls
- Voice control integration

### Mobile
- Touch-optimized (44px minimum targets)
- Bottom navigation
- Swipe gestures
- Haptic feedback
- Battery-conscious animations

### Desktop
- Mouse hover states
- Keyboard shortcuts
- Picture-in-picture
- Multiple windows support

## Performance Guidelines

### Image Optimization
- WebP format with fallback
- Responsive images (srcset)
- Lazy loading below fold
- Progressive JPEGs for large images

### Animation Performance
- Use transform/opacity for animations
- Avoid layout thrashing
- Will-change for complex animations
- RequestAnimationFrame for JS animations

### Bundle Size
- Code splitting by route
- Tree shaking unused code
- Dynamic imports for heavy components
- Service worker for offline support

## Accessibility Checklist

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader labels present
- [ ] Touch targets minimum 44x44px
- [ ] No seizure-inducing content
- [ ] Responsive to text scaling
- [ ] Skip navigation link
- [ ] ARIA labels where needed
- [ ] Alternative text for images

## Dark Mode
- Default theme (as per streaming industry standard)
- High contrast for readability
- Subtle gradients for depth
- Accent colors remain consistent

## Brand Tokens

All design tokens are defined in `src/core/brand.js` and `src/sass/brand.scss`

### Usage Example
```javascript
import Brand from './core/brand'

const primaryColor = Brand.getColor('primary')
const appName = Brand.getName('short')
```

```css
.button {
  background-color: var(--brand-primary);
  color: var(--brand-text-primary);
  padding: var(--space-md) var(--space-lg);
}
```

## Migration Guide

### From Old UI to New Design System

1. **Replace colors**: Use CSS custom properties from brand.scss
2. **Update typography**: Use font-size scale variables
3. **Refactor spacing**: Use space scale variables
4. **Add animations**: Use transition timing variables
5. **Implement components**: Follow component architecture
6. **Test accessibility**: Run accessibility audit
7. **Performance check**: Optimize images and animations

## Future Enhancements

- [ ] Light mode support
- [ ] Custom themes
- [ ] Animated backgrounds
- [ ] 3D card effects
- [ ] Voice search
- [ ] Gesture controls
- [ ] AI-powered recommendations UI
- [ ] Social watching features

# UI Components Implementation

## Overview
Modern Netflix-inspired UI components following the design system documented in `DESIGN_SYSTEM.md`.

## Implemented Components

### 1. Modern Card Component
**Files**:
- `src/interaction/card/modern.js` - JavaScript component
- `src/templates/card_modern.js` - HTML template
- `src/sass/components/card_modern.scss` - Styles

**Features**:
- Three size variants: small, medium, large
- Smooth hover/focus animations (scale 1.05)
- TV-optimized focus states with 3px border
- Gradient overlay for text readability
- Badge support (New, Top 10, Quality)
- Watched indicator with checkmark
- Progress bar for partially watched content
- Favorite button with heart icon
- Loading skeleton animation
- Error state with placeholder
- Responsive design for all screen sizes

**Usage**:
```javascript
import ModernCard from './interaction/card/modern'

const card = new ModernCard({
    poster: 'path/to/image.jpg',
    title: 'Movie Title',
    year: 2024,
    rating: 8.5,
    quality: '4K',
    new: true,
    watched: true,
    watch_progress: 75,
    favorite: false,
    card_size: 'medium'
})

card.on('click', (data) => {
    console.log('Card clicked:', data)
})

card.on('favorite_toggle', (data) => {
    console.log('Favorite toggled:', data)
})
```

**CSS Classes**:
- `.card-modern` - Base class
- `.card-modern--small/medium/large` - Size variants
- `.card-modern--loading` - Loading state
- `.card-modern--error` - Error state
- `.card-modern.focus` - Focus state for TV navigation

### 2. Hero Banner Component
**File**: `src/sass/components/hero.scss`

**Features**:
- Full-width banner with 16:9 aspect ratio
- Blurred backdrop for depth
- Gradient overlay for text readability
- Responsive content layout
- Title, description, and metadata
- Action buttons (primary/secondary)
- Navigation arrows for carousel
- Dot indicators for slide position
- Loading skeleton animation
- Smooth slide transitions
- Mobile-optimized layout

**Structure**:
```html
<div class="hero">
    <img class="hero__backdrop" src="blurred-backdrop.jpg">
    <img class="hero__poster" src="poster.jpg">
    <div class="hero__gradient"></div>
    <div class="hero__content">
        <h1 class="hero__title">Title</h1>
        <p class="hero__description">Description</p>
        <div class="hero__meta">Metadata</div>
        <div class="hero__actions">Buttons</div>
    </div>
    <button class="hero__navigation hero__navigation--prev">←</button>
    <button class="hero__navigation hero__navigation--next">→</button>
    <div class="hero__indicators">Dots</div>
</div>
```

**Responsive Behavior**:
- Desktop: Full layout with side navigation
- Tablet: Adjusted spacing and font sizes
- Mobile: Stacked buttons, simplified navigation

### 3. Content Row Component
**File**: `src/sass/components/content_row.scss`

**Features**:
- Horizontal scrolling with momentum
- Smooth scroll behavior
- Hidden scrollbars (clean look)
- Navigation arrows for desktop
- Touch-optimized for mobile
- Loading skeleton state
- Empty state handling
- Responsive spacing
- "See All" link

**Structure**:
```html
<div class="content-row">
    <div class="content-row__header">
        <h2 class="content-row__title">Category Name</h2>
        <a class="content-row__link">See All</a>
    </div>
    <div class="content-row__container">
        <div class="content-row__scroll">
            <!-- Cards go here -->
        </div>
        <button class="content-row__navigation content-row__navigation--prev">←</button>
        <button class="content-row__navigation content-row__navigation--next">→</button>
    </div>
</div>
```

**States**:
- `.content-row--loading` - Shows skeleton cards
- `.content-row--empty` - Shows empty message

## Design Tokens Used

All components use CSS custom properties from `brand.scss`:

```css
/* Colors */
--brand-primary
--brand-background
--brand-text-primary
--brand-text-secondary

/* Spacing */
--space-xs through --space-3xl

/* Typography */
--font-size-xs through --font-size-5xl
--font-weight-normal through --font-weight-bold

/* Effects */
--transition-fast, --transition-base, --transition-slow
--focus-ring-color, --focus-ring-width
--radius-sm, --radius-md, --radius-lg

/* Card Sizes */
--card-width-small, --card-width-medium, --card-width-large
--card-ratio
```

## Animation System

### Timing
- Fast: 150ms (hover states, button interactions)
- Base: 200ms (panel slides, card scaling)
- Slow: 300ms (page transitions, modal animations)

### Easing
```css
cubic-bezier(0.4, 0, 0.2, 1)  /* Natural feel */
```

### Key Animations
- Card hover: Scale 1.05, shadow increase
- Skeleton loading: Shimmer effect
- Slide transitions: Fade + translate
- Focus states: Border scale

## Accessibility

### Focus States
- 3px border for TV navigation
- Clear visual feedback
- Keyboard navigable

### Touch Targets
- Minimum 44x44px for mobile
- Adequate spacing
- Gesture support

### Contrast
- WCAG AA compliant
- Text on gradient overlays
- Badge readability

## Responsive Breakpoints

```scss
$media_xl: 1400px  // Extra large desktop
$media_lg: 991px   // Large desktop
$media_md: 767px   // Tablet
$media_sm: 580px   // Small tablet
$media_xm: 480px   // Large phone
$media_xs: 400px   // Small phone
```

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties supported
- Flexbox and Grid layouts
- CSS animations and transitions
- Touch events for mobile

## Performance Optimizations

- Lazy loading images (`loading="lazy"`)
- CSS transforms (GPU accelerated)
- Optimized animations (transform/opacity only)
- Debounced scroll events
- Will-change for complex animations

## Integration Guide

### Add to Main App
1. Import components in `src/sass/app.scss` (already done)
2. Import templates in `src/interaction/template.js` (already done)
3. Use components in your views

### Example Usage in View
```javascript
import ModernCard from './interaction/card/modern'

// Create content row
const row = $('<div class="content-row">')
const scroll = $('<div class="content-row__scroll">')

// Add cards
items.forEach(item => {
    const card = new ModernCard({
        ...item,
        card_size: 'medium'
    })
    
    card.on('click', (data) => {
        // Handle card click
    })
    
    scroll.append(card.render())
})

row.append(scroll)
```

### JavaScript Component API

**ModernCard Methods**:
- `render()` - Returns jQuery element
- `setLoading()` - Show loading state
- `setError()` - Show error state
- `setLoaded()` - Clear loading/error states
- `updateProgress(progress)` - Update watch progress (0-100)
- `toggleFavorite()` - Toggle favorite state

**Events**:
- `click` - Card clicked
- `hover` - Mouse entered
- `hover_out` - Mouse left
- `focus` - Focused (TV navigation)
- `blur` - Lost focus
- `favorite_toggle` - Favorite toggled

## TV Navigation Support

All components support TV/d-pad navigation:

- Focus states with visual feedback
- Keyboard event handling
- Arrow key navigation
- Enter to select
- Escape to cancel

## Customization

### Override Styles
```css
.content-row {
    --card-width-medium: 180px; /* Custom size */
}
```

### Extend Component
```javascript
class CustomCard extends ModernCard {
    constructor(data) {
        super(data)
        // Add custom logic
    }
}
```

## Future Enhancements

- [ ] Hero banner JavaScript component
- [ ] Content row JavaScript component
- [ ] Netflix-style "Who's Watching" profile selection
- [ ] Enhanced search component
- [ ] Better modal components
- [ ] Improved navigation components
- [ ] Category pills/filters
- [ ] Vertical scrolling sections
- [ ] Picture-in-picture player controls
- [ ] Gesture-based interactions

## Testing Checklist

- [ ] Cards render correctly in all sizes
- [ ] Hover animations smooth
- [ ] Focus states visible on TV
- [ ] Loading states work
- [ ] Error states display correctly
- [ ] Progress bars update
- [ ] Favorite toggle works
- [ ] Content row scrolls smoothly
- [ ] Navigation arrows work
- [ ] Responsive on all breakpoints
- [ ] Touch gestures work on mobile
- [ ] Keyboard navigation works
- [ ] Performance acceptable
- [ ] No console errors

## Migration from Old Components

To migrate from old card system:

1. Replace `Card` with `ModernCard`
2. Update data structure if needed
3. Add new event handlers
4. Update CSS class references
5. Test all card interactions

See `BRANDING_GUIDE.md` for brand customization and `DESIGN_SYSTEM.md` for design principles.

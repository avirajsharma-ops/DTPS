# Smooth Animations Guide for User Panel

This document explains all the smooth animations and transitions added to the user panel for a better user experience.

## Global CSS Animations

### Page Transitions
- **`animate-page-enter`** - Smooth fade and slide up when entering a new page (350ms)
- **`animate-page-exit`** - Quick fade out when leaving a page (200ms)

### Component Animations

#### Modal/Dialog Animations
- **`animate-modal-enter`** - Scale up with fade in for modals (300ms)
- **`animate-modal-exit`** - Scale down with fade out for modals (200ms)

#### Slide Animations
- **`animate-slide-in-bottom`** - Slide up from bottom with easing (350ms)
- **`animate-slide-out-bottom`** - Slide down to bottom (250ms)
- **`animate-slide-in-left`** - Slide in from left (300ms)
- **`animate-slide-out-left`** - Slide out to left (250ms)

#### Other Animations
- **`animate-scale-fade-in`** - Scale up with fade in (300ms)
- **`animate-overlay-fade-in`** - Smooth overlay fade (250ms)
- **`animate-button-press`** - Button press effect (200ms)
- **`animate-smooth-pulse`** - Smooth pulse/breathing effect (2s infinite)
- **`animate-card-enter`** - Card entrance animation (400ms)
- **`animate-dropdown-enter`** - Dropdown menu entrance (200ms)
- **`animate-toast-enter`** - Toast notification entrance (300ms)
- **`animate-toast-exit`** - Toast notification exit (250ms)

### Stagger Animations for Lists
- **`animate-stagger-1` to `animate-stagger-6`** - Progressive delay for list items (40ms base, 50ms per item)

## React Components for Animations

### 1. PageTransition
Wraps entire page content with smooth page entrance animations.

```tsx
import PageTransition from '@/components/animations/PageTransition';

<PageTransition>
  <div className="content">...</div>
</PageTransition>
```

**Features:**
- Automatically detects pathname changes
- Applies page-enter animation on each route change
- Can be nested for multiple sections

### 2. SmoothComponent
Wraps any component with smooth entrance animation.

```tsx
import SmoothComponent from '@/components/animations/SmoothComponent';

<SmoothComponent 
  animation="fade-in" 
  delay={100}
  className="custom-class"
>
  <div>Smooth content</div>
</SmoothComponent>
```

**Animation Options:**
- `'fade-in'` - Simple fade in
- `'slide-up'` - Slide up from bottom
- `'scale-fade'` - Scale up with fade
- `'slide-left'` - Slide in from left
- `'card-enter'` - Card entrance
- `'none'` - No animation

**Props:**
- `animation` - Animation type (default: 'fade-in')
- `delay` - Delay in milliseconds
- `className` - Additional CSS classes

### 3. StaggerList
Creates staggered animations for list items.

```tsx
import StaggerList from '@/components/animations/StaggerList';

<StaggerList 
  staggerDelay={50}
  containerClassName="space-y-3"
>
  {items.map((item) => <Item key={item.id} />)}
</StaggerList>
```

**Props:**
- `children` - Array of React elements
- `staggerDelay` - Delay between items in ms (default: 50)
- `containerClassName` - Wrapper container classes
- `className` - Classes applied to each child

## Usage in User Panel

### Quick Actions
```tsx
<SmoothComponent animation="slide-up">
  <div className="quick-actions">
    {/* Quick action items */}
  </div>
</SmoothComponent>
```

### Health Metrics Cards
```tsx
<StaggerList staggerDelay={100}>
  {metrics.map((metric) => (
    <SmoothComponent key={metric.id} animation="card-enter">
      <HealthCard {...metric} />
    </SmoothComponent>
  ))}
</StaggerList>
```

### Page Transitions
```tsx
<PageTransition>
  <div className="page-content">
    {/* Page content automatically gets smooth entrance */}
  </div>
</PageTransition>
```

## CSS Classes for Interactive Elements

### Hover Effects
- Use `card-hover` class for lift effect on hover
- Use `hover:animate-lift-hover` for custom hover animations

```tsx
<div className="card-hover">
  {/* Hover to see -translate-y-1 and shadow-lg */}
</div>
```

### Default Transitions
All interactive elements have default smooth transitions:
- Duration: 200ms
- Easing: ease-out
- Applies to: buttons, links, inputs, etc.

## Animation Timing

### Cubic Bezier Curves Used
- **Smooth enter**: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` - Natural, smooth curve
- **Spring effect**: `cubic-bezier(0.16, 1, 0.3, 1)` - Bouncy, responsive
- **Ease in**: `ease-in` - Quick exit animations
- **Linear**: `ease-out` - Quick button feedback

### Duration Recommendations
- Page transitions: 300-350ms
- Component appear: 300-400ms
- User feedback (buttons): 150-200ms
- List items (staggered): Base 40ms + 50ms per item

## Performance Considerations

1. **Hardware Acceleration**: All animations use `transform` and `opacity` for GPU acceleration
2. **Will-change**: Not used by default but can be added for intensive animations
3. **Reduced Motion**: Consider adding `prefers-reduced-motion` media query for accessibility

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

## Customization

### Adding New Animations
Add to `globals.css`:

```css
@keyframes custom-animation {
  0% {
    /* start state */
  }
  100% {
    /* end state */
  }
}

.animate-custom {
  animation: custom-animation 0.3s ease-out forwards;
}
```

### Modifying Animation Speeds
Change the duration in the animation definition or utility class.

## Browser Support
- All animations use standard CSS3
- Tested on modern browsers (Chrome, Firefox, Safari, Edge)
- Fallbacks for older browsers (no animation, just appears)

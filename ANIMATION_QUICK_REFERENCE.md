# Quick Animation Reference

## 🎬 Animation Components

### PageTransition - Wrap entire pages
```tsx
import PageTransition from '@/components/animations/PageTransition';

<PageTransition>
  <div>Your page content</div>
</PageTransition>
```

### SmoothComponent - Wrap any component
```tsx
import SmoothComponent from '@/components/animations/SmoothComponent';

<SmoothComponent animation="fade-in" delay={100}>
  <Component />
</SmoothComponent>
```

Available animations:
- `'fade-in'` - Simple fade in
- `'slide-up'` - Slide up 
- `'scale-fade'` - Zoom in + fade
- `'slide-left'` - Slide from left
- `'card-enter'` - Card animation
- `'none'` - No animation

### StaggerList - Animate list items
```tsx
import StaggerList from '@/components/animations/StaggerList';

<StaggerList staggerDelay={50}>
  {items.map(item => <Card key={item.id} />)}
</StaggerList>
```

---

## 🎨 CSS Animation Classes

| Class | Duration | Effect |
|-------|----------|--------|
| `animate-page-enter` | 350ms | Fade + slide up |
| `animate-page-exit` | 200ms | Fade out |
| `animate-modal-enter` | 300ms | Scale + fade |
| `animate-card-enter` | 400ms | Slide up |
| `animate-slide-in-bottom` | 350ms | Bounce from bottom |
| `animate-slide-out-bottom` | 250ms | To bottom |
| `animate-slide-in-left` | 300ms | From left |
| `animate-toast-enter` | 300ms | Slide in |
| `animate-smooth-pulse` | 2s | Breathing effect |
| `card-hover` | 300ms | Lift on hover |

---

## 📝 Common Patterns

### Animate page on load
```tsx
<PageTransition>
  <Header />
  <Content />
  <Footer />
</PageTransition>
```

### Stagger cards
```tsx
<StaggerList>
  {cards.map(card => <Card key={card.id} {...card} />)}
</StaggerList>
```

### Hover lift effect
```tsx
<div className="card-hover">
  <Card />
</div>
```

### Single component animation
```tsx
<SmoothComponent animation="scale-fade">
  <Hero />
</SmoothComponent>
```

---

## ⚡ Performance Notes

✅ GPU accelerated (transform + opacity only)
✅ No performance impact
✅ Smooth 60 FPS animations
✅ Works on all modern browsers

---

## 🔧 Customization

Add custom animation to `globals.css`:

```css
@keyframes my-animation {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-my-animation {
  animation: my-animation 0.3s ease-out forwards;
}
```

Use in component:
```tsx
<div className="animate-my-animation">Content</div>
```

---

## 📱 Mobile Friendly

All animations work smoothly on mobile devices with hardware acceleration.

For reduced motion preference:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

# Quick Reference - Responsive Design Guide 📱

## Responsive Classes Used (Copy & Paste Ready)

### Container Padding
```tailwind
px-3 sm:px-4 md:px-6 py-3 sm:py-4
```

### Gaps Between Items
```tailwind
gap-2 sm:gap-3 md:gap-4
```

### Font Sizes
```tailwind
text-xs sm:text-sm          // Small text
text-sm sm:text-base        // Body text
text-base sm:text-lg        // Headings
text-lg sm:text-2xl         // Large headings
text-4xl sm:text-5xl        // Huge numbers
```

### Icon Sizes
```tailwind
h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8      // Regular icons
h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16  // Avatar-size icons
```

### Card Padding
```tailwind
p-3 sm:p-4      // Compact cards
p-4 sm:p-5 md:p-6  // Standard cards
p-2 sm:p-4      // Internal card items
```

### Component Sizes
```tailwind
h-16 sm:h-24           // Image heights
h-24 sm:h-32           // Larger images
min-w-[140px] sm:min-w-[160px] md:min-w-[180px]  // Horizontal scroll items
rounded-xl sm:rounded-2xl  // Border radius
rounded-2xl sm:rounded-3xl  // Larger radius
```

---

## Device Breakpoints

| Breakpoint | Size | Device |
|------------|------|--------|
| Default | 0-639px | Mobile phones |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Large tablets |
| xl | 1280px | Desktop |

---

## Quick Add Quick Log Cards Pattern

```tsx
<Link href="/user/activity" className="min-w-[140px] sm:min-w-[160px] md:min-w-[180px] 
  bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-md 
  flex flex-col items-center gap-2 sm:gap-3 md:gap-4 
  hover:shadow-lg hover:bg-gray-50 transition-all">
  
  {/* Icon Container */}
  <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-orange-100 
    flex items-center justify-center">
    <Activity className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-500" />
  </div>
  
  {/* Title */}
  <span className="text-sm sm:text-base font-semibold text-gray-900">
    Exercise
  </span>
  
  {/* Subtitle */}
  <span className="text-xs sm:text-sm text-gray-400">
    Log Activity
  </span>
</Link>
```

---

## Full Width Scrollable Cards Pattern

```tsx
{/* Outer wrapper with negative margin for full-width scroll */}
<div className="-mx-3 sm:-mx-4 md:-mx-6">
  {/* Inner scroll container with positive padding */}
  <div className="flex gap-3 sm:gap-4 md:gap-4 overflow-x-auto pb-2 
    snap-x snap-mandatory scrollbar-hide px-3 sm:px-4 md:px-6">
    
    {/* Card */}
    <div className="min-w-[200px] sm:min-w-[240px] md:min-w-[260px] 
      snap-start bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
      
      {/* Card content */}
      <div className="h-24 sm:h-32 bg-gradient-to-br rounded-lg sm:rounded-xl mb-2 sm:mb-3" />
      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-gray-900 text-sm sm:text-base">Title</h3>
        <p className="text-gray-500 text-xs sm:text-sm">Description</p>
      </div>
    </div>
  </div>
</div>
```

---

## Text Responsive Pattern

```tsx
<div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
  <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
    Heading
  </h2>
  
  <p className="text-xs sm:text-sm md:text-base text-gray-500">
    Body text that scales nicely
  </p>
</div>
```

---

## Grid Responsive Pattern

```tsx
{/* 2-column on mobile, 3-column on tablet, 4-column on desktop */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 
  gap-2 sm:gap-3 md:gap-4">
  {/* Items */}
</div>
```

---

## Mobile Menu Pattern (if needed)

```tsx
{/* Navigation that becomes hamburger on mobile */}
<nav className="hidden md:flex items-center gap-4">
  {/* Desktop menu */}
</nav>

<div className="md:hidden">
  {/* Mobile menu button */}
</div>
```

---

## Common Responsive Values

### Spacing Scale
```
Mobile:  gap-2, p-3, px-3, py-2
Tablet:  gap-3, p-4, px-4, py-3
Desktop: gap-4, p-6, px-6, py-4
```

### Size Scale
```
Icon Small:    h-6 w-6
Icon Medium:   h-12 w-12 sm:h-14 sm:w-14
Icon Large:    h-14 w-14 sm:h-16 sm:w-16
```

### Font Scale
```
Small:   text-xs (12px)
Body:    text-sm (14px)
Normal:  text-base (16px)
Medium:  text-lg (18px)
Large:   text-2xl (24px)
XLarge:  text-5xl (48px)
```

---

## Testing Checklist

- [ ] **iPhone SE** (375px)
- [ ] **iPhone 12** (390px)
- [ ] **iPhone 14 PM** (430px)
- [ ] **Galaxy S21** (360px)
- [ ] **iPad** (768px)
- [ ] **iPad Pro** (1024px)
- [ ] **Desktop** (1920px)

### Verification
- [ ] No horizontal scroll
- [ ] Text readable
- [ ] Images scale properly
- [ ] Buttons tappable (44x44px min)
- [ ] Modals work
- [ ] No content cut off

---

## Common Issues & Fixes

### Issue: Text too small on mobile
```tailwind
❌ text-lg
✅ text-sm sm:text-lg
```

### Issue: Content overflowing horizontally
```tailwind
❌ flex gap-4 overflow-x-auto
✅ flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto
✅ Add: -mx-3 sm:-mx-4 on parent + px-3 sm:px-4 on container
```

### Issue: Cards too large on mobile
```tailwind
❌ min-w-[260px]
✅ min-w-[140px] sm:min-w-[160px] md:min-w-[260px]
```

### Issue: Padding inconsistent
```tailwind
❌ p-6 (too much on mobile!)
✅ p-3 sm:p-4 md:p-6
```

### Issue: Icons too big on mobile
```tailwind
❌ h-16 w-16
✅ h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16
```

---

## Best Practices

1. **Mobile First**: Write for mobile first, then add `sm:`, `md:` for larger screens
2. **Don't Skip Breakpoints**: Use consistent breakpoints (sm, md, lg, xl)
3. **Test Always**: Test on real devices, not just browser DevTools
4. **Touch Friendly**: Keep buttons/links ≥44x44px
5. **Text Readable**: Use readable font sizes with proper line-height
6. **Images Optimized**: Use responsive images with srcset
7. **No Horizontal Scroll**: Ensure no unwanted horizontal scrolling
8. **Performance**: Minimize layout shifts, use proper sizing

---

## Resources

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile First Approach](https://www.nngroup.com/articles/mobile-first-responsive-web-design/)
- [Touch Target Sizing](https://www.smashingmagazine.com/2022/09/inline-expanded-touch-targets/)
- [Responsive Typography](https://www.smashingmagazine.com/2016/05/fluid-typography/)

---

## Quick Copy-Paste Components

### Responsive Button
```tsx
<button className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 
  text-sm sm:text-base md:text-lg font-semibold rounded-lg sm:rounded-xl 
  hover:shadow-md transition-all">
  Click Me
</button>
```

### Responsive Card
```tsx
<div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 
  shadow-sm hover:shadow-md transition-all">
  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">Card Title</h3>
  <p className="text-sm sm:text-base text-gray-600">Card content</p>
</div>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 
  gap-3 sm:gap-4 md:gap-6">
  {/* Items */}
</div>
```

---

**Last Updated**: December 19, 2025  
**Status**: ✅ Production Ready  
**All Pages**: ✅ Fully Responsive

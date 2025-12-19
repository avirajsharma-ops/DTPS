# Client-Side Folder Structure

This document describes the client-side folder structure for the DTPS (Diet & Nutrition Planning System) application. The structure is designed to support both laptop and mobile views, ready for conversion to a mobile app via WebView.

## Folder Structure

```
src/
├── components/
│   └── client/                     # Client-specific components
│       ├── index.ts                # Barrel exports for all client components
│       ├── ClientLayout.tsx        # Responsive layout wrapper (mobile/tablet/desktop)
│       ├── ClientHeader.tsx        # Mobile header with menu & notifications
│       ├── ClientBottomNav.tsx     # Mobile bottom navigation
│       ├── ClientStats.tsx         # Stats cards for dashboard
│       ├── ClientMealCard.tsx      # Meal card components
│       ├── ClientProgressChart.tsx # Progress tracking visualizations
│       ├── ClientAppointmentCard.tsx # Appointment card components
│       ├── ClientBillingCard.tsx   # Billing/payment card components
│       ├── ContactDietitian.tsx    # Contact dietitian component
│       └── ResponsiveUtils.tsx     # Responsive utility components
│
├── hooks/
│   ├── index.ts                    # Barrel exports for all hooks
│   ├── useMediaQuery.ts            # Media query hooks for responsive design
│   ├── useMobileDetection.ts       # Mobile device detection
│   └── ... (other hooks)
│
└── app/                            # Client routes (NOT changed)
    ├── client-dashboard/           # Dashboard page
    ├── my-plan/                    # Meal plan page
    ├── food-log/                   # Food tracking page
    ├── progress/                   # Progress tracking page
    ├── appointments/               # Appointments page
    ├── messages/                   # Messages page
    ├── billing/                    # Billing page
    ├── profile/                    # Profile page
    └── settings/                   # Settings page
```

## Component Usage

### 1. ClientLayout
The main responsive layout wrapper that automatically adapts to screen size:

```tsx
import { ClientLayout } from '@/components/client';

// Used in layout.tsx or page.tsx
<ClientLayout>
  {children}
</ClientLayout>
```

**Features:**
- **Mobile**: Fixed header + scrollable content + fixed bottom nav
- **Tablet**: Collapsible sidebar + content area
- **Desktop**: Full sidebar + content area

### 2. Responsive Utility Components

```tsx
import { 
  Container, 
  PageHeader, 
  Section, 
  ResponsiveGrid,
  MobileOnly,
  DesktopOnly,
  TabletAndUp,
  Stack,
  Flex
} from '@/components/client';

// Container with max-width
<Container size="lg">
  <PageHeader title="My Plan" subtitle="Today's meals" action={<Button>Add</Button>} />
  
  {/* Only shows on mobile */}
  <MobileOnly>
    <MobileSpecificComponent />
  </MobileOnly>
  
  {/* Only shows on desktop */}
  <DesktopOnly>
    <DesktopSpecificComponent />
  </DesktopOnly>
  
  {/* Responsive grid */}
  <ResponsiveGrid cols={{ mobile: 1, sm: 2, lg: 3 }}>
    <Card />
    <Card />
    <Card />
  </ResponsiveGrid>
</Container>
```

### 3. Stats Components

```tsx
import { ClientStatCard, ClientStatsGrid } from '@/components/client';
import { Activity, Flame, Droplet, Target } from 'lucide-react';

<ClientStatsGrid>
  <ClientStatCard 
    title="Calories" 
    value="1,850" 
    subtitle="of 2,000 kcal"
    icon={Flame}
    color="orange"
    trend={{ value: 5, isPositive: true }}
  />
  <ClientStatCard 
    title="Water" 
    value="6" 
    subtitle="of 8 glasses"
    icon={Droplet}
    color="blue"
  />
</ClientStatsGrid>
```

### 4. Meal Cards

```tsx
import { ClientMealCard, ClientMealCardList } from '@/components/client';

<ClientMealCardList>
  <ClientMealCard 
    title="Breakfast"
    time="8:00 AM"
    calories={450}
    items={[
      { id: '1', name: 'Oatmeal', portion: '1 cup' },
      { id: '2', name: 'Banana', portion: '1 medium' },
    ]}
    isCompleted={true}
    onView={() => {}}
    onMarkComplete={() => {}}
  />
</ClientMealCardList>
```

### 5. Progress Charts

```tsx
import { ClientProgressChart, ClientCircularProgress } from '@/components/client';

<ClientProgressChart 
  title="Daily Goals"
  data={[
    { label: 'Calories', current: 1500, target: 2000, unit: 'kcal', change: 5 },
    { label: 'Protein', current: 80, target: 100, unit: 'g', change: 10 },
  ]}
/>

<ClientCircularProgress 
  value={1500}
  maxValue={2000}
  label="Calories"
  unit="kcal"
  color="green"
  size="md"
/>
```

### 6. Appointment Cards

```tsx
import { ClientAppointmentCard, ClientAppointmentList } from '@/components/client';

<ClientAppointmentList>
  <ClientAppointmentCard 
    id="apt-1"
    dietitianName="Dr. Smith"
    date={new Date()}
    time="10:00 AM"
    duration={30}
    type="video"
    status="upcoming"
    onJoin={() => {}}
    onReschedule={() => {}}
    onMessage={() => {}}
  />
</ClientAppointmentList>
```

### 7. Billing Cards

```tsx
import { ClientBillingCard, ClientBillingList, ClientBillingSummary } from '@/components/client';

<ClientBillingSummary 
  totalPaid={5000}
  pendingAmount={1500}
  nextDueDate={new Date()}
/>

<ClientBillingList>
  <ClientBillingCard 
    id="inv-1"
    planName="Premium Plan"
    amount={2500}
    date={new Date()}
    status="paid"
    onDownload={() => {}}
    onViewDetails={() => {}}
  />
</ClientBillingList>
```

## Hooks Usage

### Media Query Hooks

```tsx
import { 
  useIsMobile, 
  useIsTablet, 
  useIsDesktop,
  useBreakpoint,
  useIsTouchDevice,
  useOrientation
} from '@/hooks';

function MyComponent() {
  const isMobile = useIsMobile();      // true if < 640px
  const isTablet = useIsTablet();      // true if 640px-1023px
  const isDesktop = useIsDesktop();    // true if >= 1024px
  const breakpoint = useBreakpoint();  // 'mobile' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  const isTouch = useIsTouchDevice();  // true if touch device
  const orientation = useOrientation(); // 'portrait' | 'landscape'

  return (
    <div>
      {isMobile && <MobileView />}
      {isDesktop && <DesktopView />}
    </div>
  );
}
```

## Responsive Design Guidelines

### Tailwind Breakpoints
- `sm`: 640px (Mobile landscape / small tablet)
- `md`: 768px (Tablet portrait)
- `lg`: 1024px (Tablet landscape / small desktop)
- `xl`: 1280px (Desktop)
- `2xl`: 1536px (Large desktop)

### Mobile-First Approach
Always design mobile-first, then add responsive classes:

```tsx
// ❌ Don't do this
<div className="grid grid-cols-4 sm:grid-cols-2 md:grid-cols-1">

// ✅ Do this (mobile-first)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
```

### Safe Area Handling (for WebView)
The bottom navigation uses `safe-area-bottom` class:

```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## WebView Ready

The structure is ready for WebView conversion:
1. **Bottom navigation** is fixed and handles safe areas
2. **No browser-specific features** that wouldn't work in WebView
3. **Touch-friendly** interactions with proper tap targets
4. **Responsive** layouts that adapt to any screen size
5. **PWA features** can be leveraged in WebView

## Routes (Not Changed)

All client routes remain at root level:
- `/client-dashboard`
- `/my-plan`
- `/food-log`
- `/progress`
- `/appointments`
- `/messages`
- `/billing`
- `/profile`
- `/settings`

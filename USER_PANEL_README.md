# 📱 DTPS User Panel Documentation

> Complete documentation for the Diet & Nutrition Tracking Platform - User/Client Panel

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Routes & Pages](#user-routes--pages)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Authorization](#authentication--authorization)
6. [Features](#features)
7. [Components](#components)
8. [State Management](#state-management)
9. [Mobile App Integration](#mobile-app-integration)
10. [Database Models](#database-models)

---

## 🎯 Overview

The DTPS User Panel is a comprehensive diet and nutrition management dashboard for clients. It provides features for meal planning, health tracking, appointments, messaging, and more.

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: NextAuth.js
- **Database**: MongoDB with Mongoose
- **Realtime**: Polling-based updates
- **Mobile**: Android WebView App with Native Features

---

## 🏗️ Architecture

### Directory Structure

```
src/app/user/
├── layout.tsx              # Server-side auth layout
├── UserLayoutClient.tsx    # Client-side layout with navigation
├── page.tsx                # Main user home page
│
├── dashboard/              # User dashboard with stats
├── plan/                   # Daily meal plans viewer
├── recipes/                # Recipe browsing
├── food-log/               # Manual food logging
│
├── appointments/           # Appointment management
├── messages/               # Chat with dietitian
├── tasks/                  # Daily tasks (water, steps, etc.)
│
├── progress/               # Weight & measurements tracking
├── hydration/              # Water intake tracking
├── sleep/                  # Sleep tracking
├── steps/                  # Step counting
├── activity/               # Exercise/activity logging
│
├── profile/                # User profile overview
├── personal-info/          # Personal details editing
├── medical-info/           # Medical conditions & reports
├── lifestyle-info/         # Lifestyle preferences
├── dietary-recall/         # Food habits recall form
│
├── subscriptions/          # Plan subscriptions & payments
├── billing/                # Invoices & payment history
├── services/               # Available service plans
│
├── settings/               # App settings & logout
├── onboarding/             # New user onboarding flow
├── blogs/                  # Health & nutrition blogs
├── watch/                  # Smartwatch integration
└── [other routes]/
```

---

## 📄 User Routes & Pages

### 1. **Home Page** (`/user`)
Main landing page after login showing:
- User greeting with time-based message
- Assigned dietitian card
- Quick action buttons
- Service plans carousel
- Transformation stories swiper
- Navigation to all sections

**API Used**: `/api/client/service-plans`, `/api/client/transformations`

---

### 2. **Dashboard** (`/user/dashboard`)
Overview dashboard with health statistics:
- Calorie consumption vs target
- Water intake tracker
- Protein progress
- Step counter
- Weight progress
- Streak tracking

**API Used**: `/api/client/dashboard-stats`

---

### 3. **Meal Plan** (`/user/plan`)
Daily meal plan viewer with:
- Week calendar navigation
- Meal cards (Breakfast, Lunch, Dinner, Snacks)
- Recipe popup modal with full details
- Meal completion tracking with photo upload
- Camera-first flow for Android app
- Alternative meal suggestions

**API Used**: 
- `GET /api/client/meal-plan` - Fetch daily meal plan
- `POST /api/client/meal-plan/complete` - Mark meal as complete
- `GET /api/recipes?search={name}` - Search recipes by name
- `GET /api/recipes/{id}` - Get recipe details

---

### 4. **Recipes** (`/user/recipes`)
Browse all available recipes:
- Search functionality
- Category filtering
- Recipe cards with image, time, calories
- Link to full recipe details

**API Used**: `GET /api/recipes`

---

### 5. **Food Log** (`/user/food-log`)
Manual food logging feature:
- Search food database
- Add custom food entries
- Track macros (calories, protein, carbs, fat)
- View daily nutrition totals

**API Used**: `GET/POST /api/client/food-log`

---

### 6. **Appointments** (`/user/appointments`)
Appointment management:
- View upcoming appointments
- Past appointment history
- Appointment types: Video, Audio, In-Person
- Cancel/Reschedule options
- Video call integration

**API Used**: 
- `GET /api/client/appointments`
- `PUT /api/appointments/{id}` - Update/Cancel appointment

---

### 7. **Messages** (`/user/messages`)
Real-time chat with dietitian:
- Conversation list
- Message thread view
- Send text messages
- Attachment support (images, files)
- Read receipts
- 3-second polling for new messages

**API Used**: 
- `GET /api/client/messages` - Get conversations
- `GET /api/client/messages/{conversationId}` - Get messages
- `POST /api/messages` - Send message

---

### 8. **Tasks** (`/user/tasks`)
Daily health tasks assigned by dietitian:
- Water intake goal
- Steps target
- Sleep target
- Activity/Exercise tasks
- Task completion tracking
- Progress visualization

**API Used**: `GET /api/client/tasks`

---

### 9. **Progress** (`/user/progress`)
Weight and body measurement tracking:
- Weight history graph (1W, 1M, 3M, 6M, 1Y views)
- Body measurements (waist, hips, chest, arms, thighs)
- Transformation photos upload
- BMI calculation
- Progress towards goal

**API Used**: 
- `GET /api/client/progress`
- `POST /api/client/progress/weight` - Log weight
- `POST /api/client/progress/measurements` - Log measurements
- `POST /api/client/transformations` - Upload photos

---

### 10. **Hydration** (`/user/hydration`)
Water intake tracking:
- Daily water goal
- Quick add buttons (200ml, 350ml, 500ml)
- Custom amount entry
- Visual progress indicator
- Entry history with delete option
- Date picker for historical data

**API Used**: 
- `GET /api/client/hydration`
- `POST /api/client/hydration` - Add water entry
- `DELETE /api/client/hydration/{id}` - Remove entry

---

### 11. **Sleep** (`/user/sleep`)
Sleep tracking:
- Daily sleep goal (hours)
- Log sleep duration and quality
- Sleep history view
- Quality ratings (poor, fair, good, excellent)

**API Used**: 
- `GET /api/client/sleep`
- `POST /api/client/sleep` - Log sleep

---

### 12. **Steps** (`/user/steps`)
Step counting:
- Daily step goal
- Manual step entry
- Progress visualization
- History view

**API Used**: 
- `GET /api/client/steps`
- `POST /api/client/steps` - Log steps

---

### 13. **Activity** (`/user/activity`)
Exercise and activity logging:
- Activity types (Walking, Running, Yoga, etc.)
- Duration tracking
- Intensity levels (light, moderate, vigorous)
- Calories burned calculation
- Activity history

**API Used**: 
- `GET /api/client/activity`
- `POST /api/client/activity` - Log activity

---

### 14. **Profile** (`/user/profile`)
Complete user profile overview:
- Personal information display
- Medical info summary
- Lifestyle info summary
- Assigned dietitian details
- Quick links to edit pages

**API Used**: `GET /api/client/profile`

---

### 15. **Personal Info** (`/user/personal-info`)
Edit personal details:
- Name, phone, email
- Date of birth, gender
- Profile photo upload
- Height, weight, target weight
- Activity level
- Health goals
- Diet type

**API Used**: 
- `GET /api/client/profile`
- `PUT /api/client/profile` - Update profile

---

### 16. **Medical Info** (`/user/medical-info`)
Medical information management:
- Medical conditions (diabetes, hypertension, etc.)
- Allergies
- Blood group
- Gut issues
- Pregnancy/Lactation status
- Menstrual cycle info
- Medical reports upload (with categories)
- Family history
- Current medications

**API Used**: 
- `GET /api/client/medical-info`
- `PUT /api/client/medical-info`
- `POST /api/upload/medical-report` - Upload reports

---

### 17. **Lifestyle Info** (`/user/lifestyle-info`)
Lifestyle preferences:
- Food preference (Veg/Non-Veg/Vegan)
- Preferred cuisines
- Food allergies
- Fasting days
- Cooking oils used
- Eating out frequency
- Smoking/Alcohol frequency
- Craving types

**API Used**: 
- `GET /api/client/lifestyle-info`
- `PUT /api/client/lifestyle-info`

---

### 18. **Dietary Recall** (`/user/dietary-recall`)
Food habits questionnaire:
- Meal-wise food recall
- Timing for each meal
- Used for initial diet assessment

**API Used**: 
- `GET /api/client/dietary-recall`
- `POST /api/client/dietary-recall`

---

### 19. **Subscriptions** (`/user/subscriptions`)
Subscription management:
- View active subscriptions
- Subscription history
- Payment status
- Purchase new plans
- Razorpay payment integration
- Download receipts

**API Used**: 
- `GET /api/client/subscriptions`
- `POST /api/client/subscriptions/purchase`

---

### 20. **Billing** (`/user/billing`)
Payment and invoice management:
- Current subscription details
- Invoice list
- Payment history
- Download invoices

**API Used**: `GET /api/client/billing`

---

### 21. **Services** (`/user/services`)
Browse available service plans:
- Plan categories
- Pricing tiers
- Feature lists
- Popular/Featured plans
- Purchase flow

**API Used**: `GET /api/client/service-plans`

---

### 22. **Settings** (`/user/settings`)
App settings and preferences:
- Push notifications toggle
- Email notifications toggle
- Meal reminders
- Appointment reminders
- Progress updates
- Dark mode (coming soon)
- Sound settings
- Logout functionality

**API Used**: 
- `GET /api/client/settings`
- `PUT /api/client/settings`

---

### 23. **Onboarding** (`/user/onboarding`)
New user setup wizard:
- Step 1: Gender selection
- Step 2: Date of birth
- Step 3: Height & weight
- Step 4: Activity level
- Step 5: Primary health goal
- Step 6: Daily targets setup
- Redirects to home after completion

**API Used**: 
- `GET /api/client/onboarding`
- `POST /api/client/onboarding`

---

### 24. **Blogs** (`/user/blogs`)
Health and nutrition articles:
- Featured articles
- Category filtering
- Search functionality
- Article detail view
- Reading time display

**Note**: Currently uses static data, can be connected to CMS

---

### 25. **Watch** (`/user/watch`)
Smartwatch integration:
- Connect fitness watches (Google Fit, Apple Health, Fitbit)
- OAuth-based connection
- Sync health data
- Manual data entry option
- View synced metrics

**API Used**: 
- `GET /api/client/watch-connection`
- `POST /api/client/watch-connection`
- `POST /api/client/watch-data`

---

## 🔌 API Endpoints Summary

### Client APIs (`/api/client/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/client/dashboard-stats` | GET | Dashboard statistics |
| `/api/client/meal-plan` | GET | Daily meal plan |
| `/api/client/meal-plan/complete` | POST | Mark meal complete |
| `/api/client/appointments` | GET | User appointments |
| `/api/client/messages` | GET | Chat conversations |
| `/api/client/profile` | GET/PUT | User profile |
| `/api/client/medical-info` | GET/PUT | Medical information |
| `/api/client/lifestyle-info` | GET/PUT | Lifestyle data |
| `/api/client/dietary-recall` | GET/POST | Dietary recall |
| `/api/client/progress` | GET | Progress data |
| `/api/client/hydration` | GET/POST/DELETE | Water tracking |
| `/api/client/sleep` | GET/POST | Sleep tracking |
| `/api/client/steps` | GET/POST | Step tracking |
| `/api/client/activity` | GET/POST | Activity logging |
| `/api/client/tasks` | GET | Daily tasks |
| `/api/client/subscriptions` | GET/POST | Subscriptions |
| `/api/client/billing` | GET | Billing info |
| `/api/client/service-plans` | GET | Available plans |
| `/api/client/settings` | GET/PUT | User settings |
| `/api/client/onboarding` | GET/POST | Onboarding data |
| `/api/client/notifications` | GET | Notifications |

---

## 🔐 Authentication & Authorization

### Session Management
- Uses NextAuth.js for authentication
- JWT-based sessions
- Role-based access control

### User Roles
- `client` - Regular users/clients
- `dietitian` - Diet professionals
- `health_counselor` - Health counselors
- `admin` - System administrators

### Protected Routes
All `/user/*` routes are protected and require:
1. Valid session
2. Role must be `client`
3. Completed onboarding (except `/user/onboarding`)

### Redirection Logic (in `layout.tsx`)
```typescript
// Not authenticated → /client-auth/signin
// Not a client → Redirect to appropriate dashboard
// Onboarding not complete → /user/onboarding
```

---

## ✨ Features

### 1. **Responsive Design**
- Mobile-first approach
- Tablet and desktop layouts
- Bottom navigation for mobile
- Sidebar for desktop

### 2. **Meal Plan Viewer**
- Daily meal breakdown
- Recipe popup with full details
- Meal completion with photo proof
- Alternative suggestions

### 3. **Health Tracking**
- Weight and BMI tracking
- Body measurements
- Transformation photos
- Progress graphs

### 4. **Daily Tasks**
- Assigned water intake
- Step goals
- Sleep targets
- Exercise tasks

### 5. **Communication**
- Real-time chat with dietitian
- Appointment scheduling
- Video/Audio calls

### 6. **Subscriptions & Payments**
- Multiple service plans
- Razorpay integration
- Payment receipts
- Subscription history

### 7. **Android App Features**
- Camera-first meal photo capture
- Native notifications (FCM)
- Gallery access
- Native file handling

---

## 🧩 Components

### Layout Components
| Component | Path | Description |
|-----------|------|-------------|
| `UserLayoutClient` | `/user/UserLayoutClient.tsx` | Main layout wrapper |
| `BottomNavBar` | `/components/client/BottomNavBar` | Mobile bottom navigation |
| `UserSidebar` | `/components/client/UserSidebar` | Desktop sidebar |
| `UserNavBar` | `/components/client/UserNavBar` | Top navigation bar |
| `ResponsiveLayout` | `/components/client/layouts` | Responsive wrapper |

### Common Components
| Component | Description |
|-----------|-------------|
| `SpoonGifLoader` | Loading spinner with spoon animation |
| `Card`, `CardContent` | shadcn/ui card components |
| `Button`, `Badge` | UI primitives |
| `Tabs`, `TabsList` | Tab navigation |
| `Dialog`, `Modal` | Popup dialogs |

---

## 🗃️ State Management

### Local State
- React `useState` for component state
- `useSession` for auth state
- `useRouter` for navigation

### Data Fetching
- `fetch` API with async/await
- Loading states for UX
- Error handling with toast notifications

### Real-time Updates
- Polling every 3 seconds for messages
- Event-based refresh (`user-data-changed`)
- Manual refresh buttons

### Custom Hooks
| Hook | Description |
|------|-------------|
| `useSession` | NextAuth session |
| `useNativeApp` | Android WebView interface |
| `useBodyScrollLock` | Lock body scroll for modals |
| `useWatchConnection` | Smartwatch integration |

---

## 📱 Mobile App Integration

### Android WebView
The user panel is wrapped in an Android WebView app with native features.

### Native Interface (`window.NativeInterface`)
```typescript
interface NativeInterface {
  // Camera/Gallery
  openCamera(): void;
  openGallery(): void;
  checkCameraPermission(): boolean;
  
  // Notifications
  hasNotificationPermission(): boolean;
  requestNotificationPermission(): void;
  registerFCMToken(token: string): void;
  
  // App Settings
  openAppSettings(): void;
  
  // File Handling
  downloadFile(url: string, filename: string): void;
  shareContent(content: string): void;
}
```

### FCM Push Notifications
- Token registered on page load
- Notifications for:
  - New messages
  - Appointment reminders
  - Meal reminders
  - Task updates

---

## 💾 Database Models

### User
```typescript
{
  _id: ObjectId,
  email: string,
  phone: string,
  firstName: string,
  lastName: string,
  role: 'client' | 'dietitian' | 'health_counselor' | 'admin',
  avatar: string,
  assignedDietitian: ObjectId,
  isOnboardingComplete: boolean,
  // ... other fields
}
```

### ClientMealPlan
```typescript
{
  _id: ObjectId,
  clientId: ObjectId,
  dietitianId: ObjectId,
  name: string,
  startDate: Date,
  endDate: Date,
  status: 'active' | 'completed' | 'paused',
  dailyPlans: [{
    date: Date,
    meals: [{
      type: 'breakfast' | 'lunch' | 'dinner' | 'snack',
      items: [{
        name: string,
        portion: string,
        calories: number,
        recipeId: ObjectId,
        // ... nutrition info
      }]
    }],
    isFrozen: boolean
  }]
}
```

### Recipe
```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  category: string,
  ingredients: string[],
  instructions: string[],
  prepTime: string,
  cookTime: string,
  servings: number,
  nutrition: {
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  },
  image: string,
  createdBy: ObjectId
}
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Android Studio (for mobile app)

### Running the User Panel
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at
http://localhost:3000/user
```

### Environment Variables
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
MONGODB_URI=mongodb://localhost:27017/dtps
```

---

## 📞 Support

For technical issues or feature requests, contact the development team.

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2025 | Initial release |
| 1.1 | Jan 2025 | Added recipe modal popup |
| 1.2 | Jan 2025 | Camera-first flow for Android |
| 1.3 | Jan 2025 | Enhanced meal completion |

---

*Last Updated: January 2025*

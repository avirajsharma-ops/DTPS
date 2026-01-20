`# DTPS Database Schema Documentation

**Complete MongoDB Collections & Schema Reference**

This document contains all database collections (schemas) used in the DTPS application with field definitions, types, required status, and data formats.

---

## 📋 Table of Contents

1. [User](#1-user-collection)
2. [MedicalInfo](#2-medicalinfo-collection)
3. [LifestyleInfo](#3-lifestyleinfo-collection)
4. [MealPlan](#4-mealplan-collection)
5. [ClientMealPlan](#5-clientmealplan-collection)
6. [Recipe](#6-recipe-collection)
7. [Task](#7-task-collection)
8. [Appointment](#8-appointment-collection)
9. [Message](#9-message-collection)
10. [Notification](#10-notification-collection)
11. [Payment](#11-payment-collection)
12. [ClientSubscription](#12-clientsubscription-collection)
13. [SubscriptionPlan](#13-subscriptionplan-collection)
14. [DailyTracking](#14-dailytracking-collection)
15. [ProgressEntry](#15-progressentry-collection)
16. [DietaryRecall](#16-dietaryrecall-collection)
17. [ActivityLog](#17-activitylog-collection)

---

## 1. User Collection

**Collection Name:** `users`  
**Description:** Stores all user accounts (clients, dietitians, health counselors, admins)

### Schema Fields

| Field | Type | Required | Default | Description | Format/Enum |
|-------|------|----------|---------|-------------|-------------|
| `email` | String | ✅ Yes | - | User email address | lowercase, trimmed |
| `password` | String | ✅ Yes | - | Hashed password | min 6 chars, bcrypt hashed |
| `firstName` | String | ✅ Yes | - | First name | trimmed |
| `lastName` | String | ✅ Yes | - | Last name | trimmed |
| `role` | String | ✅ Yes | "client" | User role | "admin", "dietitian", "health_counselor", "client" |
| `status` | String | ✅ Yes | "active" | Account status | "active", "inactive", "suspended", "pending" |
| `clientStatus` | String | No | "leading" | Client engagement status | "leading", "active", "inactive", "churned" |
| `phone` | String | No | - | Phone number | unique, sparse index |
| `avatar` | String | No | - | Profile image URL | URL string |
| `emailVerified` | Boolean | No | false | Email verification status | true/false |
| `dateOfBirth` | Date | No | - | Date of birth | ISO Date |
| `gender` | String | No | - | Gender | "male", "female", "other" |
| `height` | Number | No | - | Height in cm | min: 0 |
| `weight` | Number | No | - | Weight in kg | min: 0 |
| `heightFeet` | String | No | - | Height feet part | "5", "6" |
| `heightInch` | String | No | - | Height inches part | "0"-"11" |
| `heightCm` | String | No | - | Height in cm string | "165" |
| `weightKg` | String | No | - | Weight in kg string | "70" |
| `targetWeightKg` | String | No | - | Target weight | "65" |
| `idealWeightKg` | String | No | - | Ideal weight | "62" |
| `bmi` | String | No | - | BMI value | "22.5" |
| `bmiCategory` | String | No | "" | BMI category | "", "Underweight", "Normal", "Overweight", "Obese" |
| `activityLevel` | String | No | - | Activity level | "", "sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active" |
| `healthGoals` | [String] | No | [] | Health goals list | Array of strings |
| `generalGoal` | String | No | "" | Primary goal | "", "not-specified", "weight-loss", "weight-gain", "disease-management", "muscle-gain", "maintain-weight" |
| `medicalConditions` | [String] | No | [] | Medical conditions | Array of strings |
| `allergies` | [String] | No | [] | Food allergies | Array of strings |
| `dietaryRestrictions` | [String] | No | [] | Dietary restrictions | Array of strings |
| `assignedDietitian` | ObjectId | No | - | Assigned dietitian | Reference to User |
| `assignedDietitians` | [ObjectId] | No | [] | Multiple dietitians | Array of User references |
| `assignedHealthCounselor` | ObjectId | No | - | Assigned health counselor | Reference to User |
| `assignedHealthCounselors` | [ObjectId] | No | [] | Multiple health counselors | Array of User references |
| `tags` | [ObjectId] | No | [] | User tags | Array of Tag references |
| `onboardingCompleted` | Boolean | No | false | Onboarding status | true/false |
| `onboardingStep` | Number | No | 0 | Current onboarding step | 0, 1, 2, 3... |
| `lastLoginAt` | Date | No | - | Last login timestamp | ISO DateTime |
| `createdAt` | Date | Auto | - | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | - | Updated timestamp | ISO DateTime |

### Nested Objects

#### `goals` Object
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| calories | Number | 1800 | Daily calorie target |
| protein | Number | 120 | Daily protein target (g) |
| carbs | Number | 200 | Daily carbs target (g) |
| fat | Number | 60 | Daily fat target (g) |
| water | Number | 8 | Daily water glasses |
| steps | Number | 10000 | Daily steps target |
| targetWeight | Number | - | Target weight |
| currentWeight | Number | - | Current weight |

#### `dailyGoals` Object
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| calories | Number | 2000 | Daily calorie goal |
| steps | Number | 8000 | Daily steps goal |
| water | Number | 2500 | Daily water (ml) |
| sleep | Number | 7.5 | Daily sleep (hours) |

#### `settings` Object
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| pushNotifications | Boolean | true | Push notifications enabled |
| emailNotifications | Boolean | true | Email notifications enabled |
| mealReminders | Boolean | true | Meal reminders enabled |
| appointmentReminders | Boolean | true | Appointment reminders |
| progressUpdates | Boolean | false | Progress updates enabled |
| darkMode | Boolean | false | Dark mode enabled |
| soundEnabled | Boolean | true | Sound enabled |

#### `fcmTokens` Array
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| token | String | ✅ Yes | FCM device token |
| deviceType | String | No | "web", "android", "ios" |
| deviceInfo | String | No | Device info string |
| createdAt | Date | No | Token creation date |
| lastUsed | Date | No | Last used timestamp |

#### Dietitian-Specific Fields
| Field | Type | Description |
|-------|------|-------------|
| credentials | [String] | Professional credentials |
| specializations | [String] | Specialization areas |
| experience | Number | Years of experience |
| bio | String | Biography (max 1000 chars) |
| consultationFee | Number | Consultation fee |
| availability | [Object] | Availability schedule |
| timezone | String | Timezone (default: "UTC") |

---

## 2. MedicalInfo Collection

**Collection Name:** `medicalinfos`  
**Description:** Stores medical information for clients

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `userId` | ObjectId | ✅ Yes | User reference | Unique, ref: User |
| `medicalConditions` | [String] | No | List of conditions | ["diabetes", "hypertension"] |
| `allergies` | [String] | No | Allergies list | ["peanuts", "penicillin"] |
| `dietaryRestrictions` | [String] | No | Dietary restrictions | ["gluten-free", "lactose-free"] |
| `medicalHistory` | String | No | Medical history notes | Free text |
| `familyHistory` | String | No | Family medical history | Free text |
| `medication` | String | No | Current medications | Free text |
| `bloodGroup` | String | No | Blood type | "A+", "B-", "O+", "AB-" |
| `gutIssues` | [String] | No | Gut health issues | ["IBS", "bloating"] |
| `notes` | String | No | Additional notes | Free text |
| `isPregnant` | Boolean | No | Pregnancy status | true/false |
| `isLactating` | Boolean | No | Lactation status | true/false |
| `menstrualCycle` | String | No | Cycle regularity | "regular", "irregular", "" |
| `bloodFlow` | String | No | Blood flow level | "light", "normal", "heavy", "" |
| `diseaseHistory` | [Object] | No | Disease history entries | Array of disease objects |
| `reports` | [Object] | No | Uploaded reports | Array of report objects |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `diseaseHistory` Entry
| Field | Type | Description |
|-------|------|-------------|
| id | String | Entry ID |
| disease | String | Disease name |
| since | String | Since when |
| frequency | String | Occurrence frequency |
| severity | String | Severity level |
| grading | String | Grading |
| action | String | Action taken |

#### `reports` Entry
| Field | Type | Description |
|-------|------|-------------|
| id | String | Report ID |
| fileName | String | File name |
| uploadedOn | String | Upload date |
| fileType | String | File MIME type |
| url | String | File URL |
| category | String | "Medical Report", "Blood Test", "X-Ray", "MRI/CT Scan", "Prescription", "Vaccination", "Insurance", "Other" |

---

## 3. LifestyleInfo Collection

**Collection Name:** `lifestyleinfos`  
**Description:** Stores lifestyle and dietary preference information

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `userId` | ObjectId | ✅ Yes | User reference | Unique, ref: User |
| `heightFeet` | String | No | Height feet | "5", "6" |
| `heightInch` | String | No | Height inches | "0"-"11" |
| `heightCm` | String | No | Height in cm | "165" |
| `weightKg` | String | No | Weight in kg | "70" |
| `targetWeightKg` | String | No | Target weight | "65" |
| `idealWeightKg` | String | No | Ideal weight | "62" |
| `bmi` | String | No | BMI value | "22.5" |
| `foodPreference` | String | No | Food preference | "veg", "non-veg", "eggetarian", "vegan", "" |
| `preferredCuisine` | [String] | No | Preferred cuisines | ["Indian", "Chinese"] |
| `allergiesFood` | [String] | No | Food allergies | ["nuts", "dairy"] |
| `fastDays` | [String] | No | Fasting days | ["Monday", "Thursday"] |
| `nonVegExemptDays` | [String] | No | Non-veg exempt days | ["Tuesday"] |
| `foodLikes` | String | No | Food likes | Free text |
| `foodDislikes` | String | No | Food dislikes | Free text |
| `eatOutFrequency` | String | No | Eating out frequency | "daily", "weekly", "rarely" |
| `smokingFrequency` | String | No | Smoking frequency | "never", "occasionally", "daily" |
| `alcoholFrequency` | String | No | Alcohol frequency | "never", "occasionally", "weekly" |
| `activityRate` | String | No | Activity rate | Free text |
| `activityLevel` | String | No | Activity level | "sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active", "" |
| `cookingOil` | [String] | No | Cooking oils used | ["olive", "coconut", "mustard"] |
| `monthlyOilConsumption` | String | No | Monthly oil consumption | "1L", "2L" |
| `cookingSalt` | String | No | Type of salt used | "rock salt", "table salt" |
| `carbonatedBeverageFrequency` | String | No | Soda frequency | "never", "daily", "weekly" |
| `cravingType` | String | No | Craving type | "sweet", "salty", "spicy" |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 4. MealPlan Collection

**Collection Name:** `mealplans`  
**Description:** Stores meal plans created by dietitians for clients

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `name` | String | ✅ Yes | Plan name | max 200 chars, trimmed |
| `description` | String | No | Plan description | max 1000 chars |
| `dietitian` | ObjectId | ✅ Yes | Dietitian who created | ref: User |
| `client` | ObjectId | ✅ Yes | Client assigned to | ref: User |
| `startDate` | Date | ✅ Yes | Plan start date | ISO Date |
| `endDate` | Date | ✅ Yes | Plan end date | Must be after startDate |
| `dailyCalorieTarget` | Number | ✅ Yes | Daily calories | min: 800, max: 5000 |
| `dailyMacros` | Object | ✅ Yes | Daily macro targets | See below |
| `meals` | [Object] | ✅ Yes | 7-day meal schedule | Must have 7 days |
| `isActive` | Boolean | No | Active status | default: true |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `dailyMacros` Object
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| protein | Number | ✅ Yes | Protein grams (min: 0) |
| carbs | Number | ✅ Yes | Carbs grams (min: 0) |
| fat | Number | ✅ Yes | Fat grams (min: 0) |

#### `meals` Array Entry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| day | Number | ✅ Yes | Day number (1-7) |
| breakfast | [ObjectId] | No | Breakfast recipes (ref: Recipe) |
| lunch | [ObjectId] | No | Lunch recipes (ref: Recipe) |
| dinner | [ObjectId] | No | Dinner recipes (ref: Recipe) |
| snacks | [ObjectId] | No | Snack recipes (ref: Recipe) |

---

## 5. ClientMealPlan Collection

**Collection Name:** `clientmealplans`  
**Description:** Client-specific meal plan assignments with tracking

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `clientId` | ObjectId | ✅ Yes | Client reference | ref: User |
| `dietitianId` | ObjectId | ✅ Yes | Dietitian reference | ref: User |
| `templateId` | ObjectId | ✅ Yes | Template reference | ref: MealPlanTemplate |
| `purchaseId` | ObjectId | No | Purchase reference | ref: Purchase |
| `name` | String | ✅ Yes | Plan name | String |
| `startDate` | Date | ✅ Yes | Start date | ISO Date |
| `endDate` | Date | ✅ Yes | End date | ISO Date |
| `status` | String | ✅ Yes | Plan status | "active", "completed", "paused", "cancelled" |
| `freezedDays` | [Object] | No | Frozen days | Array of freeze entries |
| `totalFreezeCount` | Number | No | Total freezes used | Number |
| `customizations` | Object | No | Plan customizations | See below |
| `progress` | [Object] | No | Progress entries | Array of progress objects |
| `mealCompletions` | [Object] | No | Meal completions | Array of completion objects |
| `goals` | Object | No | Goals and targets | See below |
| `reminders` | Object | No | Reminder settings | See below |
| `analytics` | Object | No | Plan analytics | See below |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `goals` Object
| Field | Type | Description |
|-------|------|-------------|
| weightGoal | Number | Target weight |
| bodyFatGoal | Number | Target body fat % |
| targetDate | Date | Target date |
| primaryGoal | String | "weight-loss", "weight-gain", "maintenance", "muscle-gain", "health-improvement" |
| secondaryGoals | [String] | Secondary goals list |

#### `mealCompletions` Entry
| Field | Type | Description |
|-------|------|-------------|
| date | Date | Completion date |
| mealType | String | "breakfast", "morningSnack", "lunch", "afternoonSnack", "dinner", "eveningSnack" |
| completed | Boolean | Completion status |
| actualServings | Number | Actual servings consumed |
| substitutions | String | Any substitutions made |
| notes | String | Additional notes |
| rating | Number | 1-5 rating |

---

## 6. Recipe Collection

**Collection Name:** `recipes`  
**Description:** Stores recipe information

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `uuid` | String | No | Unique identifier | Unique, indexed |
| `isActive` | Boolean | No | Active status | default: true |
| `name` | String | ✅ Yes | Recipe name | trimmed |
| `description` | String | No | Recipe description | Free text |
| `ingredients` | [Object] | ✅ Yes | Ingredients list | Min 1 ingredient |
| `instructions` | [String] | ✅ Yes | Cooking instructions | Min 1 instruction |
| `prepTime` | Number | ✅ Yes | Prep time (minutes) | min: 0 |
| `cookTime` | Number | ✅ Yes | Cook time (minutes) | min: 0 |
| `servings` | Mixed | ✅ Yes | Number of servings | Number ≥1 or String |
| `nutrition` | Object | ✅ Yes | Nutrition info | See below |
| `tags` | [String] | No | Recipe tags | lowercase, trimmed |
| `dietaryRestrictions` | [String] | No | Dietary restrictions | trimmed |
| `allergens` | [String] | No | Allergens | "nuts", "dairy", "eggs", "soy", "gluten", "shellfish", "fish", "sesame" |
| `medicalContraindications` | [String] | No | Medical contraindications | trimmed |
| `difficulty` | String | No | Difficulty level | "easy", "medium", "hard" (default: "medium") |
| `image` | String | No | Image URL | URL string |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `nutrition` Object
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| calories | Number | ✅ Yes | Calories (min: 0) |
| protein | Number | ✅ Yes | Protein grams (min: 0) |
| carbs | Number | ✅ Yes | Carbs grams (min: 0) |
| fat | Number | ✅ Yes | Fat grams (min: 0) |

#### `ingredients` Entry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | ✅ Yes | Ingredient name |
| quantity | Number | ✅ Yes | Quantity (min: 0) |
| unit | String | ✅ Yes | Unit (g, ml, cups, etc.) |
| remarks | String | No | Additional remarks |

---

## 7. Task Collection

**Collection Name:** `tasks`  
**Description:** Stores tasks assigned to clients by dietitians

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `client` | ObjectId | ✅ Yes | Client reference | ref: User |
| `dietitian` | ObjectId | ✅ Yes | Dietitian reference | ref: User |
| `creatorRole` | String | No | Creator's role | "dietitian", "health_counselor", "admin" |
| `taskType` | String | ✅ Yes | Task type | "General Followup", "Habit Update", "Session Booking", "Sign Document", "Form Allotment", "Report Upload", "Diary Update", "Measurement Update", "BCA Update", "Progress Update" |
| `title` | String | ✅ Yes | Task title | trimmed |
| `description` | String | No | Task description | max 2000 chars |
| `startDate` | Date | ✅ Yes | Start date | ISO Date |
| `endDate` | Date | ✅ Yes | End date | ISO Date |
| `allottedTime` | String | ✅ Yes | Allotted time | "12:00 AM", "02:30 PM" |
| `repeatFrequency` | Number | No | Repeat frequency | 0=no repeat, 1=daily, 7=weekly |
| `notifyClientOnChat` | Boolean | No | Notify on chat | default: false |
| `notifyDieticianOnCompletion` | String | No | Dietitian to notify | Email or user ID |
| `status` | String | No | Task status | "pending", "in-progress", "completed", "cancelled" |
| `tags` | [ObjectId] | No | Task tags | ref: Tag |
| `googleCalendarEventId` | String | No | Google Calendar event ID | String |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 8. Appointment Collection

**Collection Name:** `appointments`  
**Description:** Stores appointment bookings between clients and dietitians

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `dietitian` | ObjectId | ✅ Yes | Dietitian reference | ref: User |
| `client` | ObjectId | ✅ Yes | Client reference | ref: User |
| `type` | String | ✅ Yes | Appointment type | "consultation", "follow_up", "video_call", "in_person" |
| `status` | String | ✅ Yes | Appointment status | "scheduled", "completed", "cancelled", "no_show" |
| `scheduledAt` | Date | ✅ Yes | Scheduled date/time | ISO DateTime |
| `duration` | Number | ✅ Yes | Duration in minutes | min: 15, max: 180, default: 60 |
| `notes` | String | No | Appointment notes | max 2000 chars |
| `meetingLink` | String | No | Video meeting link | URL string |
| `zoomMeeting` | Object | No | Zoom meeting details | See below |
| `googleCalendarEventId` | Object | No | Google Calendar IDs | { dietitian: String, client: String } |
| `createdBy` | ObjectId | No | Creator reference | ref: User |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `zoomMeeting` Object
| Field | Type | Description |
|-------|------|-------------|
| meetingId | String | Zoom meeting ID |
| meetingUuid | String | Zoom meeting UUID |
| joinUrl | String | Join URL for participants |
| startUrl | String | Start URL for host |
| password | String | Meeting password |
| hostEmail | String | Host email |

---

## 9. Message Collection

**Collection Name:** `messages`  
**Description:** Stores chat messages between users

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `sender` | ObjectId | ✅ Yes | Sender reference | ref: User |
| `receiver` | ObjectId | ✅ Yes | Receiver reference | ref: User |
| `type` | String | ✅ Yes | Message type | "text", "image", "audio", "video", "file", "voice_note" |
| `content` | String | ✅ Yes | Message content | max 2000 chars |
| `attachments` | [Object] | No | File attachments | See below |
| `status` | String | No | Message status | "sent", "delivered", "read", "failed" |
| `isRead` | Boolean | No | Read status | default: false |
| `readAt` | Date | No | Read timestamp | ISO DateTime |
| `deliveredAt` | Date | No | Delivery timestamp | ISO DateTime |
| `editedAt` | Date | No | Edit timestamp | ISO DateTime |
| `deletedAt` | Date | No | Deletion timestamp | ISO DateTime |
| `replyTo` | ObjectId | No | Reply message ref | ref: Message |
| `reactions` | [Object] | No | Message reactions | See below |
| `isForwarded` | Boolean | No | Forwarded status | true/false |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `attachments` Entry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | String | ✅ Yes | File URL |
| filename | String | ✅ Yes | File name |
| size | Number | ✅ Yes | File size in bytes |
| mimeType | String | ✅ Yes | MIME type |
| thumbnail | String | No | Thumbnail URL |
| duration | Number | No | Duration (audio/video) |
| width | Number | No | Width (images/videos) |
| height | Number | No | Height (images/videos) |

#### `reactions` Entry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| emoji | String | ✅ Yes | Emoji reaction |
| userId | ObjectId | ✅ Yes | User who reacted |
| createdAt | Date | No | Reaction timestamp |

---

## 10. Notification Collection

**Collection Name:** `notifications`  
**Description:** Stores user notifications

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `userId` | ObjectId | ✅ Yes | User reference | ref: User, indexed |
| `title` | String | ✅ Yes | Notification title | String |
| `message` | String | ✅ Yes | Notification message | String |
| `type` | String | No | Notification type | "meal", "appointment", "progress", "message", "reminder", "system", "task", "payment", "custom" |
| `read` | Boolean | No | Read status | default: false, indexed |
| `data` | Mixed | No | Additional data | Any JSON object |
| `actionUrl` | String | No | Action URL | URL string |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 11. Payment Collection

**Collection Name:** `payments`  
**Description:** Stores payment transactions

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `client` | ObjectId | ✅ Yes | Client reference | ref: User |
| `dietitian` | ObjectId | No | Dietitian reference | ref: User |
| `type` | String | ✅ Yes | Payment type | "subscription", "consultation", "meal_plan", "service_plan" |
| `amount` | Number | ✅ Yes | Payment amount | min: 0 |
| `currency` | String | ✅ Yes | Currency code | default: "INR", uppercase |
| `status` | String | ✅ Yes | Payment status | "pending", "paid", "failed", "refunded" |
| `paymentMethod` | String | No | Payment method | default: "razorpay" |
| `transactionId` | String | No | Transaction ID | unique, sparse |
| `description` | String | No | Payment description | max 1000 chars |
| `planName` | String | No | Plan name | trimmed |
| `planCategory` | String | No | Plan category | trimmed |
| `durationDays` | Number | No | Duration in days | min: 1 |
| `durationLabel` | String | No | Duration label | "1 Month", "3 Months" |
| `paymentLink` | ObjectId | No | Payment link ref | ref: PaymentLink |
| `mealPlanCreated` | Boolean | No | Meal plan created | default: false |
| `mealPlanId` | ObjectId | No | Meal plan ref | ref: ClientMealPlan |
| `payerEmail` | String | No | Payer email | trimmed |
| `payerPhone` | String | No | Payer phone | trimmed |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 12. ClientSubscription Collection

**Collection Name:** `clientsubscriptions`  
**Description:** Stores client subscription assignments

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `client` | ObjectId | ✅ Yes | Client reference | ref: User |
| `dietitian` | ObjectId | ✅ Yes | Dietitian reference | ref: User |
| `plan` | ObjectId | ✅ Yes | Plan reference | ref: SubscriptionPlan |
| `startDate` | Date | ✅ Yes | Start date | ISO Date |
| `endDate` | Date | ✅ Yes | End date | ISO Date |
| `status` | String | ✅ Yes | Subscription status | "active", "expired", "cancelled", "pending" |
| `paymentStatus` | String | ✅ Yes | Payment status | "pending", "paid", "failed", "refunded" |
| `paymentMethod` | String | ✅ Yes | Payment method | "razorpay", "manual", "cash", "bank-transfer" |
| `amount` | Number | ✅ Yes | Subscription amount | min: 0 |
| `currency` | String | ✅ Yes | Currency code | default: "INR", uppercase |
| `razorpayOrderId` | String | No | Razorpay order ID | sparse |
| `razorpayPaymentId` | String | No | Razorpay payment ID | sparse |
| `razorpaySignature` | String | No | Razorpay signature | String |
| `paymentLink` | String | No | Payment link URL | URL string |
| `transactionId` | String | No | Transaction ID | sparse |
| `paidAt` | Date | No | Payment timestamp | ISO DateTime |
| `notes` | String | No | Notes | max 1000 chars |
| `consultationsUsed` | Number | No | Consultations used | default: 0, min: 0 |
| `followUpsUsed` | Number | No | Follow-ups used | default: 0, min: 0 |
| `videoCallsUsed` | Number | No | Video calls used | default: 0, min: 0 |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 13. SubscriptionPlan Collection

**Collection Name:** `subscriptionplans`  
**Description:** Stores subscription plan templates

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `name` | String | ✅ Yes | Plan name | max 200 chars, trimmed |
| `description` | String | No | Plan description | max 1000 chars |
| `duration` | Number | ✅ Yes | Duration value | min: 1 |
| `durationType` | String | ✅ Yes | Duration type | "days", "weeks", "months" |
| `price` | Number | ✅ Yes | Plan price | min: 0 |
| `currency` | String | ✅ Yes | Currency code | default: "INR", uppercase |
| `features` | [String] | No | Plan features | Array of feature strings |
| `category` | String | ✅ Yes | Plan category | "weight-loss", "weight-gain", "muscle-gain", "diabetes", "pcos", "thyroid", "general-wellness", "custom" |
| `isActive` | Boolean | No | Active status | default: true |
| `consultationsIncluded` | Number | No | Consultations included | default: 0, min: 0 |
| `dietPlanIncluded` | Boolean | No | Diet plan included | default: true |
| `followUpsIncluded` | Number | No | Follow-ups included | default: 0, min: 0 |
| `chatSupport` | Boolean | No | Chat support | default: true |
| `videoCallsIncluded` | Number | No | Video calls included | default: 0, min: 0 |
| `createdBy` | ObjectId | ✅ Yes | Creator reference | ref: User |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 14. DailyTracking Collection

**Collection Name:** `dailytrackings`  
**Description:** Stores daily health tracking data (water, steps, sleep)

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `client` | ObjectId | ✅ Yes | Client reference | ref: User |
| `date` | Date | ✅ Yes | Tracking date | ISO Date, unique per client |
| `water.glasses` | Number | No | Glasses consumed | default: 0, min: 0, max: 20 |
| `water.target` | Number | No | Water target | default: 8, min: 1, max: 20 |
| `steps.count` | Number | No | Steps taken | default: 0, min: 0, max: 100000 |
| `steps.target` | Number | No | Steps target | default: 10000, min: 1000, max: 50000 |
| `sleep.hours` | Number | No | Hours slept | default: 0, min: 0, max: 24 |
| `sleep.target` | Number | No | Sleep target | default: 8, min: 4, max: 12 |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 15. ProgressEntry Collection

**Collection Name:** `progressentries`  
**Description:** Stores user progress measurements over time

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `user` | ObjectId | ✅ Yes | User reference | ref: User |
| `type` | String | ✅ Yes | Measurement type | "weight", "body_fat", "muscle_mass", "waist", "chest", "hips", "arms", "thighs", "height", "photo" |
| `value` | Mixed | ✅ Yes | Measurement value | Number or String (for photo URLs) |
| `unit` | String | No | Measurement unit | default: "kg" |
| `notes` | String | No | Additional notes | max 1000 chars |
| `recordedAt` | Date | ✅ Yes | Recording timestamp | default: now |
| `metadata` | Mixed | No | Additional metadata | Any JSON object |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

---

## 16. DietaryRecall Collection

**Collection Name:** `dietaryrecalls`  
**Description:** Stores dietary recall entries (what user ate)

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `userId` | ObjectId | ✅ Yes | User reference | ref: User |
| `date` | Date | No | Recall date | default: now |
| `meals` | [Object] | No | Meal entries | Array of meal objects |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `meals` Entry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mealType | String | No | "Early Morning", "BreakFast", "Lunch", "Evening Snack", "Dinner", "Post Dinner" |
| hour | String | No | Hour (1-12) |
| minute | String | No | Minute (00-59) |
| meridian | String | No | "AM" or "PM" |
| food | String | No | Food consumed |

---

## 17. ActivityLog Collection

**Collection Name:** `activitylogs`  
**Description:** Stores system activity logs for auditing

### Schema Fields

| Field | Type | Required | Description | Format/Enum |
|-------|------|----------|-------------|-------------|
| `userId` | ObjectId | ✅ Yes | User who performed action | ref: User |
| `userRole` | String | ✅ Yes | User's role | "admin", "dietitian", "health_counselor", "client" |
| `userName` | String | ✅ Yes | User's name | String |
| `userEmail` | String | ✅ Yes | User's email | String |
| `action` | String | ✅ Yes | Action description | String |
| `actionType` | String | ✅ Yes | Action type | "create", "update", "delete", "view", "assign", "complete", "cancel", "payment", "login", "logout", "other" |
| `category` | String | ✅ Yes | Action category | "meal_plan", "diet_plan", "appointment", "payment", "task", "note", "document", "profile", "client_assignment", "recipe", "fitness", "message", "subscription", "auth", "system", "other" |
| `description` | String | ✅ Yes | Detailed description | String |
| `targetUserId` | ObjectId | No | Target user ref | ref: User |
| `targetUserName` | String | No | Target user name | String |
| `resourceId` | String | No | Resource ID | String |
| `resourceType` | String | No | Resource type | String |
| `resourceName` | String | No | Resource name | String |
| `details` | Object | No | Additional details | Any JSON object |
| `changeDetails` | [Object] | No | Field changes | Array of change objects |
| `ipAddress` | String | No | IP address | String |
| `userAgent` | String | No | User agent | String |
| `isRead` | Boolean | No | Read status | true/false |
| `createdAt` | Date | Auto | Created timestamp | ISO DateTime |
| `updatedAt` | Date | Auto | Updated timestamp | ISO DateTime |

#### `changeDetails` Entry
| Field | Type | Description |
|-------|------|-------------|
| fieldName | String | Field that changed |
| oldValue | Any | Old value |
| newValue | Any | New value |

---

## Data Types Reference

| Type | MongoDB Type | Description | Example |
|------|-------------|-------------|---------|
| String | String | Text data | "John Doe" |
| Number | Number | Integer or float | 75.5 |
| Boolean | Boolean | True/false | true |
| Date | Date | ISO 8601 datetime | "2025-01-19T10:30:00Z" |
| ObjectId | ObjectId | MongoDB ID reference | "507f1f77bcf86cd799439011" |
| Mixed | Mixed | Any type | Can be object, array, string, etc. |
| [Type] | Array | Array of specified type | ["item1", "item2"] |
| Object | Object | Nested document | { key: "value" } |

---

## Common Field Patterns

### Timestamps
All collections include:
```json
{
  "createdAt": "2025-01-19T10:30:00Z",
  "updatedAt": "2025-01-19T11:45:00Z"
}
```

### User References
References to users use ObjectId:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "client": "507f1f77bcf86cd799439012",
  "dietitian": "507f1f77bcf86cd799439013"
}
```

### Status Fields
Common status patterns:
- **User Status:** "active", "inactive", "suspended", "pending"
- **Subscription Status:** "active", "expired", "cancelled", "pending"
- **Payment Status:** "pending", "paid", "failed", "refunded"
- **Task Status:** "pending", "in-progress", "completed", "cancelled"
- **Appointment Status:** "scheduled", "completed", "cancelled", "no_show"

---

**Last Updated:** January 19, 2026  
**Total Collections:** 17+
`
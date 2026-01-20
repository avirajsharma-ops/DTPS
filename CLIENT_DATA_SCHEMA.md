# Client Data Schema Documentation

This document describes all data fields for client information in the DTPS system. Fields are organized by their respective models to **prevent duplication**.

---

## 📋 Data Model Overview

| Model | Purpose | Key |
|-------|---------|-----|
| **User** | Core account & profile info | `_id` |
| **LifestyleInfo** | Physical measurements, food preferences, habits | `userId` → User._id |
| **MedicalInfo** | Medical conditions, allergies, health history | `userId` → User._id |
| **DietaryRecall** | Daily meal logs/food diary | `userId` → User._id |

---

## 👤 User Model

Core account information. **DO NOT** store lifestyle or medical data here.

### Authentication & Account

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | Primary email (unique, lowercase) |
| `password` | String | Hashed password (bcrypt) |
| `phone` | String | Primary phone number (unique) |
| `emailVerified` | Boolean | Email verification status |
| `status` | Enum | Account status: `active`, `inactive`, `suspended` |
| `role` | Enum | User role: `client`, `dietitian`, `health_counselor`, `admin` |
| `lastLoginAt` | Date | Last login timestamp |

### Basic Profile

| Field | Type | Description |
|-------|------|-------------|
| `firstName` | String | First name |
| `lastName` | String | Last name |
| `avatar` | String | Profile picture URL (ImageKit) |
| `dateOfBirth` | Date | Date of birth |
| `gender` | Enum | Gender: `male`, `female`, `other` |
| `timezone` | String | User timezone (default: UTC) |

### Contact & Demographics

| Field | Type | Description |
|-------|------|-------------|
| `alternativePhone` | String | Secondary phone number |
| `alternativeEmail` | String | Secondary email |
| `maritalStatus` | String | Marital status |
| `occupation` | String | Job/profession |
| `anniversary` | Date | Wedding anniversary |

### Client Status & Assignment

| Field | Type | Description |
|-------|------|-------------|
| `clientStatus` | Enum | Engagement status: `leading`, `active`, `inactive`, `completed` |
| `assignedDietitian` | ObjectId | Primary assigned dietitian (legacy) |
| `assignedDietitians` | [ObjectId] | Multiple assigned dietitians |
| `assignedHealthCounselor` | ObjectId | Primary health counselor (legacy) |
| `assignedHealthCounselors` | [ObjectId] | Multiple health counselors |
| `tags` | [ObjectId] | Tags for categorization |

### Lead Source

| Field | Type | Description |
|-------|------|-------------|
| `source` | String | How client found us (google_ads, facebook, referral, etc.) |
| `referralSource` | String | Referral details if applicable |
| `parentAccount` | String | Parent/linked account |

### Basic Measurements (Summary)

| Field | Type | Description |
|-------|------|-------------|
| `height` | Number | Height in cm (summary only) |
| `weight` | Number | Weight in kg (summary only) |
| `bmiCategory` | Enum | BMI category: `Underweight`, `Normal`, `Overweight`, `Obese` |

> ⚠️ **Note:** Detailed measurements (heightFeet, heightCm, weightKg, etc.) are in **LifestyleInfo**

### Goals & Targets

| Field | Type | Description |
|-------|------|-------------|
| `generalGoal` | Enum | Primary goal: `weight-loss`, `weight-gain`, `muscle-gain`, `maintain-weight`, `disease-management` |
| `healthGoals` | [String] | List of health goals |
| `targetWeightBucket` | String | Target weight range |
| `goals.calories` | Number | Daily calorie target (default: 1800) |
| `goals.protein` | Number | Daily protein target in grams (default: 120) |
| `goals.carbs` | Number | Daily carbs target in grams (default: 200) |
| `goals.fat` | Number | Daily fat target in grams (default: 60) |
| `goals.water` | Number | Daily water glasses (default: 8) |
| `goals.steps` | Number | Daily step target (default: 10000) |
| `goals.targetWeight` | Number | Target weight in kg |
| `goals.currentWeight` | Number | Current weight snapshot |

### Daily Goals (Onboarding)

| Field | Type | Description |
|-------|------|-------------|
| `dailyGoals.calories` | Number | Daily calorie goal (default: 2000) |
| `dailyGoals.steps` | Number | Daily steps goal (default: 8000) |
| `dailyGoals.water` | Number | Daily water in ml (default: 2500) |
| `dailyGoals.sleep` | Number | Sleep hours goal (default: 7.5) |

### Dietary Preferences

| Field | Type | Description |
|-------|------|-------------|
| `dietType` | String | Diet type (veg, non-veg, vegan, etc.) |
| `specificExclusions.alcoholFree` | Boolean | Excludes alcohol |
| `specificExclusions.porkFree` | Boolean | Excludes pork |

> ⚠️ **Note:** Detailed food preferences are in **LifestyleInfo**

### Onboarding

| Field | Type | Description |
|-------|------|-------------|
| `onboardingCompleted` | Boolean | Onboarding completion status |
| `onboardingStep` | Number | Current onboarding step |

### Documents

| Field | Type | Description |
|-------|------|-------------|
| `documents` | Array | Uploaded documents |
| `documents[].type` | Enum | Document type: `meal-picture`, `medical-report` |
| `documents[].fileName` | String | Original filename |
| `documents[].filePath` | String | Storage path/URL |
| `documents[].uploadedAt` | Date | Upload timestamp |
| `sharePhotoConsent` | Boolean | Consent to share photos |

### Settings & Notifications

| Field | Type | Description |
|-------|------|-------------|
| `settings.pushNotifications` | Boolean | Enable push notifications |
| `settings.emailNotifications` | Boolean | Enable email notifications |
| `settings.mealReminders` | Boolean | Enable meal reminders |
| `settings.appointmentReminders` | Boolean | Enable appointment reminders |
| `settings.progressUpdates` | Boolean | Enable progress updates |
| `settings.darkMode` | Boolean | Dark mode preference |
| `settings.soundEnabled` | Boolean | Enable sounds |
| `pushNotificationEnabled` | Boolean | Master push notification toggle |
| `fcmTokens` | Array | Firebase Cloud Messaging tokens |

### Reminder Preferences

| Field | Type | Description |
|-------|------|-------------|
| `reminderPreferences.mealReminders` | Boolean | Enable meal reminders |
| `reminderPreferences.mealTimes` | [String] | Preferred meal reminder times |
| `reminderPreferences.appointmentReminders` | Boolean | Enable appointment reminders |
| `reminderPreferences.reminderBefore` | Number | Minutes before appointment to remind |

### Password Reset

| Field | Type | Description |
|-------|------|-------------|
| `passwordResetToken` | String | Password reset token (temporary) |
| `passwordResetTokenExpiry` | Date | Token expiry time |

### Fitness Tracking

| Field | Type | Description |
|-------|------|-------------|
| `fitnessData.dailyRecords` | Array | Daily fitness records |
| `fitnessData.dailyRecords[].date` | String | Date (YYYY-MM-DD) |
| `fitnessData.dailyRecords[].steps` | Number | Steps count |
| `fitnessData.dailyRecords[].calories` | Number | Calories burned |
| `fitnessData.dailyRecords[].distance` | Number | Distance in meters |
| `fitnessData.dailyRecords[].heartRate` | Number | Average heart rate |
| `fitnessData.dailyRecords[].activeMinutes` | Number | Active minutes |
| `fitnessData.goals.dailySteps` | Number | Daily step goal |
| `fitnessData.goals.dailyCalories` | Number | Daily calorie burn goal |
| `fitnessData.preferences.units` | Enum | Units: `metric`, `imperial` |
| `fitnessData.connectedDevice` | String | Connected fitness device |
| `fitnessData.lastSync` | Date | Last sync timestamp |

### WooCommerce Integration

| Field | Type | Description |
|-------|------|-------------|
| `wooCommerceData.customerId` | Number | WooCommerce customer ID |
| `wooCommerceData.totalOrders` | Number | Total orders count |
| `wooCommerceData.totalSpent` | Number | Total amount spent |
| `wooCommerceData.orders` | Array | Order history |

### Google Calendar

| Field | Type | Description |
|-------|------|-------------|
| `googleCalendarAccessToken` | String | OAuth access token |
| `googleCalendarRefreshToken` | String | OAuth refresh token |
| `googleCalendarTokenExpiry` | Date | Token expiry |

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `createdBy.userId` | ObjectId | Who created this account |
| `createdBy.role` | Enum | Creator role: `self`, `dietitian`, `health_counselor`, `admin` |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

## 🏃 LifestyleInfo Model

Physical measurements, food preferences, and lifestyle habits.

### Physical Measurements

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Reference to User (unique) |
| `heightFeet` | String | Height - feet component |
| `heightInch` | String | Height - inches component |
| `heightCm` | String | Height in centimeters |
| `weightKg` | String | Current weight in kg |
| `targetWeightKg` | String | Target weight in kg |
| `idealWeightKg` | String | Ideal weight in kg |
| `bmi` | String | Calculated BMI value |

### Food Preferences

| Field | Type | Description |
|-------|------|-------------|
| `foodPreference` | Enum | Diet type: `veg`, `non-veg`, `eggetarian`, `vegan` |
| `preferredCuisine` | [String] | Preferred cuisines (Indian, Chinese, etc.) |
| `allergiesFood` | [String] | Food allergies |
| `fastDays` | [String] | Fasting days (Monday, Thursday, etc.) |
| `nonVegExemptDays` | [String] | Days when non-veg is avoided |
| `foodLikes` | String | Foods the client likes |
| `foodDislikes` | String | Foods the client dislikes |

### Lifestyle Habits

| Field | Type | Description |
|-------|------|-------------|
| `activityLevel` | Enum | Activity level: `sedentary`, `lightly_active`, `moderately_active`, `very_active`, `extremely_active` |
| `activityRate` | String | Activity frequency/rate |
| `eatOutFrequency` | String | How often client eats out |
| `smokingFrequency` | String | Smoking frequency |
| `alcoholFrequency` | String | Alcohol consumption frequency |
| `carbonatedBeverageFrequency` | String | Soda/carbonated drink frequency |
| `cravingType` | String | Type of food cravings |

### Cooking Preferences

| Field | Type | Description |
|-------|------|-------------|
| `cookingOil` | [String] | Types of cooking oil used |
| `monthlyOilConsumption` | String | Monthly oil consumption amount |
| `cookingSalt` | String | Type of salt used |

### Timestamps

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

## 🏥 MedicalInfo Model

Medical conditions, allergies, and health history.

### Core Medical Data

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Reference to User (unique) |
| `medicalConditions` | [String] | List of medical conditions (diabetes, hypertension, etc.) |
| `allergies` | [String] | Allergies (food, medication, environmental) |
| `dietaryRestrictions` | [String] | Dietary restrictions (gluten-free, lactose-free, etc.) |
| `bloodGroup` | String | Blood group (A+, B-, O+, etc.) |

### Medical History

| Field | Type | Description |
|-------|------|-------------|
| `medicalHistory` | String | Past medical history notes |
| `familyHistory` | String | Family medical history |
| `medication` | String | Current medications |
| `gutIssues` | [String] | Gut/digestive issues |
| `notes` | String | Additional medical notes |

### Disease History (Detailed)

| Field | Type | Description |
|-------|------|-------------|
| `diseaseHistory` | Array | Detailed disease records |
| `diseaseHistory[].id` | String | Unique ID |
| `diseaseHistory[].disease` | String | Disease name |
| `diseaseHistory[].since` | String | Duration/since when |
| `diseaseHistory[].frequency` | String | Occurrence frequency |
| `diseaseHistory[].severity` | String | Severity level |
| `diseaseHistory[].grading` | String | Medical grading |
| `diseaseHistory[].action` | String | Treatment/action taken |

### Female-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `isPregnant` | Boolean | Pregnancy status |
| `isLactating` | Boolean | Breastfeeding status |
| `menstrualCycle` | Enum | Cycle type: `regular`, `irregular` |
| `bloodFlow` | Enum | Flow intensity: `light`, `normal`, `heavy` |

### Medical Reports

| Field | Type | Description |
|-------|------|-------------|
| `reports` | Array | Uploaded medical reports |
| `reports[].id` | String | Report ID |
| `reports[].fileName` | String | File name |
| `reports[].uploadedOn` | String | Upload date |
| `reports[].fileType` | String | File MIME type |
| `reports[].url` | String | File URL (ImageKit/GridFS) |
| `reports[].category` | Enum | Category: `Medical Report`, `Blood Test`, `X-Ray`, `MRI/CT Scan`, `Prescription`, `Vaccination`, `Insurance`, `Other` |

### Timestamps

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

## 🍽️ DietaryRecall Model

Daily food diary / meal logging.

### Core Fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Reference to User |
| `date` | Date | Date of the food diary |

### Meal Entries

| Field | Type | Description |
|-------|------|-------------|
| `meals` | Array | List of meals for the day |
| `meals[].mealType` | Enum | Meal type: `Early Morning`, `BreakFast`, `Lunch`, `Evening Snack`, `Dinner`, `Post Dinner` |
| `meals[].hour` | String | Hour of meal |
| `meals[].minute` | String | Minute of meal |
| `meals[].meridian` | Enum | AM or PM |
| `meals[].food` | String | Food consumed |

### Timestamps

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | Date | Record creation timestamp |
| `updatedAt` | Date | Last update timestamp |

---

## 🔗 Relationships

```
User (1) ─────────────── (1) LifestyleInfo
  │                           
  ├─────────────────── (1) MedicalInfo
  │
  └─────────────────── (N) DietaryRecall
```

---

## ⚠️ Important Notes

### Data Storage Rules

1. **Physical Measurements** → Store in `LifestyleInfo`
   - Height (feet, inches, cm)
   - Weight (kg)
   - Target/Ideal weight
   - BMI
   - Activity level

2. **Medical Data** → Store in `MedicalInfo`
   - Medical conditions
   - Allergies
   - Dietary restrictions
   - Disease history
   - Reports

3. **Food Diary** → Store in `DietaryRecall`
   - Daily meals
   - What was eaten and when

4. **Core Profile** → Store in `User`
   - Authentication
   - Basic profile
   - Settings
   - Goals (summary)

### Backward Compatibility

Some fields in `User` are marked as **DEPRECATED** with comments. They were moved to specialized models but kept for backward compatibility:
- `heightFeet`, `heightInch`, `heightCm`, `weightKg`, `targetWeightKg`, `idealWeightKg`, `bmi`, `activityLevel` → Use `LifestyleInfo`
- `medicalConditions`, `allergies`, `dietaryRestrictions` → Use `MedicalInfo`

### Querying Related Data

To get full client data, query all models:

```typescript
const user = await User.findById(userId);
const lifestyle = await LifestyleInfo.findOne({ userId });
const medical = await MedicalInfo.findOne({ userId });
const dietRecalls = await DietaryRecall.find({ userId }).sort({ date: -1 });
```

---

## 📊 Field Count Summary

| Model | Fields | Purpose |
|-------|--------|---------|
| User | ~60+ | Core account, profile, settings, goals |
| LifestyleInfo | ~20 | Physical measurements, food prefs, habits |
| MedicalInfo | ~20 | Medical conditions, history, reports |
| DietaryRecall | ~6 | Daily meal diary |

**Total unique fields: ~100+**

---

*Last updated: January 2026*

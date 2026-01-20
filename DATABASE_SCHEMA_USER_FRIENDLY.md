# DTPS Database Guide - Simple Format

**Easy-to-Understand Guide for Non-Technical Users**

This guide explains what information DTPS stores in its database and how it's organized. No technical knowledge required!

---

## 📚 Table of Contents

1. [User Accounts](#1-user-accounts)
2. [Medical Information](#2-medical-information)
3. [Lifestyle Details](#3-lifestyle-details)
4. [Meal Plans](#4-meal-plans)
5. [Client's Meal Assignments](#5-clients-meal-assignments)
6. [Recipes](#6-recipes)
7. [Tasks](#7-tasks)
8. [Appointments](#8-appointments)
9. [Messages & Chat](#9-messages--chat)
10. [Notifications](#10-notifications)
11. [Payments](#11-payments)
12. [Subscriptions](#12-subscriptions)
13. [Subscription Plans](#13-subscription-plans)
14. [Daily Tracking](#14-daily-tracking)
15. [Progress Tracking](#15-progress-tracking)
16. [Food Diary](#16-food-diary)
17. [Activity Logs](#17-activity-logs)

---

## 1. User Accounts

**What it stores:** Information about everyone who uses the DTPS app

### Basic Information (Required)
- **Email:** Your email address (must be unique)
- **Password:** Your secure password (at least 6 characters)
- **First Name:** Your first name
- **Last Name:** Your last name
- **Role:** What type of user you are:
  - `admin` - System administrator
  - `dietitian` - Professional dietitian
  - `health_counselor` - Health counselor
  - `client` - Client/patient

### Account Status
- **Status:** Current account status (`active`, `inactive`, `suspended`, or `pending`)
- **Client Status:** For clients only - `leading` (new), `active`, `inactive`, or `churned` (left)
- **Email Verified:** Whether email has been confirmed (yes/no)
- **Last Login:** When you last logged in

### Personal Details (Optional)
- **Phone:** Contact phone number
- **Avatar:** Profile picture URL
- **Date of Birth:** Your birth date
- **Gender:** Male, Female, or Other

### Weight & Height Information (Optional)
- **Height:** Entered in three ways:
  - Feet and inches (e.g., 5'10")
  - Centimeters (e.g., 178 cm)
- **Current Weight:** In kilograms
- **Target Weight:** What you want to weigh
- **Ideal Weight:** Recommended weight
- **BMI:** Body Mass Index (automatically calculated)
- **BMI Category:** Underweight, Normal, Overweight, or Obese

### Health Goals (Optional)
- **General Goal:** Main reason for using app:
  - `weight-loss` - Lose weight
  - `weight-gain` - Gain weight
  - `disease-management` - Manage medical condition
  - `muscle-gain` - Build muscle
  - `maintain-weight` - Keep current weight
- **Activity Level:**
  - `sedentary` - Mostly inactive
  - `lightly_active` - Light exercise 1-3 days/week
  - `moderately_active` - Moderate exercise 3-5 days/week
  - `very_active` - Heavy exercise 6-7 days/week
  - `extremely_active` - Very intense training
- **Medical Conditions:** List of any health conditions
- **Allergies:** Food allergies
- **Dietary Restrictions:** Eating restrictions (gluten-free, vegan, etc.)

### Assigned Professionals (Optional)
- **Assigned Dietitian:** Your main dietitian
- **Assigned Dietitians:** Multiple dietitians (if applicable)
- **Assigned Health Counselor:** Your counselor
- **Assigned Counselors:** Multiple counselors (if applicable)

### Health Targets (Optional)
- **Daily Calorie Goal:** Target calories per day (default: 1800)
- **Daily Protein:** Target in grams (default: 120g)
- **Daily Carbs:** Target in grams (default: 200g)
- **Daily Fat:** Target in grams (default: 60g)
- **Daily Water:** Glasses of water (default: 8)
- **Daily Steps:** Step count target (default: 10,000)

### Notification Preferences (Optional)
- **Push Notifications:** On/Off
- **Email Notifications:** On/Off
- **Meal Reminders:** On/Off
- **Appointment Reminders:** On/Off
- **Progress Updates:** On/Off
- **Dark Mode:** On/Off
- **Sound:** On/Off

### For Dietitians & Health Counselors (Optional)
- **Credentials:** Professional certifications (e.g., "B.Sc. Nutrition")
- **Specializations:** Specialty areas (e.g., "Weight Loss", "Diabetes")
- **Years of Experience:** How many years practicing
- **Bio:** Short professional biography
- **Consultation Fee:** How much they charge per session
- **Availability:** When they're available for appointments
- **Timezone:** Their timezone

### Device Information (Optional)
- **FCM Tokens:** Device identifiers for push notifications
  - Device type: Web, Android, or iOS
  - Device info: What device (phone model, etc.)
  - When token was created
  - When token was last used

### Onboarding
- **Onboarding Completed:** Whether user finished app setup (yes/no)
- **Onboarding Step:** Which step of setup they're on

### Automatic Tracking
- **Created Date:** When account was created
- **Updated Date:** When information was last changed

---

## 2. Medical Information

**What it stores:** Your health and medical history

### Conditions & Allergies
- **Medical Conditions:** List of health conditions (e.g., diabetes, hypertension)
- **Allergies:** Medication and environmental allergies
- **Dietary Restrictions:** Foods you can't eat (gluten-free, etc.)
- **Food Allergies:** Specific food allergies (peanuts, shellfish, etc.)

### Medical History (Optional)
- **Medical History:** Your past medical events and treatments
- **Family History:** Health issues that run in your family
- **Current Medications:** Medicines you're taking
- **Blood Group:** Your blood type (A+, B-, O+, AB-, etc.)
- **Gut Issues:** Digestive problems (IBS, bloating, etc.)
- **Additional Notes:** Other health information

### Female Health (Optional)
- **Is Pregnant:** Currently pregnant? (yes/no)
- **Is Lactating:** Currently breastfeeding? (yes/no)
- **Menstrual Cycle:** Regular or irregular
- **Blood Flow:** Light, normal, or heavy

### Disease History (Optional)
Each disease entry includes:
- Disease name
- When it started
- How often it occurs
- How severe it is
- Grading/classification
- Action taken

### Medical Reports (Optional)
Uploaded documents with:
- File name
- Upload date
- File type
- Category: Medical Report, Blood Test, X-Ray, MRI/CT Scan, Prescription, Vaccination, Insurance, Other
- Download link

### Automatic Tracking
- **Created Date:** When record was created
- **Updated Date:** When information was last changed

---

## 3. Lifestyle Details

**What it stores:** Your lifestyle preferences and habits

### Body Measurements
- **Height:** In feet-inches or centimeters
- **Current Weight:** In kilograms
- **Target Weight:** What you want to weigh
- **Ideal Weight:** Recommended weight
- **BMI:** Body Mass Index
- **Food Preference:** Vegetarian, Non-vegetarian, Eggetarian (eggs), or Vegan
- **Preferred Cuisines:** Types of food you like (Indian, Chinese, Italian, etc.)

### Food & Diet (Optional)
- **Food Allergies:** Foods you're allergic to
- **Food Likes:** Foods you enjoy
- **Food Dislikes:** Foods you don't like
- **Fasting Days:** Days you fast (e.g., Monday, Thursday)
- **Non-Vegetarian Exempt Days:** Days you eat non-veg (if vegetarian)
- **Cooking Oils Used:** Types of oil used (olive, coconut, mustard, etc.)
- **Monthly Oil Consumption:** How much oil per month
- **Type of Salt:** What salt you use (rock salt or table salt)

### Eating Habits (Optional)
- **Eat Out Frequency:** How often you eat outside:
  - `daily` - Every day
  - `weekly` - Few times a week
  - `rarely` - Rarely
- **Carbonated Beverages:** How often you drink soda:
  - `never`, `daily`, or `weekly`
- **Cravings:** What you crave most - sweet, salty, or spicy

### Lifestyle Habits (Optional)
- **Smoking:** Never, occasionally, or daily
- **Alcohol:** Never, occasionally, or weekly
- **Activity Rate:** How active you are
- **Activity Level:** Sedentary, lightly active, moderately active, very active, or extremely active

### Automatic Tracking
- **Created Date:** When record was created
- **Updated Date:** When information was last changed

---

## 4. Meal Plans

**What it stores:** Weekly meal plans created by dietitians

### Basic Information (Required)
- **Plan Name:** Name of the meal plan (e.g., "Weight Loss Plan")
- **Description:** What the plan is about
- **Created By:** Which dietitian created it
- **Assigned To:** Which client gets this plan

### Plan Duration (Required)
- **Start Date:** When plan begins
- **End Date:** When plan ends
- **Status:** Active or inactive

### Nutrition Goals (Required)
- **Daily Calorie Target:** Total calories per day (800-5000)
- **Daily Protein Goal:** Grams of protein per day
- **Daily Carbs Goal:** Grams of carbs per day
- **Daily Fat Goal:** Grams of fat per day

### 7-Day Meal Schedule (Required)
For each day (Monday through Sunday):
- **Breakfast:** Recipes/foods for breakfast
- **Lunch:** Recipes/foods for lunch
- **Dinner:** Recipes/foods for dinner
- **Snacks:** Snack options

### Automatic Tracking
- **Created Date:** When plan was created
- **Updated Date:** When plan was last modified

---

## 5. Client's Meal Assignments

**What it stores:** Personalized meal plan tracking for each client

### Assignment Details (Required)
- **Client:** Who this plan is for
- **Dietitian:** Who created/manages it
- **Template:** Which meal plan template
- **Plan Name:** Name of the plan
- **Start Date:** When plan begins
- **End Date:** When plan ends

### Plan Status
- **Status:** `active` (ongoing), `completed` (finished), `paused` (on hold), or `cancelled`
- **Purchase ID:** Link to purchase/payment

### Customizations (Optional)
- **Frozen Days:** Days skipped from the plan
- **Total Freeze Count:** How many days frozen

### Goals (Optional)
- **Weight Goal:** Target weight
- **Body Fat Goal:** Target body fat percentage
- **Target Date:** When to reach goals
- **Primary Goal:** Main goal (weight-loss, weight-gain, maintenance, etc.)
- **Secondary Goals:** Other goals

### Daily Tracking
- **Water Glasses:** Glasses consumed vs. target
- **Steps:** Steps taken vs. target
- **Sleep Hours:** Hours slept vs. target

### Meal Completions (Optional)
Track what you actually ate each day:
- **Date:** When you ate
- **Meal Type:** Breakfast, lunch, dinner, or snacks
- **Completed:** Did you follow the plan? (yes/no)
- **Actual Servings:** How much you actually ate
- **Substitutions:** Any changes made
- **Notes:** Additional comments
- **Rating:** 1-5 star rating

### Progress Tracking
- Monthly progress summaries
- Adherence percentage
- Nutritional analysis

### Reminders (Optional)
- **Meal Reminders:** On/Off
- **Water Reminders:** On/Off

### Automatic Tracking
- **Created Date:** When assignment was created
- **Updated Date:** When information was last changed

---

## 6. Recipes

**What it stores:** Recipe database with nutritional information

### Basic Information (Required)
- **Recipe Name:** Name of the recipe
- **Description:** What the recipe is about
- **Status:** Active or inactive

### Ingredients (Required)
Each ingredient needs:
- **Name:** What ingredient (e.g., "Chicken")
- **Quantity:** Amount (e.g., "500")
- **Unit:** Measurement (grams, ml, cups, tablespoon, etc.)
- **Remarks:** Special notes (optional)

### Cooking Instructions (Required)
- Step-by-step cooking instructions

### Time & Servings (Required)
- **Prep Time:** Minutes to prepare
- **Cook Time:** Minutes to cook
- **Total Servings:** How many people it serves

### Nutrition Information (Required)
Per serving:
- **Calories:** Total calories
- **Protein:** In grams
- **Carbs:** In grams
- **Fat:** In grams

### Dietary Information (Optional)
- **Difficulty Level:** Easy, medium, or hard
- **Tags:** Keywords (vegan, gluten-free, etc.)
- **Dietary Restrictions:** What diets it suits
- **Allergens:** Contains nuts, dairy, eggs, soy, gluten, shellfish, fish, sesame?
- **Medical Warnings:** Not suitable for certain conditions

### Appearance (Optional)
- **Recipe Image:** Photo of the dish

### Automatic Tracking
- **Created Date:** When recipe was added
- **Updated Date:** When recipe was last updated

---

## 7. Tasks

**What it stores:** To-do items assigned by dietitians to clients

### Task Information (Required)
- **Task Title:** Name of the task (e.g., "Update measurements")
- **Task Type:** What kind of task:
  - General Followup
  - Habit Update
  - Session Booking
  - Sign Document
  - Form Allotment
  - Report Upload
  - Diary Update
  - Measurement Update
  - BCA Update
  - Progress Update
- **Assigned To:** Which client
- **Assigned By:** Which professional (dietitian, counselor, admin)

### Task Details (Optional)
- **Description:** Detailed instructions for the task
- **Creator's Role:** Role of who created it

### Timing (Required)
- **Start Date:** When task starts
- **End Date:** When task must be completed
- **Allotted Time:** Specific time (e.g., 2:30 PM)
- **Repeat Frequency:** 
  - `0` = One time only
  - `1` = Every day
  - `7` = Every week

### Status & Notifications
- **Status:** `pending`, `in-progress`, `completed`, or `cancelled`
- **Notify Client:** Should client see it in chat? (yes/no)
- **Notify Dietitian:** Send notification when completed
- **Tags:** Categorize the task

### Calendar Integration (Optional)
- **Google Calendar Event ID:** Linked to Google Calendar

### Automatic Tracking
- **Created Date:** When task was created
- **Updated Date:** When task was last updated

---

## 8. Appointments

**What it stores:** Booking and scheduling of appointments

### People Involved (Required)
- **Dietitian:** Who is providing the appointment
- **Client:** Who is getting the appointment
- **Type:** What kind of appointment:
  - `consultation` - Full consultation
  - `follow_up` - Follow-up meeting
  - `video_call` - Video meeting
  - `in_person` - Face-to-face meeting

### Appointment Schedule (Required)
- **Scheduled Date & Time:** When the appointment is
- **Duration:** How long (minutes) - typically 15 to 180 minutes, default 60
- **Status:** `scheduled`, `completed`, `cancelled`, or `no_show`

### Meeting Details (Optional)
- **Notes:** What to discuss
- **Meeting Link:** URL for video calls
- **Zoom Details:**
  - Meeting ID
  - Password
  - Join URL
  - Start URL (for host)

### Calendar Integration (Optional)
- **Google Calendar:** Linked to Google Calendar for both dietitian and client

### Additional Info
- **Created By:** Who booked the appointment
- **Automatic Tracking:**
  - **Created Date:** When appointment was booked
  - **Updated Date:** When appointment was last changed

---

## 9. Messages & Chat

**What it stores:** All chat messages between users

### Basic Message Info (Required)
- **From:** Who sent the message
- **To:** Who received the message
- **Content:** The message text (up to 2000 characters)
- **Type:** What kind of message:
  - `text` - Regular text
  - `image` - Photo
  - `audio` - Audio file
  - `video` - Video
  - `file` - Document
  - `voice_note` - Voice recording

### Message Status
- **Sent Status:** `sent`, `delivered`, `read`, or `failed`
- **Read Status:** Has recipient seen it? (yes/no)
- **Read Time:** When it was read

### Features (Optional)
- **Reply To:** Replying to a previous message
- **Forward:** Was it forwarded from elsewhere?
- **Edited At:** When message was last edited
- **Deleted At:** When message was deleted
- **Reactions:** Emoji reactions from recipients (😊, ❤️, etc.)

### Attachments (Optional)
Each attachment has:
- **File Name:** Name of the file
- **File Type:** Type of file (PDF, image, etc.)
- **File Size:** Size in bytes
- **Download Link:** Where to get the file
- **Thumbnail:** Preview image (for photos/videos)
- **Duration:** Length in seconds (for audio/video)
- **Dimensions:** Width and height (for images/videos)

### Automatic Tracking
- **Created Date:** When message was sent
- **Updated Date:** When message was last changed

---

## 10. Notifications

**What it stores:** All notifications sent to users

### Notification Content (Required)
- **Title:** Short headline
- **Message:** Full notification text
- **Recipient:** Which user

### Notification Type (Optional)
- `meal` - About meals
- `appointment` - About appointments
- `progress` - About progress
- `message` - New message
- `reminder` - Reminder
- `system` - System notification
- `task` - Task-related
- `payment` - Payment-related
- `custom` - Custom notification

### Status (Optional)
- **Read Status:** Has user seen it? (yes/no)
- **Action URL:** Link to take action on it
- **Additional Data:** Extra information

### Automatic Tracking
- **Created Date:** When notification was sent
- **Updated Date:** When notification was last updated

---

## 11. Payments

**What it stores:** All payment transactions

### Transaction Details (Required)
- **Amount:** How much was paid
- **Currency:** What currency (default: INR - Indian Rupees)
- **Status:** `pending`, `paid`, `failed`, or `refunded`
- **Transaction ID:** Unique ID for the transaction

### Payment Details
- **Payment Method:** Usually Razorpay (payment gateway)
- **Type:** What they paid for:
  - `subscription` - Subscription plan
  - `consultation` - Single consultation
  - `meal_plan` - Meal plan purchase
  - `service_plan` - Service package
- **From:** Client who paid
- **To:** Dietitian (if applicable)

### Plan Information (Optional)
- **Plan Name:** What plan was purchased
- **Plan Category:** Type of plan
- **Duration:** How many days/months the plan is for
- **Duration Label:** (e.g., "3 Months")

### Purpose (Optional)
- **Description:** What the payment is for
- **Payer Email:** Email of person who paid
- **Payer Phone:** Phone of person who paid

### Associated Records (Optional)
- **Payment Link:** Link used to pay
- **Meal Plan Created:** Was a meal plan created? (yes/no)
- **Meal Plan ID:** Which meal plan

### Automatic Tracking
- **Created Date:** When payment was made
- **Updated Date:** When payment was last updated

---

## 12. Subscriptions

**What it stores:** Active client subscriptions to plans

### Subscription Details (Required)
- **Client:** Who has the subscription
- **Dietitian:** Which dietitian's plan
- **Plan:** Which subscription plan
- **Start Date:** When subscription begins
- **End Date:** When subscription ends

### Status (Required)
- **Subscription Status:** `active`, `expired`, `cancelled`, or `pending`
- **Payment Status:** `pending`, `paid`, `failed`, or `refunded`

### Payment Information (Required)
- **Amount:** Subscription cost
- **Currency:** Currency (default: INR)
- **Payment Method:** How paid (razorpay, manual, cash, bank transfer)

### Payment Details (Optional)
- **Razorpay Order ID:** Payment gateway order number
- **Razorpay Payment ID:** Payment gateway payment number
- **Razorpay Signature:** Payment gateway signature
- **Payment Link:** URL of payment link
- **Transaction ID:** Unique transaction number
- **Paid Date:** When payment was received
- **Notes:** Additional notes

### Usage Tracking (Optional)
- **Consultations Used:** How many consultations used so far
- **Follow-ups Used:** How many follow-ups used so far
- **Video Calls Used:** How many video calls used so far

### Automatic Tracking
- **Created Date:** When subscription was created
- **Updated Date:** When subscription was last updated

---

## 13. Subscription Plans

**What it stores:** Plan templates available for purchase

### Plan Information (Required)
- **Plan Name:** Name of the plan
- **Description:** What the plan includes
- **Created By:** Admin who created it

### Pricing & Duration (Required)
- **Price:** Cost of the plan
- **Currency:** Currency (default: INR)
- **Duration:** How long (e.g., 3)
- **Duration Type:** In days, weeks, or months

### Plan Category (Required)
What the plan is for:
- `weight-loss` - Weight loss programs
- `weight-gain` - Weight gain programs
- `muscle-gain` - Muscle building
- `diabetes` - Diabetes management
- `pcos` - PCOS management
- `thyroid` - Thyroid management
- `general-wellness` - General health
- `custom` - Custom plans

### What's Included (Optional)
- **Features:** List of what's in the plan
- **Consultations Included:** How many consultations
- **Diet Plan Included:** Is meal plan included? (yes/no)
- **Follow-ups Included:** How many follow-up sessions
- **Video Calls Included:** How many video calls
- **Chat Support:** Is chat support included? (yes/no)

### Status (Optional)
- **Active Status:** Is this plan available to buy? (yes/no)

### Automatic Tracking
- **Created Date:** When plan was created
- **Updated Date:** When plan was last updated

---

## 14. Daily Tracking

**What it stores:** Daily health metrics - water, steps, and sleep

### Daily Entry (Required)
- **Client:** Whose record this is
- **Date:** Which day's tracking

### Water Intake (Optional)
- **Glasses Consumed:** How many glasses drunk today
- **Target:** Daily water goal (default: 8 glasses)

### Steps (Optional)
- **Steps Taken:** How many steps today
- **Steps Target:** Daily step goal (default: 10,000)

### Sleep (Optional)
- **Hours Slept:** How many hours slept
- **Sleep Target:** Daily sleep goal (default: 8 hours)

### Automatic Tracking
- **Created Date:** When record was created
- **Updated Date:** When record was last updated

---

## 15. Progress Tracking

**What it stores:** Body measurements and progress photos over time

### Measurement Details (Required)
- **User:** Whose measurement this is
- **Type:** What was measured:
  - `weight` - Body weight
  - `body_fat` - Body fat percentage
  - `muscle_mass` - Muscle mass
  - `waist` - Waist circumference
  - `chest` - Chest circumference
  - `hips` - Hip circumference
  - `arms` - Arm circumference
  - `thighs` - Thigh circumference
  - `height` - Height
  - `photo` - Progress photo

### Measurement Value (Required)
- **Value:** The actual measurement (number or photo URL)
- **Unit:** Measurement unit (default: kg for weight)

### Recording (Required)
- **Recording Date:** When this measurement was taken

### Additional Info (Optional)
- **Notes:** Comments about the measurement
- **Extra Data:** Any other information

### Automatic Tracking
- **Created Date:** When record was created
- **Updated Date:** When record was last updated

---

## 16. Food Diary

**What it stores:** What user ate each day (dietary recall)

### Diary Entry (Required)
- **User:** Whose diary this is
- **Date:** Which day's entry

### Meals (Optional)
Each meal entry has:
- **Meal Type:** Early Morning, Breakfast, Lunch, Evening Snack, Dinner, Post Dinner
- **Time:** What time (hour and minute)
- **AM/PM:** Morning or afternoon
- **Food:** What you ate

### Automatic Tracking
- **Created Date:** When entry was created
- **Updated Date:** When entry was last updated

---

## 17. Activity Logs

**What it stores:** Records of everything that happens in the system (for security and auditing)

### Who Did It (Required)
- **User:** Who performed the action
- **User Role:** Their role (admin, dietitian, counselor, client)
- **User Name:** Their full name
- **User Email:** Their email address

### What Was Done (Required)
- **Action:** Description of what happened
- **Action Type:** Category of action:
  - `create` - Created something new
  - `update` - Modified something
  - `delete` - Deleted something
  - `view` - Viewed something
  - `assign` - Assigned to someone
  - `complete` - Completed a task
  - `cancel` - Cancelled something
  - `payment` - Made a payment
  - `login` - Logged in
  - `logout` - Logged out
  - `other` - Other action

- **Category:** What area (meal plan, appointment, payment, profile, etc.)
- **Detailed Description:** Full description of what happened

### What Changed (Optional)
- **Target:** Which person/thing was affected
- **Resource:** What item (recipe, plan, task, etc.)
- **Resource Name:** Friendly name of resource
- **Field Changes:** Specific fields that changed:
  - Field name
  - Old value
  - New value

### Technical Details (Optional)
- **IP Address:** Where action came from
- **User Agent:** What device/browser was used
- **Read Status:** Has admin reviewed it?

### Automatic Tracking
- **Created Date:** When action occurred
- **Updated Date:** When record was last updated

---

## 📊 How Data Types Work

| Type | What It Means | Example |
|------|---------------|---------|
| **Text (String)** | Words and letters | "John Doe" |
| **Number** | Whole or decimal numbers | 75.5, 10, -3 |
| **True/False (Boolean)** | Yes or No | true, false |
| **Date/Time (Date)** | Calendar dates and times | "January 19, 2025, 10:30 AM" |
| **ID (ObjectId)** | Unique identifier linking records | Used to connect related information |
| **List/Array** | Multiple items of same type | ["apple", "banana", "orange"] |
| **Object** | Group of related information | All fields together |
| **Mixed** | Can be any type | Flexible storage |

---

## 🔗 Connections Between Records

The database connects related information:

- **User connects to:** Their medical info, lifestyle details, meal plans, messages, payments, subscriptions, tasks, appointments
- **Meal Plan connects to:** Client receiving it, dietitian who created it, recipes used, payments made
- **Subscription connects to:** Client, plan purchased, payment made
- **Appointment connects to:** Dietitian and client involved, Zoom/calendar details
- **Message connects to:** Sender and receiver

---

## ✅ Required vs Optional

- **Required fields:** Must have this information (marked with ✅)
- **Optional fields:** Nice to have, but not required

---

## 🕐 Automatic Fields

Every record automatically stores:
- **Created Date:** When it was created
- **Updated Date:** When it was last changed

---

**Version:** 2.0 (Non-Technical Format)  
**Last Updated:** January 19, 2026  
**Total Records Tracked:** 17 different types  
**Purpose:** Data importing and system understanding

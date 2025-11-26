# Schema Reference

## Overview
Primary entities involved in meal plan templates and diet UI:
- MealPlanTemplate: Template definitions (plan or diet) with meals per day.
- User: Creators (dietitians/admin) and clients.
- Recipe: Referenced in meal items.

## MealPlanTemplate
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| templateType | String (enum: plan,diet) | No | plan | Distinguishes template category |
| name | String | Yes | - | Template name |
| description | String | No | - | Detailed description |
| category | String (enum) | Yes | - | Goal/category (weight-loss, keto, etc.) |
| difficulty | String (enum: beginner, intermediate, advanced) | No | intermediate | Complexity level |
| duration | Number | Yes | - | Number of days (1-365) |
| targetCalories.min | Number | Yes | 800 min | Minimum target daily calories |
| targetCalories.max | Number | Yes | - | Maximum target daily calories |
| targetMacros.protein.min | Number | Yes | 0 | Protein lower bound (g) |
| targetMacros.protein.max | Number | Yes | 0 | Protein upper bound (g) |
| targetMacros.carbs.min | Number | Yes | 0 | Carbs lower bound (g) |
| targetMacros.carbs.max | Number | Yes | 0 | Carbs upper bound (g) |
| targetMacros.fat.min | Number | Yes | 0 | Fat lower bound (g) |
| targetMacros.fat.max | Number | Yes | 0 | Fat upper bound (g) |
| dietaryRestrictions | [String] | No | [] | Applied restrictions filters |
| tags | [String] | No | [] | Search tags |
| meals | [DailyMeal] | No | [] | Array per day (length should match duration) |
| isPublic | Boolean | No | false | Visibility to all users |
| isPremium | Boolean | No | false | Premium access required |
| isActive | Boolean | No | true | Active state flag |
| prepTime.daily | Number | No | 0 | Daily prep time minutes |
| prepTime.weekly | Number | No | 0 | Weekly prep time aggregate |
| targetAudience.ageGroup | [String] | No | [] | Age segments targeted |
| targetAudience.activityLevel | [String] | No | [] | Activity levels |
| targetAudience.healthConditions | [String] | No | [] | Health conditions relevant |
| targetAudience.goals | [String] | No | [] | Specific goals |
| createdBy | ObjectId(User) | Yes | - | Creator reference |
| usageCount | Number | No | 0 | Times used/assigned |
| averageRating | Number | No | - | Aggregate rating |
| reviews | [Review] | No | [] | User reviews |
| createdAt | Date | Auto | - | Timestamp |
| updatedAt | Date | Auto | - | Timestamp |

### DailyMeal (embedded)
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| day | Number | Yes | - | Day number (1..duration) |
| breakfast | [MealItem] | No | [] | Breakfast items |
| morningSnack | [MealItem] | No | [] | Morning snack items |
| lunch | [MealItem] | No | [] | Lunch items |
| afternoonSnack | [MealItem] | No | [] | Afternoon snack items |
| dinner | [MealItem] | No | [] | Dinner items |
| eveningSnack | [MealItem] | No | [] | Evening snack items |
| totalNutrition.calories | Number | Yes | 0 | Calculated daily calories |
| totalNutrition.protein | Number | Yes | 0 | Calculated daily protein |
| totalNutrition.carbs | Number | Yes | 0 | Calculated daily carbs |
| totalNutrition.fat | Number | Yes | 0 | Calculated daily fat |
| totalNutrition.fiber | Number | Yes | 0 | Calculated daily fiber |
| totalNutrition.sugar | Number | Yes | 0 | Calculated daily sugar |
| totalNutrition.sodium | Number | Yes | 0 | Calculated daily sodium |
| notes | String | No | - | Day notes |

### MealItem (embedded)
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| type | String (recipe/custom) | No | recipe | Item origin type |
| recipeId | ObjectId(Recipe) | Conditional | - | Linked recipe id (if recipe type) |
| recipe | Mixed | No | - | Snapshot of recipe object |
| customMeal.name | String | Conditional | - | Custom meal name |
| customMeal.description | String | No | - | Custom meal description |
| customMeal.ingredients | [String] | No | [] | Ingredients list |
| customMeal.instructions | [String] | No | [] | Instructions list |
| customMeal.calories | Number | No | 0 | Flat calories |
| customMeal.protein | Number | No | 0 | Flat protein |
| customMeal.carbs | Number | No | 0 | Flat carbs |
| customMeal.fat | Number | No | 0 | Flat fat |
| customMeal.fiber | Number | No | 0 | Flat fiber |
| customMeal.sugar | Number | No | 0 | Flat sugar |
| customMeal.sodium | Number | No | 0 | Flat sodium |
| customMeal.servings | Number | No | - | Serving count |
| customMeal.prepTime | Number | No | - | Minutes prep |
| customMeal.cookTime | Number | No | - | Minutes cook |
| customMeal.nutrition | Object | No | - | Legacy nested nutrition object |
| servings | Number | Yes | 1 | Item servings multiplier |
| alternatives | [MealItem] | No | [] | Alternative substitutions |
| notes | String | No | - | Item notes |

### Review (embedded in MealPlanTemplate)
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| userId | ObjectId(User) | Yes | - | Reviewer user |
| rating | Number (1-5) | Yes | - | Rating value |
| comment | String | No | - | Review text |
| createdAt | Date | Auto | - | Timestamp |

## User
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| email | String | Yes | - | Unique email |
| password | String | Yes | - | Hashed password |
| firstName | String | Yes | - | First name |
| lastName | String | Yes | - | Last name |
| role | String (enum UserRole) | Yes | client | User role (dietitian/admin/client) |
| status | String (enum UserStatus) | Yes | active | Account status |
| phone | String | No | - | Phone number |
| avatar | String | No | - | Avatar URL |
| emailVerified | Boolean | No | false | Email verified flag |
| credentials | [String] | No | [] | Dietitian certificates |
| specializations | [String] | No | [] | Expertise areas |
| experience | Number | No | - | Years experience |
| bio | String | No | - | Profile bio |
| consultationFee | Number | No | - | Fee amount |
| availability | [Availability] | No | [] | Working time slots |
| timezone | String | No | UTC | Timezone |
| dateOfBirth | Date | No | - | Birth date |
| gender | String | No | - | Gender |
| height | Number | No | - | Height |
| weight | Number | No | - | Weight |
| activityLevel | String | No | - | Activity level |
| healthGoals | [String] | No | [] | Stated health goals |
| goals.calories | Number | No | 1800 | Calorie target |
| goals.protein | Number | No | 120 | Protein target |
| goals.carbs | Number | No | 200 | Carb target |
| goals.fat | Number | No | 60 | Fat target |
| goals.water | Number | No | 8 | Water (glasses) |
| goals.steps | Number | No | 10000 | Steps target |
| goals.targetWeight | Number | No | - | Target weight |
| goals.currentWeight | Number | No | - | Current weight |
| medicalConditions | [String] | No | [] | Medical conditions |
| allergies | [String] | No | [] | Allergies |
| dietaryRestrictions | [String] | No | [] | Restrictions |
| assignedDietitian | ObjectId(User) | No | - | Linked dietitian |
| fitnessData.dailyRecords | [DailyRecord] | No | [] | Per-day fitness metrics |
| fitnessData.goals.dailySteps | Number | No | 10000 | Steps goal |
| fitnessData.goals.dailyCalories | Number | No | 500 | Calories goal |
| fitnessData.goals.dailyDistance | Number | No | 5000 | Distance goal (m) |
| fitnessData.goals.dailyActiveMinutes | Number | No | 60 | Active minutes goal |
| fitnessData.preferences.units | String | No | metric | Units selection |
| fitnessData.preferences.notifications | Boolean | No | true | Notify flag |
| fitnessData.preferences.autoSync | Boolean | No | true | Auto sync flag |
| wooCommerceData.customerId | Number | No | - | External customer id |
| wooCommerceData.totalOrders | Number | No | 0 | Total orders |
| wooCommerceData.totalSpent | Number | No | 0 | Total spent |
| wooCommerceData.processingOrders | Number | No | 0 | Orders processing |
| wooCommerceData.completedOrders | Number | No | 0 | Orders completed |
| wooCommerceData.processingAmount | Number | No | 0 | Amount in processing |
| wooCommerceData.completedAmount | Number | No | 0 | Amount completed |
| wooCommerceData.firstOrderDate | Date | No | - | First order date |
| wooCommerceData.lastOrderDate | Date | No | - | Last order date |
| wooCommerceData.lastSyncDate | Date | No | - | Last sync |
| wooCommerceData.orders | [Order] | No | [] | Order history |
| createdAt | Date | Auto | - | Timestamp |
| updatedAt | Date | Auto | - | Timestamp |

### Availability (embedded)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| day | String (enum weekday) | Yes | Day of week |
| startTime | String | Yes | Start time (HH:mm) |
| endTime | String | Yes | End time (HH:mm) |

### DailyRecord (embedded in fitnessData)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | String | Yes | YYYY-MM-DD |
| steps | Number | No | Step count |
| calories | Number | No | Burned calories |
| distance | Number | No | Distance meters |
| heartRate | Number | No | Avg heart rate |
| activeMinutes | Number | No | Active minutes |
| deviceType | String | No | Source device |
| lastSync | Date | No | Last sync timestamp |

## Recipe
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | String | Yes | - | Recipe name |
| description | String | No | - | Description |
| ingredients | [Ingredient] | Yes | - | Ingredient items |
| instructions | [String] | Yes | - | Steps list |
| prepTime | Number | Yes | - | Prep time minutes |
| cookTime | Number | Yes | - | Cook time minutes |
| servings | Mixed (number/string) | Yes | - | Serving count or descriptor |
| nutrition.calories | Number | Yes | 0 | Total calories |
| nutrition.protein | Number | Yes | 0 | Total protein |
| nutrition.carbs | Number | Yes | 0 | Total carbs |
| nutrition.fat | Number | Yes | 0 | Total fat |
| nutrition.fiber | Number | No | 0 | Total fiber |
| nutrition.sugar | Number | No | 0 | Total sugar |
| nutrition.sodium | Number | No | 0 | Total sodium |
| tags | [String] | No | [] | Search tags |
| category | String (enum) | Yes | - | Meal category |
| cuisine | String (enum) | No | - | Cuisine type |
| dietaryRestrictions | [String] | No | [] | Restrictions applied |
| allergens | [String] | No | [] | Allergens |
| medicalContraindications | [String] | No | [] | Contraindications |
| difficulty | String (enum) | No | medium | Difficulty level |
| image | String | No | - | Primary image |
| images | [Image] | No | [] | Additional images |
| video | Video | No | - | Video details |
| isPublic | Boolean | No | false | Public availability |
| isPremium | Boolean | No | false | Premium only |
| rating.average | Number | No | 0 | Average rating |
| rating.count | Number | No | 0 | Rating count |
| reviews | [Review] | No | [] | User reviews |
| nutritionNotes | String | No | - | Nutrition notes |
| tips | [String] | No | [] | Tips |
| variations | [Variation] | No | [] | Alternative versions |
| equipment | [String] | No | [] | Equipment list |
| storage.refrigerator | String | No | - | Fridge storage |
| storage.freezer | String | No | - | Freezer storage |
| storage.instructions | String | No | - | Storage instructions |
| source.url | String | No | - | External link |
| source.author | String | No | - | Source author |
| usageCount | Number | No | 0 | Times used |
| favorites | [ObjectId(User)] | No | [] | Users who favorited |
| createdBy | ObjectId(User) | Yes | - | Recipe author |
| createdAt | Date | Auto | - | Timestamp |
| updatedAt | Date | Auto | - | Timestamp |

### Ingredient
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Ingredient name |
| quantity | Number | Yes | Quantity value |
| unit | String | Yes | Unit (g, ml, etc.) |
| remarks | String | No | Notes |

## Relationships
| Source | Field | Target | Cardinality | Notes |
|--------|-------|--------|-------------|-------|
| MealPlanTemplate | createdBy | User | Many -> One | Template creator |
| MealPlanTemplate.meals.breakfast etc. | recipeId | Recipe | Many -> One | Embedded meal items referencing recipes |
| Recipe | createdBy | User | Many -> One | Recipe author |
| Recipe.reviews | userId | User | Many -> One | Reviewer reference |
| MealPlanTemplate.reviews | userId | User | Many -> One | Template review author |
| User | assignedDietitian | User | Many -> One | Client assigned to dietitian |
| Recipe | favorites | User | Many -> Many | Users favoriting recipe |


## Indexes (Key)
MealPlanTemplate:
- text: name, description, tags
- category + isPublic + isActive
- createdBy + isActive
- targetCalories.min, targetCalories.max

User:
- role
- assignedDietitian
- email (unique)

Recipe:
- text: name, description, tags, ingredients.name
- tags, category+isPublic, cuisine+isPublic
- dietaryRestrictions, difficulty, createdBy
- nutrition.calories, rating.average (desc), usageCount (desc), createdAt (desc), isPublic+isPremium

## Notes
- Meals array length should equal duration.
- Nutrition totals auto-calculated pre-save in MealPlanTemplate.
- Legacy documents may lack templateType; treat as 'plan'.
- Custom meal items support both flat and nested nutrition data.


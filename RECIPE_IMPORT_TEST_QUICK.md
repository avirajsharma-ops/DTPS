# Quick Test: Recipe File Detection Fix

## Test in 2 Minutes

### Step 1: Build
```bash
npm run build
```
✅ Should complete with no errors

### Step 2: Create Test Recipe File

Save as `test-recipe.csv`:
```csv
name,prepTime,cookTime,ingredients,instructions
Pasta Carbonara,10 mins,15 minutes,"[{""name"":""pasta"",""quantity"":""1"",""unit"":""lb""},{""name"":""eggs"",""quantity"":""3""}]","[""Cook pasta"",""Mix sauce"",""Combine""]"
Tomato Salad,5 mins,0,"[{""name"":""tomatoes"",""quantity"":""3""},{""name"":""olive oil"",""quantity"":""2"",""unit"":""tbsp""}]","[""Slice tomatoes"",""Mix with oil""]"
```

### Step 3: Upload to /admin/import

1. Navigate to `http://localhost:3000/admin/import`
2. Click or drag `test-recipe.csv` to upload
3. **Expected Results:**
   - ✅ File processes (not stuck in "wait")
   - ✅ Shows "Recipe" model tab
   - ✅ Shows 2 valid rows under Recipe tab
   - ✅ Status shows "validated"

### Step 4: Check Logs

Open browser DevTools (F12) and look for:
```
[ModelDetection-Recipe] conf=65.3 (allReq=0+match=14.3+bonus=24-missing=10-extra=0)
[Recipe-Keywords] Matched strong indicators: preptime, cooktime, ingredients, instructions (bonus: 24pts)
```

---

## Expected Behavior

| Before Fix | After Fix |
|-----------|-----------|
| ❌ File stuck in pending | ✅ Immediately processes |
| ❌ Shows as "unmatched" | ✅ Shows as "Recipe" |
| ❌ Can't proceed | ✅ Shows validation results |

---

## Test Cases

### ✅ Test 1: Minimal Valid Recipe
```csv
prepTime,cookTime,ingredients,instructions
15,20,"[]","[]"
```
**Expected:** Detected as Recipe (has Recipe keywords)

### ✅ Test 2: Field Name Variations
```csv
prep_time,cook_time,ingredient_list,recipe_steps
10,20,"[]","[]"
```
**Expected:** Detected as Recipe (aliases recognized)

### ✅ Test 3: Missing Optional Fields
```csv
name,prepTime,cookTime,ingredients
Pasta,10,15,"[]"
```
**Expected:** Detected as Recipe (missing instructions but has strong keywords)

### ❌ Test 4: Wrong Type of Data
```csv
firstName,lastName,email
John,Doe,john@example.com
```
**Expected:** NOT detected as Recipe (no Recipe keywords)

---

## Verify the Fix Worked

✅ Check 1: No TypeScript errors
```bash
npm run build
# Should complete successfully
```

✅ Check 2: Recipe is registered
```
Check browser console for:
[ModelRegistry] Registered Recipe model with X total fields
[ModelRegistry] Recipe required fields: name, ingredients, ...
```

✅ Check 3: Detection works
```
Upload test-recipe.csv
Check for:
[ModelDetection] TOP RESULT: Recipe(65.3)
```

✅ Check 4: File no longer stuck
```
File immediately shows "Recipe" tab
Not stuck in "wait" or "pending" state
```

---

## Troubleshooting

### Issue: File still stuck in "wait"
- Clear browser cache (Ctrl+Shift+Del)
- Rebuild: `npm run build`
- Restart dev server
- Check browser console for errors

### Issue: File shows as "unmatched"
- Ensure file has Recipe keywords: `prepTime`, `cookTime`, `ingredients`, or `instructions`
- Check field names - must match aliases
- Verify file format (CSV should have headers)

### Issue: Specific row not detected
- Look for red error messages in validation
- Check debug logs (F12 console)
- Verify all required fields are present or populated with sample data

---

## Debug Logs to Check

Open browser DevTools (F12 → Console) and upload file. Look for:

```
[ModelRegistry] Registered Recipe model...     ← Recipe is registered
[ModelDetection] ===== NEW ROW DETECTION =====  ← Starting detection
[ModelDetection-Recipe] conf=XX.X              ← Recipe confidence score
[Recipe-Keywords] Matched strong indicators:   ← Keywords found
[ModelDetection] TOP RESULT: Recipe(XX.X)      ← Detection result
[ModelDetection] ===== END ROW DETECTION =====  ← Detection complete
```

If Recipe doesn't show up, check:
- Are other models showing higher confidence?
- Are Recipe keywords present in file?
- Check "extra" fields - too many unknown columns reduce score

---

## Success Criteria

✅ File uploads without getting stuck
✅ File detected as "Recipe" model  
✅ All rows show as valid (green checkmarks)
✅ Status shows "Validated successfully!"
✅ Can click Save button
✅ Browser logs show Recipe detection info

**If all above checked → Fix is working!** 🎉

---

## Rollback (if needed)

If there's an issue, the file that changed is:
- `/src/lib/import/modelRegistry.ts` (lines 704-800)

Changes were:
1. Added keyword detection for Recipe
2. Added debug logging for Recipe
3. Adjusted confidence calculation formula

All changes are additive - no existing code was removed, just enhanced.

---

Quick test commands:
```bash
# Build and test
npm run build && npm run dev

# Navigate to
http://localhost:3000/admin/import

# Upload test file and check results
```

Let me know the results! 🚀

# Performance Optimization - Remaining Issues

## 🔴 Critical Slow APIs Still Pending

### 1. Dashboard Stats Endpoints
**File:** `/src/app/api/dashboard/dietitian-stats/route.ts`
**Issue:** Makes 6+ parallel DB calls + aggregations
```
- User.find() - All clients
- Appointment.aggregate() - Statistics
- ClientMealPlan.find() - Plans
- Payment.find() - Revenue
- Plus more queries...
```
**Recommendation:** Consolidate into single aggregation pipeline

---

### 2. Admin Payment Summary
**File:** `/src/app/api/admin/payments/route.ts`
**Issue:** Already has pagination (✅) but populates on all records
```typescript
// Current
UnifiedPayment.find(query)
  .populate('client', 'firstName lastName email phone')  // Every record
  .populate('dietitian', 'firstName lastName')           // Every record
  .limit(limit)
  .skip(skip)
```
**Recommendation:** 
- Use `.select()` to limit fields
- Use `.lean()` for read-only data
- Consider lazy-loading details on-demand

---

### 3. Heavy Admin Clients Query
**File:** `/src/app/api/admin/clients/route.ts` (if it exists)
**Issue:** 4+ populate stages for all records
**Recommendation:** Paginate and use `.lean()`

---

## 🟡 Potential Issues to Investigate

### 1. Progress Tracking API
**File:** `/src/app/api/client/progress/route.ts`
**Issue:** Sequential queries in loops
```typescript
for (const foodLog of foodLogs) {
  const mealPlan = await ClientMealPlan.findById(foodLog.mealPlan);
  // N+1 problem
}
```
**Fix:** Use `.populate()` instead of loop queries

---

### 2. Message Queries
**Pattern:** Multiple sequential message fetches
**Issue:** No pagination, fetches all messages
**Files to check:**
- `/src/app/api/messages/` - Likely no pagination
- `/src/app/api/realtime/messages/` - Real-time might fetch all

---

### 3. Report Generation APIs
**File:** `/src/app/api/reports/` (if it exists)
**Issue:** Reports typically aggregate large datasets
**Recommendation:** 
- Add progress tracking
- Paginate results
- Cache report results

---

## 📋 Quick Priority List

### Phase 1: High Impact (Do First)
- [ ] Dashboard stats - consolidate to 1 query
- [ ] Admin payments - add `.lean()` and `.select()`
- [ ] Message queries - add pagination

### Phase 2: Medium Impact
- [ ] Progress tracking - fix N+1 queries
- [ ] Client list - paginate and lean
- [ ] Food log queries - batch populate

### Phase 3: Nice to Have
- [ ] Add database indexes for frequently searched fields
- [ ] Implement query result caching
- [ ] Add request timeout for heavy endpoints

---

## 🔧 Code Templates to Use

### Template 1: Pagination + Lean
```typescript
const limit = Math.max(parseInt(searchParams.get('limit') || '20', 10), 1);
const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  Model.find(query)
    .select('field1 field2 field3')  // Only needed fields
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(),  // <-- THIS IS KEY for performance
  Model.countDocuments(query)
]);

return NextResponse.json({
  items,
  pagination: { total, page, limit, pages: Math.ceil(total / limit) }
});
```

### Template 2: Fix N+1 Queries
```typescript
// ❌ Bad - N+1 queries
for (const item of items) {
  item.details = await Details.findById(item.detailId);
}

// ✅ Good - Batch query
const details = await Details.find({ 
  _id: { $in: items.map(i => i.detailId) }
});
const detailMap = new Map(details.map(d => [d._id, d]));
items.forEach(i => i.details = detailMap.get(i.detailId));
```

### Template 3: Consolidate Multiple Queries
```typescript
// ❌ Bad - Sequential queries
const users = await User.find(query);
const stats = await Appointment.aggregate([...]);
const revenue = await Payment.aggregate([...]);

// ✅ Good - Parallel queries
const [users, stats, revenue] = await Promise.all([
  User.find(query),
  Appointment.aggregate([...]),
  Payment.aggregate([...])
]);
```

---

## 📊 Performance Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| API response time | < 200ms | For paginated queries |
| Memory per request | < 50MB | Use `.lean()` to achieve |
| Database query time | < 100ms | Index frequently filtered fields |
| Document limit | 20-50 | Default pagination size |

---

## 🛠️ Tools for Investigation

```bash
# Check for slow queries in MongoDB
db.system.profile.find({ millis: { $gt: 100 } }).pretty()

# Check indexes
db.collection.getIndexes()

# Add index if missing
db.collection.createIndex({ status: 1, createdAt: -1 })

# Profile a specific query
db.collection.find({...}).explain('executionStats')
```

---

## 📝 Checklist for Optimization

When optimizing each API:
- [ ] Add pagination (limit + page)
- [ ] Use `.lean()` for read-only queries
- [ ] Use `.select()` to limit fields
- [ ] Replace loops with batch queries
- [ ] Consolidate multiple queries to parallel
- [ ] Add database indexes for search fields
- [ ] Cache results if data changes infrequently
- [ ] Add `?limit=` parameter validation
- [ ] Document pagination response format
- [ ] Test with large datasets (1M+ records)


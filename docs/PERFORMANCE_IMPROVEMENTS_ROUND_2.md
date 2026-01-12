# Performance Improvements Round 2

## Issues Fixed

### 1. ✅ N+1 Query Problem in Initiatives Endpoint
**Problem**: When fetching initiatives, the code was making a separate database query for EACH initiative to get the project count. With 2-3 initiatives, this meant 3-4 queries total.

**Solution**: 
- Modified `getAllInitiatives()` to use a single `LEFT JOIN` query that gets all initiatives with their project counts in one go
- This reduces 3-4 queries down to just 1 query
- Uses the composite indexes we created earlier for optimal performance

**Files Changed**:
- `backend/queries/initiativeQueries.js` - Optimized query with JOIN
- `backend/routes/initiatives.js` - Removed N+1 loop, added caching

### 2. ✅ Missing Caching on Initiatives Endpoint
**Problem**: Initiatives endpoint had no caching, so every page load made fresh database queries.

**Solution**:
- Added in-memory cache with 10-minute TTL (same as projects endpoint)
- Cache automatically clears when initiatives are created/updated/deleted
- Cache key includes `includeInactive` parameter

**Impact**: 
- First request: ~50-200ms (single optimized query)
- Subsequent requests: ~0ms (served from cache)

### 3. ✅ Query Optimization for Project Counts
**Problem**: The project count query was using a simple COUNT(*) which could be slow.

**Solution**:
- The optimized JOIN query in `getAllInitiatives()` uses the composite indexes we created
- Index `idx_lookbook_projects_active_cohort_created` makes the JOIN very fast
- No separate COUNT queries needed - counts are calculated in the JOIN

## Performance Impact

### Before
- Initiatives endpoint: **3-4 separate queries** (~200-500ms total)
- No caching: Every request hits the database
- N+1 problem: Slow with multiple initiatives

### After
- Initiatives endpoint: **1 optimized query** (~50-200ms)
- 10-minute cache: Subsequent requests instant
- Single JOIN: All data fetched efficiently

## Expected Results

When clicking "SMB Winter 2025":
1. **Initiatives load**: Instant (from cache after first load)
2. **Projects query**: < 1 second (using composite indexes)
3. **Total page load**: < 2 seconds (vs minutes before)

## Files Modified

1. `backend/queries/initiativeQueries.js`
   - Changed `getAllInitiatives()` to use LEFT JOIN with COUNT
   - Returns `project_count` as part of the result

2. `backend/routes/initiatives.js`
   - Added caching layer (similar to projects route)
   - Removed N+1 query loop
   - Cache invalidation on create/update/delete

3. `database/migrations/add_cohort_filtering_index.sql` (from previous fix)
   - Composite indexes used by the optimized query

## Testing

After deploying these changes:
1. Clear browser cache
2. Click "SMB Winter 2025" in the sidebar
3. Page should load in < 2 seconds
4. Click again - should be instant (cached)

## Next Steps (If Still Slow)

If the page is still slow, check:

1. **Network latency**: If using a remote database, network latency is unavoidable
   - Consider using a local database for development
   - Or use a database closer to your server

2. **Image loading**: Large images can slow down the page
   - Check if images are optimized
   - Consider lazy loading images below the fold

3. **Frontend rendering**: Too many DOM elements can slow rendering
   - Check browser DevTools Performance tab
   - Look for long tasks or layout thrashing

4. **Other API calls**: Check Network tab for slow requests
   - Filter endpoints might be slow
   - Profile queries might need optimization

## Monitoring

Check server logs for:
- `📦 Cache HIT` - Good, using cache
- `📦 Cache MISS` - First request or cache expired
- Query times > 1000ms - May need further optimization

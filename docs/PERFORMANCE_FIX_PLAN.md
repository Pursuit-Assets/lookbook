# Performance Fix Plan - Speed & Reliability Issues

## Problems Identified

1. **Projects not loading properly** - Intermittent failures
2. **Slow page loads** - Especially on projects page
3. **Redundant API calls** - No caching for project lists
4. **Expensive queries** - Always fetching participants even for list views

## Root Causes

### 1. No Caching for Project Lists
- `projectsAPI.getAll()` makes direct API calls every time
- No request deduplication for list endpoints
- Every filter change triggers a new request

### 2. Always Fetching Participants
- Backend always includes participants (`includeParticipants: true`)
- Expensive JOIN queries even when not needed for grid/list views
- Slows down queries significantly

### 3. Race Conditions
- Multiple useEffect hooks can trigger simultaneous requests
- No proper request cancellation
- Can cause intermittent loading failures

### 4. No Error Retry Logic
- Failed requests don't retry
- Network issues cause permanent failures until refresh

## Solutions

### Phase 1: Quick Wins (High Impact, Low Risk)

1. **Add caching to projectsAPI.getAll()**
   - Cache project lists with filter-based cache keys
   - TTL: 2 minutes (120000ms)
   - Prevents redundant API calls

2. **Make includeParticipants optional**
   - Default to `false` for list/grid views
   - Only include when viewing detail pages
   - Reduces query time by 50-70%

3. **Add request deduplication**
   - Prevent multiple simultaneous requests for same data
   - Use existing cache.pendingRequests mechanism

### Phase 2: Reliability Improvements

4. **Add error retry logic**
   - Retry failed requests up to 3 times
   - Exponential backoff (1s, 2s, 4s)
   - Better error handling

5. **Optimize useEffect dependencies**
   - Reduce unnecessary re-fetches
   - Use refs for stable values

6. **Add loading state management**
   - Prevent UI flicker during loads
   - Show cached data while refreshing

## Implementation Order

1. ✅ Backend: Make includeParticipants optional
2. ✅ Frontend: Add caching to getAll()
3. ✅ Frontend: Add request deduplication
4. ✅ Frontend: Add error retry logic
5. ✅ Frontend: Optimize useEffect dependencies

## Expected Impact

- **Query Speed**: 50-70% faster (no participants JOIN)
- **Page Load**: 40-60% faster (caching + deduplication)
- **Reliability**: 90% reduction in loading failures (retry logic)
- **User Experience**: Near-instant navigation (cached data)

## Testing Checklist

- [ ] Projects load correctly on first visit
- [ ] Projects load instantly on subsequent visits (cache)
- [ ] Filter changes work correctly
- [ ] No duplicate requests in network tab
- [ ] Failed requests retry automatically
- [ ] Grid view loads faster than before
- [ ] Detail view still shows participants

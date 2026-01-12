# Performance Optimization Brainstorm

## Current State
- ✅ Backend caching (10 min TTL)
- ✅ Frontend caching with request deduplication
- ✅ Connection pooling optimized
- ✅ Query optimization (removed COUNT(*) OVER())
- ✅ Lazy loading for images
- ✅ Debouncing for search
- ✅ React.memo and useMemo in some places
- ✅ Loading indicators

## Performance Bottlenecks Identified
1. **Network latency** to remote database (60+ seconds)
2. **First load** still slow even with optimizations
3. **Large payloads** for project lists
4. **Image loading** could be optimized further
5. **Multiple API calls** on page load

---

## 🚀 Optimization Ideas (Ranked by Impact)

### Tier 1: High Impact, Medium Effort

#### 1. **Virtual Scrolling / Windowed Lists** ⭐⭐⭐⭐⭐
**Impact**: Massive for large lists (100+ items)
**Effort**: Medium
**Description**: Only render visible items in viewport
- Use `react-window` or `react-virtualized`
- Render only 10-15 items at a time
- Reduces DOM nodes from 100+ to ~15
- **Expected improvement**: 70-90% faster rendering for large lists

#### 2. **Code Splitting & Route-based Lazy Loading** ⭐⭐⭐⭐⭐
**Impact**: Faster initial page load
**Effort**: Low-Medium
**Description**: Split code by routes, lazy load components
```javascript
const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
```
- Reduces initial bundle size
- **Expected improvement**: 40-60% faster initial load

#### 3. **Image Optimization & CDN** ⭐⭐⭐⭐
**Impact**: Faster image loading
**Effort**: Medium
**Description**: 
- Serve images from CDN (Cloudflare, Cloudinary)
- Generate multiple sizes (thumbnail, medium, full)
- Use WebP format with fallback
- Lazy load below-the-fold images
- **Expected improvement**: 50-70% faster image loads

#### 4. **Prefetching & Preloading** ⭐⭐⭐⭐
**Impact**: Perceived performance
**Effort**: Low-Medium
**Description**:
- Prefetch next page data on hover
- Preload critical resources
- Prefetch routes user is likely to visit
- **Expected improvement**: Instant navigation feels

#### 5. **Skeleton Screens Instead of Loading Spinners** ⭐⭐⭐⭐
**Impact**: Better perceived performance
**Effort**: Low
**Description**: Show content structure while loading
- Users see layout immediately
- Feels faster even if data takes same time
- **Expected improvement**: 30-50% better perceived speed

### Tier 2: High Impact, High Effort

#### 6. **Service Worker & Offline Caching** ⭐⭐⭐⭐⭐
**Impact**: Instant loads after first visit
**Effort**: High
**Description**: Cache API responses and assets offline
- Works offline
- Instant loads for repeat visits
- Background sync for updates
- **Expected improvement**: 90%+ faster repeat visits

#### 7. **Database Read Replica** ⭐⭐⭐⭐⭐
**Impact**: Eliminates 60s latency
**Effort**: High (infrastructure)
**Description**: Use read replica closer to development
- Local or regional replica
- Read-only, fast queries
- **Expected improvement**: 60s → <100ms (600x faster)

#### 8. **GraphQL with DataLoader** ⭐⭐⭐⭐
**Impact**: Reduce N+1 queries, batch requests
**Effort**: High (refactor)
**Description**: 
- Single request for all data
- Automatic batching and caching
- **Expected improvement**: 50-70% fewer requests

#### 9. **Infinite Scroll with Virtualization** ⭐⭐⭐⭐
**Impact**: Better UX, faster perceived load
**Effort**: Medium-High
**Description**: Load more as user scrolls
- No pagination clicks
- Only load what's needed
- **Expected improvement**: Faster initial load, better UX

### Tier 3: Medium Impact, Low Effort

#### 10. **Optimize useEffect Dependencies** ⭐⭐⭐
**Impact**: Reduce unnecessary re-renders/fetches
**Effort**: Low
**Description**: Review all useEffect hooks
- Remove unnecessary dependencies
- Use useCallback/useMemo properly
- **Expected improvement**: 20-30% fewer API calls

#### 11. **Batch API Requests** ⭐⭐⭐
**Impact**: Reduce network overhead
**Effort**: Low-Medium
**Description**: Combine multiple requests into one
- Fetch projects + filters + initiatives together
- Use Promise.all() more strategically
- **Expected improvement**: 30-40% faster page loads

#### 12. **Reduce Initial Data Load** ⭐⭐⭐
**Impact**: Faster first paint
**Effort**: Low
**Description**: 
- Load only 8 projects initially (already doing this)
- Load filters separately (already doing this)
- Consider loading filters after projects
- **Expected improvement**: 20-30% faster initial render

#### 13. **Optimize Bundle Size** ⭐⭐⭐
**Impact**: Faster initial download
**Effort**: Low-Medium
**Description**:
- Analyze bundle with `npm run build -- --analyze`
- Remove unused dependencies
- Tree-shake unused code
- **Expected improvement**: 20-40% smaller bundle

#### 14. **HTTP/2 Server Push** ⭐⭐⭐
**Impact**: Faster resource loading
**Effort**: Medium
**Description**: Push critical resources before request
- Push CSS, JS, fonts
- Requires server configuration
- **Expected improvement**: 15-25% faster loads

### Tier 4: Lower Impact, Various Effort

#### 15. **Database Indexes Audit** ⭐⭐⭐
**Impact**: Faster queries
**Effort**: Low-Medium
**Description**: Ensure all query patterns have indexes
- Check EXPLAIN ANALYZE on slow queries
- Add composite indexes for common filters
- **Expected improvement**: 20-50% faster queries

#### 16. **Response Compression** ⭐⭐
**Impact**: Smaller payloads
**Effort**: Low (already have gzip)
**Description**: 
- Already using gzip compression
- Could add Brotli for better compression
- **Expected improvement**: 10-20% smaller responses

#### 17. **Connection Pooler (PgBouncer)** ⭐⭐⭐
**Impact**: Faster connection establishment
**Effort**: Medium-High
**Description**: Pool connections at database level
- Reduces connection overhead
- Better for remote databases
- **Expected improvement**: 10-30% faster queries

#### 18. **Optimistic UI Updates** ⭐⭐
**Impact**: Perceived performance
**Effort**: Medium
**Description**: Update UI before API confirms
- Instant feedback
- Rollback on error
- **Expected improvement**: Feels instant

#### 19. **Progressive Image Loading** ⭐⭐⭐
**Impact**: Faster perceived image load
**Effort**: Low-Medium
**Description**: 
- Show blur-up/LQIP first
- Load full image in background
- Already have LQIP in some places
- **Expected improvement**: 40-60% better perceived speed

#### 20. **Reduce Re-renders** ⭐⭐
**Impact**: Smoother UI
**Effort**: Low-Medium
**Description**: 
- Use React.memo more strategically
- Split components to isolate re-renders
- Use useCallback for event handlers
- **Expected improvement**: 20-30% smoother scrolling

#### 21. **Web Workers for Heavy Processing** ⭐⭐
**Impact**: Non-blocking UI
**Effort**: Medium
**Description**: Move heavy computations to worker
- Filtering large lists
- Image processing
- **Expected improvement**: Smoother UI during processing

#### 22. **Request Prioritization** ⭐⭐
**Impact**: Critical content loads first
**Effort**: Low
**Description**: 
- Load projects before filters
- Load visible content before hidden
- Use request priority hints
- **Expected improvement**: 15-25% faster critical content

#### 23. **Reduce API Response Size** ⭐⭐⭐
**Impact**: Faster network transfer
**Effort**: Low-Medium
**Description**:
- Only return needed fields
- Compress JSON responses
- Remove null/undefined fields
- **Expected improvement**: 30-50% smaller payloads

#### 24. **Database Query Result Caching** ⭐⭐⭐⭐
**Impact**: Eliminate duplicate queries
**Effort**: Medium
**Description**: 
- Redis cache for query results
- Cache at database query level
- Invalidate on updates
- **Expected improvement**: 90%+ faster for cached queries

#### 25. **Streaming SSR / Progressive Hydration** ⭐⭐⭐
**Impact**: Faster initial render
**Effort**: High (major refactor)
**Description**: 
- Server-side render critical content
- Stream HTML to browser
- Hydrate progressively
- **Expected improvement**: 50-70% faster first paint

---

## 🎯 Recommended Implementation Order

### Phase 1: Quick Wins (1-2 days)
1. ✅ Skeleton screens (already have loading indicators, enhance them)
2. ✅ Optimize useEffect dependencies
3. ✅ Batch API requests better
4. ✅ Reduce initial data load

### Phase 2: Medium Effort (3-5 days)
1. ✅ Code splitting & lazy loading
2. ✅ Virtual scrolling for large lists
3. ✅ Image optimization (CDN, multiple sizes)
4. ✅ Prefetching on hover

### Phase 3: High Impact (1-2 weeks)
1. ✅ Service Worker for offline caching
2. ✅ Database read replica (if infrastructure allows)
3. ✅ Infinite scroll with virtualization

### Phase 4: Advanced (Ongoing)
1. ✅ GraphQL migration
2. ✅ SSR/streaming
3. ✅ Advanced caching strategies

---

## 🔍 Specific Code Improvements

### Frontend Optimizations

#### 1. Add Virtual Scrolling
```javascript
import { FixedSizeList } from 'react-window';

// Replace map() with virtual list
<FixedSizeList
  height={600}
  itemCount={filteredProjects.length}
  itemSize={200}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ProjectCard project={filteredProjects[index]} />
    </div>
  )}
</FixedSizeList>
```

#### 2. Code Splitting
```javascript
// In App.jsx or router
import { lazy, Suspense } from 'react';

const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));

<Suspense fallback={<LoadingSkeleton />}>
  <Routes>
    <Route path="/projects" element={<ProjectsPage />} />
  </Routes>
</Suspense>
```

#### 3. Image Optimization Component
```javascript
// ProgressiveImage.jsx
const ProgressiveImage = ({ src, alt, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
  }, [src]);
  
  return (
    <div className="relative">
      {!isLoaded && <div className="blur-sm bg-gray-200 animate-pulse" />}
      <img src={imageSrc} alt={alt} className={isLoaded ? 'opacity-100' : 'opacity-0'} {...props} />
    </div>
  );
};
```

#### 4. Prefetch on Hover
```javascript
// Prefetch next page data when hovering over pagination
const handleMouseEnter = () => {
  const nextPage = gridPage + 1;
  projectsAPI.getAll({
    limit: 8,
    offset: nextPage * 8,
    includeParticipants: false
  }); // Cache will store this
};
```

### Backend Optimizations

#### 1. Response Compression
```javascript
// Already have compression, but could optimize
app.use(compression({
  level: 9, // Maximum compression
  filter: (req, res) => {
    // Compress JSON responses
    return res.getHeader('content-type')?.includes('json');
  }
}));
```

#### 2. Field Selection
```javascript
// Only return needed fields
router.get('/', async (req, res) => {
  const fields = req.query.fields?.split(',') || ['id', 'slug', 'title', 'summary'];
  // Modify query to only select requested fields
});
```

#### 3. Redis Caching Layer
```javascript
// Add Redis for distributed caching
const redis = require('redis');
const client = redis.createClient();

// Cache with Redis
const cached = await client.get(cacheKey);
if (cached) return JSON.parse(cached);
// ... fetch from DB
await client.setex(cacheKey, 600, JSON.stringify(result));
```

---

## 📊 Expected Performance Gains

| Optimization | Current | After | Improvement |
|-------------|---------|-------|-------------|
| **First Load (Remote DB)** | 60s | 60s* | No change (network) |
| **Cached Load** | 0.07s | 0.05s | 30% faster |
| **Initial Bundle** | ~500KB | ~200KB | 60% smaller |
| **Image Load** | 2-3s | 0.5-1s | 70% faster |
| **List Render (100 items)** | 500ms | 50ms | 90% faster |
| **Navigation** | 0.5s | 0.05s | 90% faster |

*First load will always be slow with remote DB - use local DB for dev

---

## 🎨 UX Improvements (Perceived Performance)

1. **Skeleton Screens**: Show structure immediately
2. **Progressive Loading**: Load critical content first
3. **Optimistic Updates**: Update UI before API confirms
4. **Smooth Transitions**: Animate between states
5. **Loading States**: Show progress, not just spinners
6. **Error Boundaries**: Graceful degradation

---

## 🔧 Infrastructure Optimizations

1. **CDN for Static Assets**: Cloudflare, CloudFront
2. **Database Read Replica**: Local or regional
3. **Connection Pooler**: PgBouncer for PostgreSQL
4. **Load Balancer**: Distribute requests
5. **Edge Caching**: Cache at edge locations

---

## 📈 Monitoring & Measurement

Add performance monitoring:
- Web Vitals (LCP, FID, CLS)
- API response times
- Cache hit rates
- Bundle size tracking
- Network request counts

---

## 🚀 Next Steps

1. **Immediate**: Implement skeleton screens and code splitting
2. **Short-term**: Add virtual scrolling and image optimization
3. **Medium-term**: Service worker and prefetching
4. **Long-term**: Consider GraphQL or read replica

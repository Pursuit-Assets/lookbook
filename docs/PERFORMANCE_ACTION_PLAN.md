# Performance Optimization Action Plan

## 🎯 Priority Ranking (Impact vs Effort)

### 🔥 Critical (Do First) - High Impact, Low Effort

#### 1. Memoize Card Components ⭐⭐⭐⭐⭐
**Impact**: Prevents unnecessary re-renders
**Effort**: 15 minutes
**Files**: 
- `frontend/src/components/ProjectCard.jsx`
- `frontend/src/components/PersonCard.jsx`

**Action**: Wrap exports with `React.memo()`

#### 2. Add Lazy Loading to Images ⭐⭐⭐⭐⭐
**Impact**: Faster initial page load
**Effort**: 30 minutes
**Files**: 
- `frontend/src/components/ProjectCard.jsx`
- `frontend/src/components/PersonCard.jsx`

**Action**: Add `loading="lazy"` to all `<img>` tags

#### 3. Optimize useEffect Dependencies ⭐⭐⭐⭐
**Impact**: Reduces unnecessary API calls
**Effort**: 1 hour
**Files**: 
- `frontend/src/pages/PersonDetailPage.jsx`

**Action**: Review all useEffect hooks, add missing dependencies or use useCallback

#### 4. Code Splitting (Route-based) ⭐⭐⭐⭐⭐
**Impact**: 40-60% faster initial load
**Effort**: 1 hour
**Files**: 
- `frontend/src/main.jsx` or router file

**Action**: Lazy load route components

---

### 🚀 High Priority - High Impact, Medium Effort

#### 5. Virtual Scrolling for Lists ⭐⭐⭐⭐⭐
**Impact**: 90% faster rendering for large lists
**Effort**: 2-3 hours
**Files**: 
- `frontend/src/pages/PersonDetailPage.jsx`

**Action**: Replace `.map()` with `react-window` or `react-virtualized`

#### 6. Prefetch Next Page Data ⭐⭐⭐⭐
**Impact**: Instant pagination feels
**Effort**: 1 hour
**Files**: 
- `frontend/src/pages/PersonDetailPage.jsx`

**Action**: Prefetch on hover over pagination buttons

#### 7. Enhanced Skeleton Screens ⭐⭐⭐⭐
**Impact**: Better perceived performance
**Effort**: 2 hours
**Files**: 
- Create `frontend/src/components/SkeletonCard.jsx`
- Update loading states

**Action**: Replace spinners with skeleton cards

#### 8. Image Optimization (CDN + Multiple Sizes) ⭐⭐⭐⭐
**Impact**: 50-70% faster image loads
**Effort**: 3-4 hours (setup) + ongoing
**Files**: 
- Image upload/processing logic
- `frontend/src/utils/imageUtils.js`

**Action**: Generate thumbnails, use CDN, WebP format

---

### 📈 Medium Priority - Medium Impact, Various Effort

#### 9. Service Worker for Offline Caching ⭐⭐⭐⭐⭐
**Impact**: Instant loads after first visit
**Effort**: 1-2 days
**Files**: 
- Create `frontend/public/sw.js`
- Register in `main.jsx`

**Action**: Cache API responses and assets

#### 10. Batch API Requests Better ⭐⭐⭐
**Impact**: 30-40% faster page loads
**Effort**: 2-3 hours
**Files**: 
- `frontend/src/pages/PersonDetailPage.jsx`

**Action**: Combine filters + projects + initiatives into single request

#### 11. Reduce Bundle Size ⭐⭐⭐
**Impact**: 20-40% smaller bundle
**Effort**: 2-3 hours
**Action**: Analyze bundle, remove unused deps

#### 12. Database Indexes Audit ⭐⭐⭐
**Impact**: 20-50% faster queries
**Effort**: 2-3 hours
**Files**: 
- Database schema files
- `backend/queries/projectQueries.js`

**Action**: Run EXPLAIN ANALYZE, add missing indexes

---

## 📋 Implementation Checklist

### Week 1: Quick Wins
- [ ] Memoize ProjectCard and PersonCard
- [ ] Add lazy loading to images
- [ ] Code splitting for routes
- [ ] Optimize useEffect dependencies
- [ ] Enhanced skeleton screens

### Week 2: High Impact
- [ ] Virtual scrolling for lists
- [ ] Prefetch next page data
- [ ] Image optimization setup
- [ ] Batch API requests better

### Week 3: Advanced
- [ ] Service Worker implementation
- [ ] Bundle size optimization
- [ ] Database indexes audit
- [ ] Performance monitoring

---

## 🔧 Specific Code Changes

### Change 1: Memoize Card Components

**File**: `frontend/src/components/ProjectCard.jsx`
```javascript
import { memo } from 'react';

function ProjectCard({ project }) {
  // ... existing code
}

export default memo(ProjectCard, (prevProps, nextProps) => {
  return prevProps.project.slug === nextProps.project.slug;
});
```

**File**: `frontend/src/components/PersonCard.jsx`
```javascript
import { memo } from 'react';

function PersonCard({ person }) {
  // ... existing code
}

export default memo(PersonCard, (prevProps, nextProps) => {
  return prevProps.person.slug === nextProps.person.slug;
});
```

### Change 2: Add Lazy Loading

**File**: `frontend/src/components/ProjectCard.jsx`
```javascript
<img 
  src={cardImageUrl} 
  alt={project.title}
  loading="lazy"  // Add this
/>
```

### Change 3: Code Splitting

**File**: `frontend/src/main.jsx` or router
```javascript
import { lazy, Suspense } from 'react';

const PersonDetailPage = lazy(() => import('./pages/PersonDetailPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const HomePage = lazy(() => import('./pages/HomePage'));

// In routes:
<Suspense fallback={<div>Loading...</div>}>
  <Route path="/projects" element={<ProjectsPage />} />
</Suspense>
```

### Change 4: Virtual Scrolling

**Install**: `npm install react-window`

**File**: `frontend/src/pages/PersonDetailPage.jsx`
```javascript
import { FixedSizeGrid } from 'react-window';

// Replace grid map() with:
<FixedSizeGrid
  columnCount={4}
  columnWidth={300}
  height={600}
  rowCount={Math.ceil(filteredProjects.length / 4)}
  rowHeight={400}
  width={1200}
>
  {({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 4 + columnIndex;
    if (index >= filteredProjects.length) return null;
    return (
      <div style={style}>
        <MemoizedProjectCard 
          proj={filteredProjects[index]} 
          onClick={() => handleProjectClick(filteredProjects[index].slug)}
        />
      </div>
    );
  }}
</FixedSizeGrid>
```

### Change 5: Prefetch on Hover

**File**: `frontend/src/pages/PersonDetailPage.jsx`
```javascript
const handlePageNavHover = useCallback((direction) => {
  const nextPage = direction === 'next' ? gridPage + 1 : gridPage - 1;
  if (nextPage >= 0 && nextPage < Math.ceil(totalProjects / 8)) {
    // Prefetch next page data
    projectsAPI.getAll({
      limit: 8,
      offset: nextPage * 8,
      includeParticipants: false
    });
  }
}, [gridPage, totalProjects]);

// Add to button:
<PageNavButton
  onClick={handleNextPage}
  onMouseEnter={() => handlePageNavHover('next')}
  // ...
/>
```

---

## 📊 Expected Results

| Optimization | Before | After | Improvement |
|-------------|--------|-------|-------------|
| **Card Re-renders** | Every filter change | Only when data changes | 80% reduction |
| **Initial Bundle** | ~500KB | ~200KB | 60% smaller |
| **Image Load** | 2-3s | 0.5-1s | 70% faster |
| **List Render (100 items)** | 500ms | 50ms | 90% faster |
| **Navigation** | 0.5s | 0.05s | 90% faster |
| **Pagination** | 0.5s | Instant (prefetched) | 100% faster |

---

## 🎯 Success Metrics

Track these metrics:
- **Time to First Contentful Paint (FCP)**: Target < 1.5s
- **Largest Contentful Paint (LCP)**: Target < 2.5s
- **Time to Interactive (TTI)**: Target < 3.5s
- **Bundle Size**: Target < 200KB gzipped
- **API Response Time**: Target < 100ms (cached)
- **Image Load Time**: Target < 500ms

---

## 🚀 Next Steps

1. **Start with Quick Wins** (Week 1)
2. **Measure baseline** performance
3. **Implement changes** one at a time
4. **Measure after each change**
5. **Document improvements**

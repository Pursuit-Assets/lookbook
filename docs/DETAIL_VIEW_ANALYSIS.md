# Detail View Analysis - Why It's Problematic

## Key Differences Between Detail View and Grid/List Views

### 1. **Data Fetching Strategy**

**Grid/List Views:**
- Fetch **filtered data** from API based on current filters
- `allProfiles`/`allProjects` = filtered results from server
- Filters applied **server-side** via API parameters
- Single source of truth: API response

**Detail View:**
- Always fetches **FULL unfiltered list** (for navigation)
- Fetches individual item by slug
- Filters applied **client-side** via `useMemo` (filteredProfiles/filteredProjects)
- Two sources of truth: `allProfiles` (unfiltered) + `filteredProfiles` (computed)

### 2. **useEffect Structure**

**Grid/List Views:**
- **One useEffect** (line 733) handles all data fetching
- Dependencies: `[gridPage, viewMode, debouncedSearch, filters, layoutView]`
- Clear, single responsibility

**Detail View:**
- **TWO competing useEffects:**
  1. **Slug-based fetch** (line 923): Fetches person/project when slug changes
     - Dependencies: `[slug, viewMode]`
     - Sets `person`/`project` state
  2. **Filter-based navigation** (line 1118): Updates index/navigation when filters change
     - Dependencies: `[filteredProfiles, filteredProjects, person, project, viewMode, layoutView, slug, navigate, filters, search, allProfiles, allProjects]`
     - Can clear `person`/`project` state
     - Can trigger navigation

### 3. **State Management Complexity**

**Grid/List Views:**
```
Filters change → useEffect runs → API call with filters → Update allProfiles → Render
```

**Detail View:**
```
Filters change → filteredProfiles recomputes (useMemo)
              → Filter useEffect runs → Check if person in filtered list
              → If not, navigate OR clear person state
              → Slug useEffect might also run → Fetch person → Check filters → Set/clear person
```

**Race Condition:**
- Slug useEffect fetches and sets person
- Filter useEffect checks if person is in filtered list
- If person doesn't pass filters, filter useEffect clears person
- But slug useEffect might have just set it
- Result: Person appears briefly, then disappears

### 4. **Filter Application Timing**

**Grid/List Views:**
- Filters applied **before** data fetch
- API returns only matching items
- No client-side filtering needed

**Detail View:**
- Filters checked **after** data fetch
- Fetch always gets full data
- Then checks if fetched person passes filters
- If not, clears person state
- But `filteredProfiles` might not be updated yet when fetch runs

### 5. **URL/Slug Handling**

**Grid/List Views:**
- URL: `/people` or `/projects`
- No slug parameter
- Simple routing

**Detail View:**
- URL: `/people/slug` or `/projects/slug`
- Slug triggers separate useEffect
- Slug changes trigger full refetch
- Navigation between items changes URL

### 6. **The Core Problem: Competing State Updates**

**Issue 1: Filter Check in Fetch useEffect**
```javascript
// Line 1004-1055: In slug useEffect
if (personData.success) {
  // Check if person passes filters
  let passesFilters = true;
  // ... filter logic ...
  
  if (passesFilters || !hasActiveFilters) {
    setPerson(person);  // Sets person
  } else {
    setPerson(null);    // Clears person
  }
}
```

**Issue 2: Filter Check in Filter useEffect**
```javascript
// Line 1137-1153: In filter useEffect
if (filteredProfiles.length === 0) {
  setPerson(null);  // Clears person
} else {
  const index = filteredProfiles.findIndex(p => p.slug === person.slug);
  if (index >= 0) {
    setCurrentIndex(index);
  } else {
    navigate(`/people/${filteredProfiles[0].slug}`);  // Navigates away
  }
}
```

**The Conflict:**
1. User applies filter that excludes current person
2. Filter useEffect runs → `filteredProfiles.length === 0` → `setPerson(null)`
3. Slug useEffect also runs (because dependencies changed) → Fetches person → Checks filters → Sets person
4. Filter useEffect runs again → Clears person
5. Result: Person flickers or stays visible

### 7. **Why Grid/List Views Work Better**

1. **Single useEffect**: One place handles all data fetching
2. **Server-side filtering**: API does the work, no client-side conflicts
3. **No slug**: No URL-based triggers
4. **Simple state**: `allProfiles` = filtered results, period
5. **No navigation conflicts**: Just updates the list, doesn't navigate

### 8. **Recommended Solutions**

**Option 1: Unify Filter Logic**
- Move filter check to ONE place (either fetch or filter useEffect, not both)
- Use a ref to prevent race conditions

**Option 2: Simplify Detail View**
- Make detail view fetch filtered data like grid/list
- Use filtered list for navigation instead of full list

**Option 3: Debounce/Queue State Updates**
- Use a queue or debounce to prevent conflicting state updates
- Ensure filter useEffect doesn't run while fetch is in progress

**Option 4: Remove Filter Check from Fetch useEffect**
- Let fetch useEffect always set person/project
- Let filter useEffect handle clearing/navigation
- Use a flag to prevent fetch when filters exclude person



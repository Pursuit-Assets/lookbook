# Why Detail View is Set Up Differently

## Core Requirements That Drive the Design

### 1. **Navigation Between Items (Prev/Next Buttons)**

Detail view has **prev/next navigation buttons** that allow users to move between items. This is unique to detail view - grid/list views don't have this.

**The Problem:**
- To show "Previous" and "Next", you need to know:
  - What item comes before the current one?
  - What item comes after the current one?
  - What's the total count? (for "01/10 People")

**The Solution:**
- Store the **full unfiltered list** in `allProfiles`/`allProjects`
- Compute the **filtered list** in `filteredProfiles`/`filteredProjects` (client-side)
- Navigation uses the **filtered list** when filters are active
- Navigation uses the **full list** when filters are cleared

**Code Evidence:**
```javascript
// Line 1365-1377: Navigation uses filtered lists
const prevProfile = filteredProfiles[currentIndex - 1];
navigate(`/people/${prevProfile.slug}`);
```

### 2. **Filters Should Affect Navigation**

**Requirement:** When you're viewing a person's detail page and apply filters, the prev/next buttons should navigate through the **filtered results**, not all people.

**Example:**
- You're viewing "Ariel Chen" (person #1)
- You filter by "Agile" skill
- Only 3 people have "Agile"
- Now prev/next should navigate through those 3 people, not all people

**The Problem:**
- If you only fetch filtered data, you lose the ability to:
  - Navigate back to unfiltered list when filters are cleared
  - Show correct page numbers (need total count)
  - Handle edge cases (what if current person is filtered out?)

**The Solution:**
- Always keep full unfiltered list (`allProfiles`)
- Compute filtered list client-side (`filteredProfiles`)
- Navigation logic switches between them based on filter state

**Code Evidence:**
```javascript
// Line 1224-1233: Navigation uses filteredProfiles when filters active
const index = filteredProfiles.findIndex(p => p.slug === person.slug);
if (index >= 0) {
  setCurrentIndex(index);  // Navigate through filtered list
} else {
  navigate(`/people/${filteredProfiles[0].slug}`);  // Go to first in filtered list
}
```

### 3. **Special Case: "Select Projects" Section**

**Requirement:** On a person's detail page, the "Select Projects" section should **always show ALL projects** for that person, regardless of any filters.

**The Problem:**
- If you fetch filtered data, the person's projects might be filtered out
- But the requirement is to always show all projects for that person

**The Solution:**
- `filteredPersonProjects` always returns `person.projects` directly
- Filters don't affect this section

**Code Evidence:**
```javascript
// Line 709-720: Always return all projects for person
const filteredPersonProjects = useMemo(() => {
  // Always return all projects for the person, regardless of filters
  const projectsArray = Array.isArray(person.projects) ? person.projects : [];
  return projectsArray;
}, [person?.projects]);
```

### 4. **Smooth Transitions (Performance Optimization)**

**Requirement:** When clicking from grid view to detail view, the transition should be smooth (no full page refresh).

**The Problem:**
- If you always fetch from API, there's a loading delay
- Users see a blank screen while data loads

**The Solution:**
- Check if data already exists in `allProfiles`/`allProjects` (from grid view)
- If it exists, use it immediately (no loading screen)
- Fetch full detail in background if needed

**Code Evidence:**
```javascript
// Line 937-952: Check if data already exists
const hasExactData = (viewMode === 'people' && person?.slug === slug);
const hasDataInList = allProfiles.some(p => p.slug === slug);

if (!hasExactData && !hasDataInList) {
  setLoading(true);  // Only show loading if we don't have data
} else {
  setLoading(false);  // Smooth transition if data exists
}
```

### 5. **Handling Filter Clearing**

**Requirement:** When filters are cleared, navigate back to the first item in the unfiltered list.

**The Problem:**
- If you only have filtered data, you don't know what the "first item" is in the unfiltered list
- You need the full list to navigate back

**The Solution:**
- Keep full unfiltered list in `allProfiles`
- When filters are cleared, navigate to `allProfiles[0]`

**Code Evidence:**
```javascript
// Line 1215-1217: Navigate to first in unfiltered list when filters cleared
if (hadFilters && !hasFilters && allProfiles.length > 0) {
  navigate(`/people/${allProfiles[0].slug}`);
}
```

## Why Grid/List Views Are Simpler

Grid/List views don't have these requirements:
- ❌ No prev/next navigation between items
- ❌ No need to handle "current item is filtered out"
- ❌ No special sections that ignore filters
- ❌ No need to navigate back to unfiltered list

So they can simply:
- Fetch filtered data from API
- Display it
- Done

## The Trade-off

**Detail View Complexity:**
- ✅ Supports navigation between items
- ✅ Filters affect navigation intelligently
- ✅ Handles edge cases (filtered out, filter clearing)
- ❌ More complex state management
- ❌ Race conditions between useEffects
- ❌ Client-side filtering duplicates server logic

**Grid/List Simplicity:**
- ✅ Simple, straightforward
- ✅ Server-side filtering (single source of truth)
- ✅ No race conditions
- ❌ Can't navigate between items
- ❌ Can't handle "current item filtered out" scenario

## Summary

Detail view is set up differently because it has **unique requirements** that grid/list views don't have:
1. Navigation between items (prev/next)
2. Filters affecting navigation
3. Special sections that ignore filters
4. Smooth transitions from grid view
5. Handling filter clearing

These requirements necessitate:
- Keeping full unfiltered list
- Computing filtered list client-side
- Two competing useEffects (one for fetching, one for filter navigation)
- Complex state management

The complexity is a **necessary trade-off** for the features, but it creates the race conditions and conflicts we've been experiencing.



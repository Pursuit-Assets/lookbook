# URL-Based Filtering Feature

## Overview
The Lookbook app now supports URL-based filtering for project initiatives, allowing you to share direct links to filtered views. This makes it easy to share specific cohorts or initiatives with others.

## Feature Details

### URL Format
To share a filtered view of projects, use the following URL format:
```
https://lookbook.pursuit.org/projects/filter/{initiative-slug}
```

### Example URLs
- **SMB Winter 2025**: `https://lookbook.pursuit.org/projects/filter/smb-winter-2025`
- **Demo Day Fall 2025**: `https://lookbook.pursuit.org/projects/filter/demo-day-fall-2025`
- **Any Initiative**: `https://lookbook.pursuit.org/projects/filter/{slug}`

### How It Works

1. **Automatic Filter Application**
   - When a user visits a filter URL (e.g., `/projects/filter/smb-winter-2025`), the app automatically:
     - Detects the `filterSlug` from the URL
     - Fetches all available initiatives
     - Matches the slug to an initiative
     - Applies the filter automatically
     - Displays only projects from that initiative/cohort

2. **No Pagination for Initiative Filters**
   - Initiative filter views show **all projects** without pagination
   - Projects are displayed in a grid layout (same as other views)
   - This works better with the initiative description banner at the top
   - Regular project browsing (without initiative filter) still uses pagination

3. **Filter Persistence**
   - The filter remains active while navigating between projects within the filtered view
   - The URL stays as `/projects/filter/{slug}` to maintain shareability
   - Filters are preserved even when refreshing the page

4. **Clearing Filters**
   - Clicking "Clear Filters" navigates back to `/projects` (unfiltered view)
   - Clicking the X button on the initiative badge navigates back to `/projects`
   - Deselecting an initiative in the sidebar navigates back to `/projects`

5. **Filter UI Indication**
   - When a filter is active via URL, the initiative button in the sidebar is highlighted
   - A badge appears at the top showing the active initiative with an X to clear
   - Pagination controls are hidden (since all projects are shown)
   - The project count reflects only filtered projects

## Implementation Details

### Frontend Changes

#### Route Configuration (`App.jsx`)
Added a new route to handle filter URLs:
```javascript
<Route path="/projects/filter/:filterSlug" element={<PersonDetailPage />} />
```

This route must be placed **before** the dynamic slug route to ensure proper matching.

#### URL Parameter Extraction (`PersonDetailPage.jsx`)
```javascript
const { slug, filterSlug } = useParams();
const isFilterUrl = location.pathname.includes('/filter/');
```

#### Automatic Filter Application
When initiatives are loaded, the app checks for a `filterSlug` and automatically applies it:
```javascript
if (filterSlug && viewMode === 'projects') {
  const matchingInitiative = loadedInitiatives.find(i => i.slug === filterSlug);
  if (matchingInitiative) {
    setSelectedInitiative(matchingInitiative.slug);
  }
}
```

#### Pagination Control
Initiative filter URLs disable pagination and fetch all projects:
```javascript
const shouldPaginate = !isFilterUrl || viewMode !== 'projects';
const pageSize = 8;
const offset = shouldPaginate ? gridPage * pageSize : 0;
const limit = shouldPaginate ? pageSize : 100; // Fetch all for initiative filters
```

Pagination UI is hidden on initiative filter URLs:
```javascript
{viewMode === 'projects' && !isFilterUrl && (
  <div className="flex items-center">
    {/* Pagination controls */}
  </div>
)}
```

#### Navigation on Filter Selection
When a user clicks an initiative button:
```javascript
onClick={() => {
  if (selectedInitiative === initiative.slug) {
    // Deselecting - navigate to base projects page
    setSelectedInitiative(null);
    navigate('/projects');
  } else {
    // Selecting - navigate to filter URL
    setSelectedInitiative(initiative.slug);
    navigate(`/projects/filter/${initiative.slug}`);
  }
}}
```

#### Preventing Unwanted Filter Clearing
The app now checks if we're on a filter URL before clearing filters on navigation:
```javascript
const isCurrentFilterUrl = location.pathname.includes('/filter/');
if (wasPeople !== isPeople && !isCurrentFilterUrl) {
  // Clear filters only if not on a filter URL
}
```

### Backend
No backend changes were required. The existing initiative filtering infrastructure already supports filtering by cohort value.

## Finding Initiative Slugs

Initiative slugs are automatically generated from the initiative name by:
1. Converting to lowercase
2. Replacing spaces and special characters with hyphens
3. Removing leading/trailing hyphens

**Example:**
- Name: "SMB Winter 2025"
- Slug: "smb-winter-2025"

To find available initiative slugs:
1. Visit the admin panel: `http://localhost:5175/admin/initiatives`
2. View the list of initiatives and their slugs
3. Or query the database: `SELECT slug, name FROM lookbook_initiatives WHERE is_active = true;`

## User Experience

### Sharing a Filtered View
1. Navigate to the projects page
2. Click an initiative filter (e.g., "SMB Winter 2025")
3. Copy the URL from the browser: `http://localhost:5175/projects/filter/smb-winter-2025`
4. Share this URL with others

### Receiving a Shared Link
1. Click on a shared filter URL
2. The page loads with the filter automatically applied
3. Browse projects within that initiative
4. Optionally clear the filter to see all projects

## Technical Notes

### Route Order Matters
The filter route must be defined **before** the dynamic slug route in `App.jsx`:
```javascript
<Route path="/projects/filter/:filterSlug" element={<PersonDetailPage />} />
<Route path="/projects/:slug" element={<PersonDetailPage />} />
```

If reversed, the filter route would never match because `:slug` would catch everything.

### URL vs. State Management
- The URL is the **source of truth** for the filter state
- When the component mounts or the URL changes, the filter is applied from the URL
- User interactions update both the state and the URL (via `navigate()`)

### Filter Persistence
- Filters persist across page refreshes because they're encoded in the URL
- Filters are cleared when navigating away from the projects section
- Filters are preserved when navigating between individual projects

## Future Enhancements

Potential improvements for this feature:
1. **Multiple Filters in URL**: Support for multiple filter types (e.g., `/projects/filter/smb-winter-2025?skills=react,node`)
2. **People Filters**: Extend URL-based filtering to the people section
3. **Custom Filter Combinations**: Allow saving and sharing custom filter combinations
4. **QR Codes**: Generate QR codes for filtered views to share physically
5. **Short URLs**: Create short, memorable URLs for common filters (e.g., `/projects/smb` → `/projects/filter/smb-winter-2025`)

## Testing

To test the feature:
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Navigate to: `http://localhost:5175/projects/filter/smb-winter-2025`
4. Verify that:
   - Only SMB Winter 2025 projects are shown
   - The initiative button is highlighted in the sidebar
   - The badge appears at the top
   - Clearing the filter navigates to `/projects`
   - Refreshing the page maintains the filter

## Related Files

- `frontend/src/App.jsx` - Route configuration
- `frontend/src/pages/PersonDetailPage.jsx` - Main implementation
- `backend/routes/initiatives.js` - Initiative API endpoints
- `backend/queries/initiativeQueries.js` - Database queries

## Changelog

### 2025-12-17
- Initial implementation of URL-based filtering for project initiatives
- Added `/projects/filter/:filterSlug` route
- Automatic filter application from URL parameters
- Navigation updates when selecting/clearing filters
- Removed pagination for initiative filter views (show all projects)
- Documentation created


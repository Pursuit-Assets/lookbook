# Changelog

## 2025-12-04

### Admin Delete Functionality
**Date:** 2025-12-04
**Status:** ✅ Added

**Added:**
- **Delete buttons for People and Projects**: Added delete functionality to admin list pages
  - Delete button with trash icon in Actions column (after View and Edit buttons)
  - Custom confirmation dialog: "Delete [Person/Project name]?" (centered, no browser default text)
  - Delete button styled to match View/Edit icons (removed red styling)
  - Immediate UI update on deletion (optimistic update)
  - Automatic list refresh after successful deletion

**Technical Details:**
- Created reusable `ConfirmDialog` component for confirmations
- Delete button uses purple theme color (#4242ea) to match design system
- Toast notifications for success/error feedback
- Proper error handling with user-friendly messages

---

### Admin People List Refresh Fix
**Date:** 2025-12-04
**Status:** ✅ Fixed

**Problem:**
- When creating or editing a person in admin mode, the new/updated person didn't appear in the people list immediately
- List would only update after 10-20 seconds or when manually refreshing the page
- Projects section worked correctly (updating immediately), but People section had this delay

**Root Cause:**
- **Server-side caching mismatch**: The profiles GET endpoint (`/api/profiles`) had a 5-minute server-side cache, while the projects endpoint had no caching
- When creating a new person:
  1. Profile was successfully created in database
  2. Backend cache was cleared (`cache.profiles = null`)
  3. Frontend immediately navigated back and called `fetchPeople()`
  4. Backend returned stale cached data (38 people instead of 39) because cache was repopulated or timing issue
- Projects worked because it always queries the database directly (no cache to bypass)

**Solution:**
- **Cache-busting parameter**: Added `_t: Date.now()` timestamp parameter to `profilesAPI.getAll()` calls
- **Backend cache bypass**: Updated profiles GET endpoint to check for `_t` parameter and skip cache when present
- **Location-based refresh**: Improved refresh detection using `location.key` to reliably detect navigation events
- **Immediate state update**: Optimistic UI updates on delete operations for instant feedback

**Technical Implementation:**
- Frontend: `fetchPeople()` now includes `_t: Date.now()` to force fresh queries
- Backend: Profiles route checks `req.query._t` and bypasses cache when present
- Both People and Projects sections now use consistent refresh logic with `location.key` tracking
- People section now matches Projects section behavior (immediate updates)

**Result:**
- People list updates immediately after create/edit operations
- No more 10-20 second delays
- Consistent behavior between People and Projects sections

---

### Admin Profile Creation & Editing Fixes
**Date:** 2025-12-04
**Status:** ✅ Fixed

**Fixed:**
- **Admin Profile Creation & Editing**: Fixed 500 errors when creating new profiles and updating profile names
  - Added INSERT and UPDATE permissions on `users` table for `lookbook_user_new` database user
  - Improved error handling for user creation with better fallback logic
  - Added validation for required fields (slug, name) in profile creation
  - Enhanced error messages to clearly indicate permission issues
  - Fixed fallback user selection to only use users without existing profiles
  - Added warning messages when name updates fail due to permissions

**Improved:**
- **Error Handling**: Better error messages and logging for profile creation/update operations
- **User Management**: Improved logic for finding and using existing users when creating profiles
- **Frontend Validation**: Added slug format validation and required field checks before submission

**Added:**
- `/database/grant-permissions.sql` - SQL script to grant necessary database permissions
- `/backend/grant-permissions.js` - Node script to programmatically grant permissions

---

## Detail View Refactor & Page Navigation Updates

**Detail View Refactor:**
- Refactored detail view to fetch filtered data from API (like grid/list views)
- Removed competing useEffects and client-side filtering conflicts
- Fixed filter functionality in detail view - filters now properly update content
- Fixed "no results" message display (removed white background for projects)

**Page Navigation:**
- Updated page navigation to show "0 Pages" or "0 People"/"0 Projects" when there are no results
- All numbers in page navigation are now bold (current page, total pages, and zero when no results)

## 2025-11-21

### Filter & Navigation Improvements
**Date:** 2025-11-21 (Latest)
**Status:** ⏳ Committed (not pushed)

**Detail View Filters:**
- Fixed filter functionality in detail view - filters now affect people/projects navigation
- On person detail pages, people filters control navigation (skills, industries)
- "Select Projects" section always shows all projects for that person (not affected by filters)
- When filters exclude current person/project, automatically navigate to first item in filtered list
- When filters are cleared, navigate to first item in unfiltered list

**Page Navigation:**
- Changed detail view navigation text from "XX/XX Pages" to "XX/XX People" or "XX/XX Projects"
- Navigation uses filtered lists in detail view (so filters affect which items you navigate through)

**View Transitions:**
- Made grid to detail view transition smooth - only content area updates (no full page reload)
- Tab switching (PEOPLE/PROJECTS) now navigates to grid view as expected

**Code Improvements:**
- Optimized data fetching to prevent unnecessary API calls when data already exists
- Improved loading state management for smoother transitions

---

### `6124052` - Update profile page alignment and desktop padding
**Date:** 2025-11-21 11:06:47
**Status:** ⏳ Committed (not pushed)

- Aligned profile picture, name, and social links to top
- Changed desktop padding from 24px to 30px
- Cleaned up redundant inline styles for better efficiency

---

### **`d97cff2` - Update page navigation format and styling**
**Date:** 2025-11-21 09:49:08
**Status:** ✅ Pushed

**Search Bar:**
- Changed search behavior to commit on Enter key press
- Added visual states: purple background when active, white when committed
- Hide magnifying glass icon when search is focused or committed
- Clear button styling: purple border/icon when search is committed, purple fill/white icon on hover
- Added "Click to search" animated text that fades in after tray opens
- Search tray stays open when search is committed (even when clicking elsewhere)
- Clicking into committed search retains the search value
- Tray opening animation set to 500ms
- Fixed tray collapse behavior when clearing search with no results

**Page Navigation:**
- Changed format from "P. xx/xx" to "xx/xx Pages"
- Reduced spacing around "/" separator by half
- Page navigation now always visible (even with fewer than 8 results)
- Shows "No results" when total is 0, maintaining consistent background width
- Both arrow buttons disabled when only 1 page available

**List View:**
- Added white background to list view count display (matching page navigation style)
- Reduced horizontal padding by half
- Number displayed in bold, label in regular weight
- Added space between number and label

**Backend:**
- Fixed server port from 4005 to 4002 to match frontend configuration

**Code Improvements:**
- Added reusable `PageNavButton` and `PageDisplay` components
- Updated mobile detail view to match desktop format
- Improved error handling for API calls

---

**Legend:** ⏳ = Committed (not pushed) | ✅ = Pushed

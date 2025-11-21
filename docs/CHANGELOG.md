# Changelog

## 2025-11-21

### `a6b9bc7` - Add search bar changes to changelog
**Status:** ⏳ Committed (not pushed)
- Updated changelog to include search bar improvements

### `da632e9` - Add changelog documenting recent changes
**Status:** ⏳ Committed (not pushed)
- Created initial changelog file
- Documented all changes from session

### `6124052` - Update profile page alignment and desktop padding
**Status:** ⏳ Committed (not pushed)
- Aligned profile picture, name, and social links to top
- Changed desktop padding from 24px to 30px
- Cleaned up redundant inline styles for better efficiency

### `d97cff2` - Update page navigation format and styling
**Status:** ✅ Pushed
- Changed format from "P. xx/xx" to "xx/xx Pages"
- Reduced spacing around "/" separator by half
- Page navigation now always visible (even with fewer than 8 results)
- Shows "No results" when total is 0, maintaining consistent background width
- Both arrow buttons disabled when only 1 page available
- Added white background to list view count display
- Reduced list view horizontal padding by half
- Number displayed in bold, label in regular weight
- Added space between number and label
- Fixed backend port from 4005 to 4002
- Added reusable `PageNavButton` and `PageDisplay` components
- Updated mobile detail view to match desktop format
- Improved error handling for API calls
- Search bar improvements:
  - Changed search behavior to commit on Enter key press
  - Added visual states: purple background when active, white when committed
  - Hide magnifying glass icon when search is focused or committed
  - Clear button styling: purple border/icon when search is committed, purple fill/white icon on hover
  - Added "Click to search" animated text that fades in after tray opens
  - Search tray stays open when search is committed (even when clicking elsewhere)
  - Clicking into committed search retains the search value
  - Tray opening animation set to 500ms
  - Fixed tray collapse behavior when clearing search with no results

---

**Legend:**
- ⏳ Committed (not pushed) - Changes are committed locally but not yet pushed to remote
- ✅ Pushed - Changes have been pushed to remote repository

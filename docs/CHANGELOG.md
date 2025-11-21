# Changelog

## 2025-11-21 - Page Navigation & Profile Updates

### Page Navigation
- Changed format from "P. xx/xx" to "xx/xx Pages"
- Reduced spacing around "/" separator by half
- Page navigation now always visible (even with fewer than 8 results)
- Shows "No results" when total is 0, maintaining consistent background width
- Both arrow buttons disabled when only 1 page available

### List View
- Added white background to list view count display (matching page navigation style)
- Reduced horizontal padding by half
- Number displayed in bold, label in regular weight
- Added space between number and label

### Profile Page
- Aligned profile picture, name, and social links to top
- Changed desktop padding from 24px to 30px
- Cleaned up redundant inline styles for better efficiency

### Backend
- Fixed server port from 4005 to 4002 to match frontend configuration

### Code Improvements
- Added reusable `PageNavButton` and `PageDisplay` components
- Updated mobile detail view to match desktop format
- Improved error handling for API calls


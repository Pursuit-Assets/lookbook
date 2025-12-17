# Project Card Background Image Feature

**Date Implemented:** December 17, 2024

## Overview

This feature adds the ability to upload a separate background image specifically for project cards, while keeping the main image for the project detail page.

## What Changed

### Database Changes

**Migration:** `database/migrations/add-card-background.sql`

- Added `card_background_url` column to `lookbook_projects` table
- Migration has been run against the segundo database ✅

### Backend Changes

**File:** `backend/queries/projectQueries.js`

1. **getAllProjects** - Added `card_background_url` to SELECT query
2. **createProject** - Added `cardBackgroundUrl` parameter and field to INSERT query  
3. **updateProject** - Added `card_background_url` to allowed fields list

### Frontend Changes

**File:** `frontend/src/pages/AdminProjectEditPage.jsx`

1. Added `card_background_url` to form state
2. Added `cardBackgroundInputMode` state for URL/Upload toggle
3. Added `handleCardBackgroundUpload` function for file uploads
4. Added UI section for card background upload with:
   - Toggle between URL and file upload
   - File upload dropzone
   - Preview of uploaded image
   - Helper text explaining the feature

**File:** `frontend/src/components/ProjectCard.jsx`

- Updated to use `card_background_url` if available
- Falls back to `main_image_url` if no background is set
- Maintains backward compatibility with existing projects

## How to Use

### Admin Interface

1. Go to **Admin → Projects**
2. Edit any project
3. Scroll to the **Media** section
4. Find the new "**Card Background Image**" section
5. Either:
   - Enter an image URL directly, OR
   - Upload an image file (max 5MB)
6. Save the project

### Behavior

- **If card background is set:** Project cards will display the background image
- **If card background is NOT set:** Project cards will default to the main image (backward compatible)
- **Main image** continues to be used for the project detail page screenshot

## Technical Details

### Database Field

```sql
card_background_url TEXT
```

- Stores URL or base64-encoded image
- NULL values are allowed (falls back to main_image_url)
- No migration needed for existing data

### API Response

The API now returns `card_background_url` in all project endpoints:

```json
{
  "project_id": 1,
  "title": "Example Project",
  "main_image_url": "...",
  "card_background_url": "...",
  ...
}
```

### Component Logic

```javascript
const cardImageUrl = project.card_background_url || project.main_image_url;
```

Simple fallback logic ensures backward compatibility.

## Benefits

1. **Better Card Visuals** - Upload optimized images for card backgrounds
2. **Flexibility** - Main image can be a detailed screenshot, card background can be a simplified/cropped version
3. **Backward Compatible** - Existing projects work without changes
4. **Easy to Use** - Same upload interface as other images

## Testing Checklist

- [x] Database migration successful
- [x] Backend queries updated
- [x] Frontend admin form updated  
- [x] ProjectCard component updated
- [ ] Test uploading a card background image
- [ ] Test URL input for card background
- [ ] Verify fallback to main image works
- [ ] Check existing projects still display correctly

## Notes

- The feature works immediately - no additional setup needed
- All code changes are backward compatible
- Server automatically restarted with new code (nodemon)
- Frontend will need a browser refresh to load new code

---

**Implemented by:** AI Assistant  
**Date:** December 17, 2024


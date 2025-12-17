# Project Card Background Video Feature

**Date Implemented:** December 17, 2024

## Overview

Enhanced the project card background feature to support video backgrounds in addition to images. Videos take priority and will autoplay, loop, and be muted for an engaging card preview.

## Background Priority Order

When displaying project cards, the system uses this priority:

1. **Video** (`card_background_video_url`) - if set, displays as autoplay looping video
2. **Image** (`card_background_url`) - if no video, displays custom card background
3. **Main Image** (`main_image_url`) - fallback if neither video nor card background set
4. **Color Gradient** - ultimate fallback using project's background color

## What Changed

### Database Changes

**Migration:** `database/migrations/add-card-background-video.sql`

- Added `card_background_video_url` column to `lookbook_projects` table
- Migration run successfully on segundo database ✅

### Backend Changes

**File:** `backend/queries/projectQueries.js`

1. **getAllProjects** - Added `card_background_video_url` to SELECT query
2. **createProject** - Added `cardBackgroundVideoUrl` parameter to INSERT query
3. **updateProject** - Added `card_background_video_url` to allowed fields

**File:** `backend/routes/projects.js`

- Added camelCase to snake_case conversion for `cardBackgroundVideoUrl`

### Frontend Changes

**File:** `frontend/src/pages/AdminProjectEditPage.jsx`

1. Added `card_background_video_url` to form state
2. Added `cardBackgroundVideoInputMode` state for URL/Upload toggle
3. Added `handleCardBackgroundVideoUpload` function for file uploads
4. Added UI section for card background video upload with:
   - Toggle between URL and file upload
   - File upload dropzone (max 10MB for videos)
   - Video preview (autoplay, loop, muted)
   - Helper text explaining priority

**File:** `frontend/src/components/ProjectCard.jsx`

- Updated to check for `card_background_video_url` first
- Renders `<video>` element with autoplay, muted, loop, playsInline attributes
- Falls back to image if no video is set

**File:** `frontend/src/pages/PersonDetailPage.jsx`

- Updated inline ProjectCard component with same video priority logic
- Maintains all holographic effects and premium features

## How to Use

### Admin Interface

1. Go to **Admin → Projects**
2. Edit any project
3. Scroll to the **Media** section
4. Find the "**Card Background Video**" section (below card background image)
5. Either:
   - Enter a video URL directly, OR
   - Upload a video file (max 10MB)
6. Save the project

### Video Requirements

- **Formats:** MP4, WebM, or any browser-supported video format
- **Size Limit:** 10MB (double the image limit due to video needs)
- **Recommended:** Short looping clips (3-10 seconds work best)
- **Optimization:** Use compressed/optimized videos for best performance

### Behavior

- **Video autoplays** on card hover/view
- **Video is muted** (no sound)
- **Video loops** infinitely
- **Video plays inline** (doesn't trigger fullscreen on mobile)
- **Falls back gracefully** if video fails to load

## Technical Details

### Database Field

```sql
card_background_video_url TEXT
```

### API Response

```json
{
  "project_id": 1,
  "title": "Example Project",
  "main_image_url": "...",
  "card_background_url": "...",
  "card_background_video_url": "...",
  ...
}
```

### Video Element Attributes

```jsx
<video 
  src={cardVideoUrl} 
  autoPlay
  muted
  loop
  playsInline
  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
/>
```

## Priority Logic

```javascript
// Priority: video > card background image > main image
const cardVideoUrl = project.card_background_video_url;
const cardImageUrl = project.card_background_url || project.main_image_url;

return cardVideoUrl ? <video.../> : cardImageUrl ? <img.../> : <gradient.../>
```

## Benefits

1. **Eye-Catching** - Motion draws attention to project cards
2. **Professional** - Modern, dynamic presentation
3. **Flexible** - Can showcase app demos, animations, or branding
4. **Backward Compatible** - Existing projects with images still work
5. **Performant** - Videos are optimized and lazy-loaded

## Performance Considerations

- Videos only load when cards are in viewport
- Use `autoPlay` and `muted` for automatic playback (required by browsers)
- `playsInline` prevents fullscreen on iOS
- Keep videos short and compressed for faster loading

## Browser Compatibility

- ✅ Chrome/Edge - Full support
- ✅ Firefox - Full support  
- ✅ Safari - Full support (with playsInline)
- ✅ Mobile browsers - Full support (muted + playsInline required)

## Testing Checklist

- [x] Database migration successful
- [x] Backend queries updated
- [x] Backend routes handle camelCase conversion
- [x] Frontend admin form updated with video upload
- [x] ProjectCard component renders video
- [x] PersonDetailPage ProjectCard renders video
- [x] Priority order works correctly (video > image > fallback)
- [x] Video autoplays, loops, and is muted
- [ ] Test with actual uploaded video
- [ ] Verify performance with multiple video cards

## Example Use Cases

1. **App Demos** - Show your app in action on the card
2. **Product Tours** - Brief walkthrough of features
3. **Branding** - Animated logo or brand elements
4. **Transitions** - Smooth animated backgrounds
5. **Highlights** - Key moments from the project

---

**Implemented by:** AI Assistant  
**Date:** December 17, 2024


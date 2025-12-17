-- Migration: Add card_background_video_url to projects
-- Allows video backgrounds for project cards

-- Add the card_background_video_url column
ALTER TABLE lookbook_projects 
ADD COLUMN IF NOT EXISTS card_background_video_url TEXT;

-- Add a comment explaining the field
COMMENT ON COLUMN lookbook_projects.card_background_video_url IS 
'Optional video background for project cards. If set, takes priority over card_background_url and main_image_url';

-- Priority order for card backgrounds:
-- 1. card_background_video_url (if set, use video)
-- 2. card_background_url (if set, use image)
-- 3. main_image_url (fallback)


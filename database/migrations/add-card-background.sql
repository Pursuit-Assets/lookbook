-- Migration: Add card_background_url to projects
-- This allows projects to have a separate background image for cards
-- while keeping the main_image_url for detail page screenshots

-- Add the card_background_url column
ALTER TABLE lookbook_projects 
ADD COLUMN IF NOT EXISTS card_background_url TEXT;

-- Add a comment explaining the field
COMMENT ON COLUMN lookbook_projects.card_background_url IS 
'Optional background image for project cards. If not set, falls back to main_image_url';

-- Migration completed successfully
-- The application will automatically fall back to main_image_url if card_background_url is NULL


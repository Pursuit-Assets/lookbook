-- Migration: Increase cohort column size to support initiative names
-- Date: 2025-12-16
-- Reason: Initiative cohort_values like "SMB Winter 2025" (15 chars) and "Demo Day Fall 2025" (18 chars)
--         exceed the original VARCHAR(10) limit

-- Drop dependent view
DROP VIEW IF EXISTS lookbook_projects_complete CASCADE;

-- Increase column size
ALTER TABLE lookbook_projects ALTER COLUMN cohort TYPE VARCHAR(50);

-- Recreate the view (if it exists in your schema)
-- Note: The view will be automatically recreated if it's defined in your schema files


-- Cleanup and standardize project skills and sectors
-- This script removes duplicates caused by inconsistent casing and spelling

-- =====================================================
-- CLEANUP SKILLS (TECHNOLOGIES)
-- =====================================================

-- Function to replace array elements (case-insensitive)
CREATE OR REPLACE FUNCTION array_replace_icase(arr text[], old_val text, new_val text)
RETURNS text[] AS $$
DECLARE
  result text[] := '{}';
  elem text;
BEGIN
  FOREACH elem IN ARRAY arr
  LOOP
    IF lower(elem) = lower(old_val) THEN
      result := array_append(result, new_val);
    ELSE
      result := array_append(result, elem);
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Standardize JavaScript variations
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'Javascript', 'JavaScript')
WHERE 'Javascript' = ANY(skills);

-- Standardize Node.js variations
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'nodejs', 'Node.js')
WHERE 'nodejs' = ANY(skills);

UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'NodeJs', 'Node.js')
WHERE 'NodeJs' = ANY(skills);

-- Standardize PostgreSQL variations
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'postgres', 'PostgreSQL')
WHERE 'postgres' = ANY(skills);

UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'PostgresSQL', 'PostgreSQL')
WHERE 'PostgresSQL' = ANY(skills);

-- Standardize TypeScript variations
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'Typescript', 'TypeScript')
WHERE 'Typescript' = ANY(skills);

UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'Typscript', 'TypeScript')
WHERE 'Typscript' = ANY(skills);

-- Standardize Supabase casing
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'supabase', 'Supabase')
WHERE 'supabase' = ANY(skills);

-- Standardize Vercel casing
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'vercel', 'Vercel')
WHERE 'vercel' = ANY(skills);

-- Standardize Render casing
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'render', 'Render')
WHERE 'render' = ANY(skills);

-- Standardize HTML/CSS
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'html', 'HTML')
WHERE 'html' = ANY(skills);

UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'css', 'CSS')
WHERE 'css' = ANY(skills);

UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'Scss/css', 'CSS')
WHERE 'Scss/css' = ANY(skills);

-- Standardize SQL
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'sql', 'SQL')
WHERE 'sql' = ANY(skills);

-- Fix typo: SHell -> Shell
UPDATE lookbook_projects 
SET skills = array_replace_icase(skills, 'SHell', 'Shell')
WHERE 'SHell' = ANY(skills);

-- =====================================================
-- CLEANUP SECTORS (INDUSTRIES)
-- =====================================================

-- Standardize E-Commerce
UPDATE lookbook_projects 
SET sectors = array_replace_icase(sectors, 'e-commerce', 'E-Commerce')
WHERE 'e-commerce' = ANY(sectors);

-- Standardize Manufacturing
UPDATE lookbook_projects 
SET sectors = array_replace_icase(sectors, 'manufacturing', 'Manufacturing')
WHERE 'manufacturing' = ANY(sectors);

-- Standardize Traffic (capitalize)
UPDATE lookbook_projects 
SET sectors = array_replace_icase(sectors, 'traffic', 'Traffic')
WHERE 'traffic' = ANY(sectors);

-- =====================================================
-- REMOVE DUPLICATE ENTRIES WITHIN SAME PROJECT
-- =====================================================

-- Function to get unique array elements (case-sensitive after standardization)
CREATE OR REPLACE FUNCTION array_unique(arr text[])
RETURNS text[] AS $$
  SELECT ARRAY(SELECT DISTINCT unnest(arr) ORDER BY 1);
$$ LANGUAGE sql IMMUTABLE;

-- Remove duplicate skills within each project
UPDATE lookbook_projects
SET skills = array_unique(skills)
WHERE array_length(skills, 1) > 0;

-- Remove duplicate sectors within each project
UPDATE lookbook_projects
SET sectors = array_unique(sectors)
WHERE array_length(sectors, 1) > 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check remaining skills
SELECT 'Skills after cleanup:' as info;
SELECT DISTINCT unnest(skills) as skill
FROM lookbook_projects
WHERE status = 'active'
  AND skills IS NOT NULL
ORDER BY skill;

-- Check remaining sectors
SELECT 'Sectors after cleanup:' as info;
SELECT DISTINCT unnest(sectors) as sector
FROM lookbook_projects
WHERE status = 'active'
  AND sectors IS NOT NULL
ORDER BY sector;

-- Cleanup functions (optional - keep them for future use)
-- DROP FUNCTION IF EXISTS array_replace_icase(text[], text, text);
-- DROP FUNCTION IF EXISTS array_unique(text[]);


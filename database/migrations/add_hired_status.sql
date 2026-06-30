-- Add hired status columns to lookbook_profiles
-- Lets admins mark a person as hired, record where they were hired,
-- and optionally show the hiring company's logo on their card.

ALTER TABLE lookbook_profiles
  ADD COLUMN IF NOT EXISTS hired BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hired_company TEXT,
  ADD COLUMN IF NOT EXISTS hired_company_logo_url TEXT;

COMMENT ON COLUMN lookbook_profiles.hired IS 'Indicates the person has been hired; their card renders in black & white.';
COMMENT ON COLUMN lookbook_profiles.hired_company IS 'Name of the company the person was hired at (shown under their title).';
COMMENT ON COLUMN lookbook_profiles.hired_company_logo_url IS 'Optional logo URL for the hiring company (uploaded or external).';

-- Example:
-- UPDATE lookbook_profiles SET hired = TRUE, hired_company = 'Acme Inc.' WHERE slug = 'some-slug';

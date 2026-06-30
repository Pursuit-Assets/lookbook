-- Re-purpose the lookbook_profiles "hired" columns as an OVERRIDE layer on top
-- of the real employment data that already lives in `employment_records`.
--
-- Hired status is now auto-derived: a profile shows the "Hired at <company>" seal
-- when the person has an ACTIVE FULL-TIME row in employment_records (joined by
-- user_id). Company logos are pulled from the `companies` table / the company
-- domain at render time.
--
-- The `hired` column becomes a tri-state override:
--   NULL  -> auto (derive from employment_records)   [new default]
--   TRUE  -> always show the badge (even with no record)
--   FALSE -> always hide the badge (even if a record exists)
-- `hired_company` / `hired_company_logo_url` remain optional manual overrides
-- for the displayed company name and logo.

-- New default is "auto" rather than "force-hidden".
ALTER TABLE lookbook_profiles ALTER COLUMN hired DROP DEFAULT;

-- Existing rows were all FALSE only because that was the old column default, not
-- an intentional "hide" choice. Reset them to NULL so auto-derivation drives them.
UPDATE lookbook_profiles SET hired = NULL WHERE hired = FALSE;

COMMENT ON COLUMN lookbook_profiles.hired IS
  'Hired-badge override (tri-state): NULL = auto-derive from employment_records (active full-time), TRUE = always show, FALSE = always hide.';
COMMENT ON COLUMN lookbook_profiles.hired_company IS
  'Optional override for the company name shown on the hired badge; falls back to the active employment_records company.';
COMMENT ON COLUMN lookbook_profiles.hired_company_logo_url IS
  'Optional override logo for the hired badge; falls back to companies.logo_url / a logo-from-domain service / the company initial.';

-- Migration: Add external project contributors
-- Supports initiative/project contributors who are not Lookbook profiles.

CREATE TABLE IF NOT EXISTS lookbook_external_contributors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  organization VARCHAR(255),
  photo_url TEXT,
  bio TEXT,
  links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lookbook_project_external_contributors (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES lookbook_projects(id) ON DELETE CASCADE,
  external_contributor_id INTEGER NOT NULL REFERENCES lookbook_external_contributors(id) ON DELETE CASCADE,
  role VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_project_external_contributor UNIQUE(project_id, external_contributor_id)
);

CREATE INDEX IF NOT EXISTS idx_external_contributors_name ON lookbook_external_contributors(name);
CREATE INDEX IF NOT EXISTS idx_project_external_contributors_project ON lookbook_project_external_contributors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_external_contributors_contributor ON lookbook_project_external_contributors(external_contributor_id);

DROP TRIGGER IF EXISTS update_lookbook_external_contributors_updated_at ON lookbook_external_contributors;
CREATE TRIGGER update_lookbook_external_contributors_updated_at BEFORE UPDATE ON lookbook_external_contributors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON lookbook_external_contributors TO lookbook_user_new;
GRANT SELECT, INSERT, UPDATE, DELETE ON lookbook_project_external_contributors TO lookbook_user_new;
GRANT USAGE, SELECT ON SEQUENCE lookbook_external_contributors_id_seq TO lookbook_user_new;
GRANT USAGE, SELECT ON SEQUENCE lookbook_project_external_contributors_id_seq TO lookbook_user_new;

-- =====================================================
-- Lookbook Database Schema - CUSTOM for Segundo DB
-- Adapted to work with existing users table structure
-- =====================================================

-- Your existing users table has:
-- - user_id (instead of id)
-- - first_name, last_name (instead of name)
-- This schema is modified to work with your structure

-- =====================================================
-- LOOKBOOK PROFILE EXTENSIONS
-- Links to your existing users
-- =====================================================

CREATE TABLE IF NOT EXISTS lookbook_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  slug VARCHAR(96) UNIQUE NOT NULL,
  
  -- Professional info
  title VARCHAR(255),
  bio TEXT,
  
  -- Skills & expertise
  skills TEXT[] NOT NULL DEFAULT '{}',
  industry_expertise TEXT[] DEFAULT '{}',
  
  -- Work status
  open_to_work BOOLEAN DEFAULT false,
  highlights TEXT[] DEFAULT '{}',
  
  -- Visual
  photo_url TEXT,
  photo_lqip TEXT, -- low quality image placeholder for blur
  
  -- Links
  linkedin_url TEXT,
  github_url TEXT,
  website_url TEXT,
  x_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- =====================================================
-- EXPERIENCE & EDUCATION
-- =====================================================

CREATE TABLE IF NOT EXISTS lookbook_experience (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES lookbook_profiles(id) ON DELETE CASCADE,
  
  org VARCHAR(255),
  role VARCHAR(255),
  date_from VARCHAR(50),
  date_to VARCHAR(50),
  summary TEXT,
  
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lookbook_projects (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(96) UNIQUE NOT NULL,
  
  -- Basic info
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  description TEXT, -- longer detailed description
  
  -- Visual
  main_image_url TEXT,
  main_image_lqip TEXT,
  icon_url TEXT, -- Project icon/logo (alternative to main_image for icons)
  demo_video_url TEXT,
  
  -- Tech & industry
  skills TEXT[] NOT NULL DEFAULT '{}',
  sectors TEXT[] DEFAULT '{}',
  
  -- Links
  github_url TEXT,
  live_url TEXT,
  
  -- Metadata
  cohort VARCHAR(50), -- Initiative cohort value (e.g., 'SMB Winter 2025', 'Demo Day Fall 2025')
  status VARCHAR(20) DEFAULT 'active', -- active, archived, draft
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROJECT PARTICIPANTS (Many-to-Many)
-- Links projects to people via their profiles
-- =====================================================

CREATE TABLE IF NOT EXISTS lookbook_project_participants (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES lookbook_projects(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES lookbook_profiles(id) ON DELETE CASCADE,
  
  role VARCHAR(100), -- e.g., 'Lead Developer', 'Designer', 'Product Manager'
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_project_participant UNIQUE(project_id, profile_id)
);

-- =====================================================
-- ANALYTICS & TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS lookbook_sharepack_events (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  kind VARCHAR(50) NOT NULL, -- 'sharepack', 'lead', 'view'
  requester_email TEXT,
  requester_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  
  people_count INTEGER DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  people_slugs TEXT[] DEFAULT '{}',
  project_slugs TEXT[] DEFAULT '{}',
  
  metadata JSONB DEFAULT '{}'::JSONB -- flexible field for extra data
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_lookbook_profiles_slug ON lookbook_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_lookbook_profiles_user_id ON lookbook_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lookbook_profiles_open_to_work ON lookbook_profiles(open_to_work);
CREATE INDEX IF NOT EXISTS idx_lookbook_profiles_skills ON lookbook_profiles USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_lookbook_profiles_industry ON lookbook_profiles USING GIN(industry_expertise);

-- Experience
CREATE INDEX IF NOT EXISTS idx_lookbook_experience_profile_id ON lookbook_experience(profile_id);
CREATE INDEX IF NOT EXISTS idx_lookbook_experience_order ON lookbook_experience(profile_id, display_order);

-- Projects
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_slug ON lookbook_projects(slug);
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_status ON lookbook_projects(status);
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_cohort ON lookbook_projects(cohort);
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_skills ON lookbook_projects USING GIN(skills);
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_sectors ON lookbook_projects USING GIN(sectors);

-- Participants
CREATE INDEX IF NOT EXISTS idx_lookbook_participants_project ON lookbook_project_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_lookbook_participants_profile ON lookbook_project_participants(profile_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_lookbook_sharepack_created ON lookbook_sharepack_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookbook_sharepack_kind ON lookbook_sharepack_events(kind);
CREATE INDEX IF NOT EXISTS idx_lookbook_sharepack_email ON lookbook_sharepack_events(requester_email);

-- =====================================================
-- HELPFUL VIEWS (ADAPTED FOR YOUR USERS TABLE)
-- =====================================================

-- View: Complete profile with user info
-- Uses CONCAT to combine first_name and last_name
CREATE OR REPLACE VIEW lookbook_profiles_complete AS
SELECT 
  p.*,
  CONCAT(u.first_name, ' ', u.last_name) as user_name,
  u.email as user_email,
  (
    SELECT json_agg(
      json_build_object(
        'id', e.id,
        'org', e.org,
        'role', e.role,
        'dateFrom', e.date_from,
        'dateTo', e.date_to,
        'summary', e.summary
      ) ORDER BY e.display_order
    )
    FROM lookbook_experience e
    WHERE e.profile_id = p.id
  ) as experience
FROM lookbook_profiles p
JOIN users u ON p.user_id = u.user_id;

-- View: Projects with participant details
CREATE OR REPLACE VIEW lookbook_projects_complete AS
SELECT 
  proj.*,
  (
    SELECT json_agg(
      json_build_object(
        'slug', prof.slug,
        'name', CONCAT(u.first_name, ' ', u.last_name),
        'title', prof.title,
        'photo_url', prof.photo_url,
        'role', pp.role
      ) ORDER BY pp.display_order
    )
    FROM lookbook_project_participants pp
    JOIN lookbook_profiles prof ON pp.profile_id = prof.id
    JOIN users u ON prof.user_id = u.user_id
  ) as participants
FROM lookbook_projects proj;

-- =====================================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
DROP TRIGGER IF EXISTS update_lookbook_profiles_updated_at ON lookbook_profiles;
CREATE TRIGGER update_lookbook_profiles_updated_at BEFORE UPDATE ON lookbook_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lookbook_projects_updated_at ON lookbook_projects;
CREATE TRIGGER update_lookbook_projects_updated_at BEFORE UPDATE ON lookbook_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that tables were created
SELECT 
  schemaname,
  tablename 
FROM pg_tables 
WHERE tablename LIKE 'lookbook_%' 
ORDER BY tablename;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Lookbook tables have been added to your segundo-db database.
-- They are designed to work with your existing users table structure.
-- =====================================================


-- Migration: Add initiatives table for project grouping/filtering
-- Run this on the segundo database

-- Create initiatives table
CREATE TABLE IF NOT EXISTS lookbook_initiatives (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cohort_value VARCHAR(255) UNIQUE NOT NULL, -- The value used to filter projects by cohort
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_initiatives_cohort ON lookbook_initiatives(cohort_value);
CREATE INDEX IF NOT EXISTS idx_initiatives_active ON lookbook_initiatives(is_active);

-- Insert the two default initiatives
INSERT INTO lookbook_initiatives (slug, name, description, cohort_value, display_order) 
VALUES 
  ('smb-winter-2025', 'SMB Winter 2025', 'Small and medium business innovation projects from our Winter 2025 cohort. These projects focus on solving real business challenges for SMB partners through AI-powered solutions and modern technology stacks.', 'SMB Winter 2025', 1),
  ('demo-day-fall-2025', 'Demo Day Fall 2025', 'AI-Native Builder projects showcased at our Fall 2025 Demo Day. These projects demonstrate cutting-edge AI integration and innovative solutions built by our talented cohort of builders.', 'Demo Day Fall 2025', 2)
ON CONFLICT (slug) DO NOTHING;

-- Grant permissions to lookbook_user_new
GRANT SELECT, INSERT, UPDATE, DELETE ON lookbook_initiatives TO lookbook_user_new;
GRANT USAGE, SELECT ON SEQUENCE lookbook_initiatives_id_seq TO lookbook_user_new;


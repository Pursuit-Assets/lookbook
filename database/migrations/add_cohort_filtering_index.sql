-- =====================================================
-- Performance Optimization: Add Composite Index for Cohort Filtering
-- =====================================================
-- This index optimizes queries that filter by status + cohort and order by created_at
-- This is the common pattern when filtering by initiatives (e.g., "SMB Winter 2025")
--
-- Query pattern optimized:
--   SELECT * FROM lookbook_projects 
--   WHERE status = 'active' AND cohort = 'SMB Winter 2025'
--   ORDER BY created_at DESC
--
-- The composite index allows PostgreSQL to:
--   1. Use the index to filter by status AND cohort in one scan
--   2. Return results already sorted by created_at DESC
--   3. Avoid sorting step entirely

-- Composite index for status + cohort + created_at ordering
-- This is the most efficient index for initiative filtering queries
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_status_cohort_created 
  ON lookbook_projects(status, cohort, created_at DESC)
  WHERE status = 'active';

-- Also add a partial index specifically for active projects with cohort
-- This is even more efficient since it only indexes active projects
-- and can be used when filtering by cohort
CREATE INDEX IF NOT EXISTS idx_lookbook_projects_active_cohort_created 
  ON lookbook_projects(cohort, created_at DESC)
  WHERE status = 'active';

-- Analyze the table to update query planner statistics
ANALYZE lookbook_projects;

-- Comments for documentation
COMMENT ON INDEX idx_lookbook_projects_status_cohort_created IS 
  'Composite index for filtering by status and cohort, ordered by created_at DESC. Optimizes initiative filtering queries.';

COMMENT ON INDEX idx_lookbook_projects_active_cohort_created IS 
  'Partial index for active projects filtered by cohort, ordered by created_at DESC. Most efficient for initiative filtering.';

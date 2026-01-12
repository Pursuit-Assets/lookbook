# SMB Filtering Performance Fix

## Problem
Filtering by "SMB Winter 2025" (or any initiative) was taking minutes to load. The query was extremely slow when filtering projects by cohort.

## Root Cause
The database query was filtering by:
- `status = 'active'` 
- `cohort = 'SMB Winter 2025'`
- Ordering by `created_at DESC`

While there were individual indexes on `status` and `cohort`, there was **no composite index** that could efficiently handle this common query pattern. PostgreSQL had to:
1. Use the cohort index to find matching rows
2. Filter by status
3. Sort by created_at

This resulted in slow query execution, especially with many projects.

## Solution
Added **composite indexes** optimized for this exact query pattern:

1. **`idx_lookbook_projects_status_cohort_created`**: Composite index on `(status, cohort, created_at DESC)` with a partial index filter for active projects
2. **`idx_lookbook_projects_active_cohort_created`**: Partial index on `(cohort, created_at DESC)` WHERE `status = 'active'`

These indexes allow PostgreSQL to:
- Filter by status AND cohort in a single index scan
- Return results already sorted by `created_at DESC`
- Avoid expensive sorting operations

## Files Changed

### 1. Database Migration
- **File**: `database/migrations/add_cohort_filtering_index.sql`
- **Purpose**: Creates the composite indexes for faster cohort filtering

### 2. Query Optimization
- **File**: `backend/queries/projectQueries.js`
- **Changes**: Added comments explaining index usage (query structure was already optimal)

### 3. Application Script
- **File**: `scripts/apply-cohort-index.sh`
- **Purpose**: Helper script to apply the migration

## How to Apply

### Option 1: Using the Script
```bash
cd /path/to/lookbook
./scripts/apply-cohort-index.sh
```

### Option 2: Manual Application
```bash
psql <your-database-connection-string> -f database/migrations/add_cohort_filtering_index.sql
```

### Option 3: Using Database Management Tool
Open `database/migrations/add_cohort_filtering_index.sql` and run it in your database management tool (pgAdmin, DBeaver, etc.)

## Expected Performance Improvement

### Before
- Query time: **60+ seconds** (or timeout)
- Database operations: Multiple index scans + sorting
- User experience: Minutes of loading time

### After
- Query time: **< 1 second** (with proper index)
- Database operations: Single index scan, no sorting needed
- User experience: Instant filtering

## Verification

After applying the migration, verify the indexes were created:

```sql
-- Check indexes on lookbook_projects
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'lookbook_projects' 
    AND indexname LIKE '%cohort%';
```

You should see:
- `idx_lookbook_projects_status_cohort_created`
- `idx_lookbook_projects_active_cohort_created`

## Testing

1. Apply the migration to your database
2. Click "SMB Winter 2025" in the sidebar
3. The projects should load **immediately** instead of taking minutes

## Additional Notes

- The indexes are **partial indexes** (only for `status = 'active'`), which makes them smaller and faster
- The query structure in `projectQueries.js` was already optimal - PostgreSQL will automatically use the best available index
- This fix benefits **all initiative filtering**, not just SMB Winter 2025
- The cache in `backend/routes/projects.js` will also help with subsequent requests

## Related Files

- `backend/queries/projectQueries.js` - Project query logic
- `backend/routes/projects.js` - API route with caching
- `frontend/src/pages/PersonDetailPage.jsx` - Frontend filtering logic
- `database/schema.sql` - Base schema with original indexes

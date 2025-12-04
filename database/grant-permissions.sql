-- =====================================================
-- GRANT PERMISSIONS FOR LOOKBOOK USER
-- =====================================================
-- This script grants the necessary permissions to the
-- lookbook_user_new database user to allow:
-- 1. Creating new users when creating profiles
-- 2. Updating user names when editing profiles
--
-- Run this as a database administrator (superuser)
-- =====================================================

-- Grant INSERT permission on users table (for creating new users)
GRANT INSERT ON TABLE public.users TO lookbook_user_new;

-- Grant UPDATE permission on users table (for updating user names)
GRANT UPDATE ON TABLE public.users TO lookbook_user_new;

-- Verify permissions were granted
SELECT 
  has_table_privilege('lookbook_user_new', 'public.users', 'INSERT') as can_insert,
  has_table_privilege('lookbook_user_new', 'public.users', 'UPDATE') as can_update;

-- Expected output:
-- can_insert | can_update
-- ------------+-----------
-- t          | t


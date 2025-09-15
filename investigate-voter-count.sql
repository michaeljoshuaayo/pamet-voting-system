-- Query to investigate why there are 116 voters instead of 115
-- Run this in your Supabase SQL Editor to find the extra voter(s)

-- Total count breakdown
SELECT 
  'Total Records' as category,
  COUNT(*) as count
FROM voter_profiles
UNION ALL
SELECT 
  'Admin Accounts' as category,
  COUNT(*) as count
FROM voter_profiles 
WHERE is_admin = true
UNION ALL
SELECT 
  'Regular Voters' as category,
  COUNT(*) as count
FROM voter_profiles 
WHERE is_admin = false
UNION ALL
SELECT 
  'Members with NULL member_id' as category,
  COUNT(*) as count
FROM voter_profiles 
WHERE member_id IS NULL
ORDER BY category;

-- Check for duplicate emails
SELECT 
  email,
  COUNT(*) as count
FROM voter_profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Check for duplicate member_ids
SELECT 
  member_id,
  COUNT(*) as count
FROM voter_profiles 
WHERE member_id IS NOT NULL
GROUP BY member_id 
HAVING COUNT(*) > 1;

-- List all voters with their details to identify any anomalies
SELECT 
  id,
  email,
  first_name,
  last_name,
  member_id,
  is_admin,
  created_at
FROM voter_profiles 
ORDER BY created_at, member_id;

-- Check for any users that might not have corresponding voter profiles
SELECT 
  COUNT(*) as auth_users_count
FROM auth.users;

SELECT 
  COUNT(*) as voter_profiles_count
FROM voter_profiles;

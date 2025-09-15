-- Part 1: Get the breakdown first
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

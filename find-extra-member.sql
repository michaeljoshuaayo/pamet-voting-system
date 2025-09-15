-- Find the extra voter - check member IDs to see if there's a gap or duplicate
SELECT 
  member_id,
  COUNT(*) as count
FROM voter_profiles 
WHERE is_admin = false
GROUP BY member_id 
ORDER BY CAST(member_id AS INTEGER);

-- Also check if there are any member IDs beyond 115
SELECT 
  member_id,
  first_name,
  last_name,
  email,
  created_at
FROM voter_profiles 
WHERE is_admin = false
AND CAST(member_id AS INTEGER) > 115
ORDER BY CAST(member_id AS INTEGER);

-- Check the highest member ID
SELECT 
  MAX(CAST(member_id AS INTEGER)) as highest_member_id,
  MIN(CAST(member_id AS INTEGER)) as lowest_member_id,
  COUNT(DISTINCT member_id) as unique_member_ids
FROM voter_profiles 
WHERE is_admin = false;

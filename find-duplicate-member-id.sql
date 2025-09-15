-- Find which member ID appears twice
SELECT 
  member_id,
  COUNT(*) as count,
  STRING_AGG(first_name || ' ' || last_name, ' AND ') as names,
  STRING_AGG(email, ' AND ') as emails
FROM voter_profiles 
WHERE is_admin = false
GROUP BY member_id 
HAVING COUNT(*) > 1
ORDER BY CAST(member_id AS INTEGER);

-- Show all details of the duplicate entries
SELECT 
  vp.id,
  vp.member_id,
  vp.first_name,
  vp.last_name,
  vp.email,
  vp.created_at
FROM voter_profiles vp
WHERE vp.is_admin = false
AND vp.member_id IN (
  SELECT member_id 
  FROM voter_profiles 
  WHERE is_admin = false
  GROUP BY member_id 
  HAVING COUNT(*) > 1
)
ORDER BY vp.member_id, vp.created_at;

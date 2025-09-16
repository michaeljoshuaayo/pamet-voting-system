-- Quick fix for Adiel's voter status
-- Run this to fix the immediate issue, then use the new secure function for future votes

-- Fix Adiel's status (and any other voters with the same issue)
UPDATE voter_profiles 
SET has_voted = true 
WHERE id IN (
  SELECT DISTINCT ev.voter_id 
  FROM election_votes ev 
  JOIN voter_profiles vp ON ev.voter_id = vp.id 
  WHERE NOT vp.has_voted AND NOT vp.is_admin
);

-- Verify the fix
SELECT 
  vp.first_name || ' ' || vp.last_name as voter_name,
  vp.has_voted,
  COUNT(ev.id) as votes_cast
FROM voter_profiles vp
LEFT JOIN election_votes ev ON vp.id = ev.voter_id
WHERE NOT vp.is_admin
GROUP BY vp.id, vp.first_name, vp.last_name, vp.has_voted
HAVING vp.has_voted = true OR COUNT(ev.id) > 0
ORDER BY vp.first_name;

-- Show current count
SELECT 
  COUNT(CASE WHEN has_voted THEN 1 END) as voters_marked_as_voted
FROM voter_profiles 
WHERE NOT is_admin;
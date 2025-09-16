-- Quick fix for voter status - simpler approach
-- This will show current status and fix any discrepancies immediately

-- Step 1: Check current voter status vs actual votes
SELECT 
  vp.first_name || ' ' || vp.last_name as voter_name,
  vp.has_voted,
  COUNT(ev.id) as votes_in_database,
  CASE 
    WHEN COUNT(ev.id) > 0 AND NOT vp.has_voted THEN '❌ NEEDS FIX'
    WHEN COUNT(ev.id) > 0 AND vp.has_voted THEN '✅ CORRECT'
    WHEN COUNT(ev.id) = 0 AND NOT vp.has_voted THEN '⏳ NOT VOTED'
    ELSE '❓ CHECK'
  END as status
FROM voter_profiles vp
LEFT JOIN election_votes ev ON vp.id = ev.voter_id
WHERE NOT vp.is_admin
GROUP BY vp.id, vp.first_name, vp.last_name, vp.has_voted
ORDER BY vp.first_name;

-- Step 2: Fix any voters who have votes but aren't marked as voted
UPDATE voter_profiles 
SET has_voted = true 
WHERE id IN (
  SELECT DISTINCT ev.voter_id 
  FROM election_votes ev 
  JOIN voter_profiles vp ON ev.voter_id = vp.id 
  WHERE NOT vp.has_voted AND NOT vp.is_admin
);

-- Step 3: Show the corrected results
SELECT 
  '✅ FIXED - Updated voter status for voters who had cast votes' as message,
  COUNT(*) as voters_updated
FROM voter_profiles vp
WHERE vp.has_voted = true 
  AND NOT vp.is_admin
  AND EXISTS (SELECT 1 FROM election_votes ev WHERE ev.voter_id = vp.id);

-- Step 4: Final count summary
SELECT 
  COUNT(*) as total_voters,
  COUNT(CASE WHEN has_voted THEN 1 END) as voters_marked_as_voted,
  (SELECT COUNT(DISTINCT voter_id) FROM election_votes ev 
   JOIN voter_profiles vp ON ev.voter_id = vp.id 
   WHERE NOT vp.is_admin) as actual_voters_with_votes
FROM voter_profiles 
WHERE NOT is_admin;
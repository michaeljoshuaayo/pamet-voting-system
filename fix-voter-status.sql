-- Fix voter status for users who have cast votes but aren't marked as has_voted = true
-- This addresses the issue where some voters have cast votes but has_voted = false

-- First, let's check the voter_profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'voter_profiles' 
ORDER BY ordinal_position;

-- Check current voter status and count their actual votes from the election_votes table
SELECT 
  vp.first_name, 
  vp.last_name, 
  vp.has_voted,
  COUNT(ev.id) as actual_votes_cast,
  CASE 
    WHEN COUNT(ev.id) > 0 AND NOT vp.has_voted THEN 'NEEDS UPDATE'
    WHEN COUNT(ev.id) > 0 AND vp.has_voted THEN 'CORRECT'
    WHEN COUNT(ev.id) = 0 AND NOT vp.has_voted THEN 'NOT VOTED'
    ELSE 'CHECK STATUS'
  END as status_check
FROM voter_profiles vp
LEFT JOIN election_votes ev ON vp.id = ev.voter_id
WHERE NOT vp.is_admin
GROUP BY vp.id, vp.first_name, vp.last_name, vp.has_voted
ORDER BY vp.first_name;

-- Update voters who have cast votes but aren't marked as having voted
UPDATE voter_profiles 
SET has_voted = true 
WHERE id IN (
  SELECT vp.id 
  FROM voter_profiles vp
  JOIN election_votes ev ON vp.id = ev.voter_id
  WHERE NOT vp.has_voted AND NOT vp.is_admin
  GROUP BY vp.id
  HAVING COUNT(ev.id) > 0
);

-- Verify the fix - show updated status
SELECT 
  vp.first_name, 
  vp.last_name, 
  vp.has_voted,
  COUNT(ev.id) as actual_votes_cast,
  'AFTER UPDATE' as check_time
FROM voter_profiles vp
LEFT JOIN election_votes ev ON vp.id = ev.voter_id
WHERE NOT vp.is_admin
GROUP BY vp.id, vp.first_name, vp.last_name, vp.has_voted
ORDER BY vp.first_name;

-- Count summary
SELECT 
  COUNT(*) as total_voters,
  COUNT(CASE WHEN has_voted THEN 1 END) as voters_marked_as_voted,
  (SELECT COUNT(DISTINCT voter_id) FROM election_votes ev JOIN voter_profiles vp ON ev.voter_id = vp.id WHERE NOT vp.is_admin) as voters_with_actual_votes
FROM voter_profiles 
WHERE NOT is_admin;
-- Part 2: Check for duplicates
SELECT 
  email,
  COUNT(*) as count
FROM voter_profiles 
GROUP BY email 
HAVING COUNT(*) > 1;

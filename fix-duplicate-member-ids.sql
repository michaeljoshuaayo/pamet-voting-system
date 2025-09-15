-- Fix duplicate member IDs by assigning new unique IDs
-- This will resolve the 116 vs 115 voter count issue

-- First, let's see what the next available member IDs should be
-- We have member IDs 1-115, but 52 and 53 are duplicated
-- So we'll assign 116 and 117 to the newer entries

-- Update Sean Darren A. Enguerra (the second entry with member_id 52) to member_id 116
UPDATE voter_profiles 
SET member_id = '116'
WHERE id = 'e9d68146-7125-4978-bc8f-4a3196bd08cd'
AND member_id = '52'
AND first_name = 'Sean Darren A.'
AND last_name = 'Enguerra';

-- Update Catalina F. Escoto (the second entry with member_id 53) to member_id 117  
UPDATE voter_profiles 
SET member_id = '117'
WHERE id = 'f0d9342b-19c4-4c15-955f-e956ab5e2399'
AND member_id = '53'
AND first_name = 'Catalina F.'
AND last_name = 'Escoto';

-- Verify the fix worked
SELECT 
  'After Fix - Total unique member IDs' as status,
  COUNT(DISTINCT member_id) as unique_count
FROM voter_profiles 
WHERE is_admin = false
UNION ALL
SELECT 
  'After Fix - Total regular voters' as status,
  COUNT(*) as total_count
FROM voter_profiles 
WHERE is_admin = false;

-- Double-check no duplicates remain
SELECT 
  member_id,
  COUNT(*) as count
FROM voter_profiles 
WHERE is_admin = false
GROUP BY member_id 
HAVING COUNT(*) > 1;

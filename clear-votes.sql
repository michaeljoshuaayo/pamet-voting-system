-- PAMET Voting System - Clear All Votes Script
-- WARNING: This will permanently delete all voting data!
-- Use with caution and make sure you have a backup

-- Clear all votes
DELETE FROM election_votes;

-- Reset candidate vote counts to 0
UPDATE candidates SET vote_count = 0;

-- Reset voter has_voted status
UPDATE voter_profiles SET has_voted = false WHERE is_admin = false;

-- Optional: Reset election settings (uncomment if needed)
-- UPDATE election_settings SET is_voting_open = false;

-- Verify the reset
SELECT 
    'Votes cleared' as action,
    (SELECT COUNT(*) FROM election_votes) as remaining_votes,
    (SELECT COUNT(*) FROM voter_profiles WHERE has_voted = true) as voters_who_voted,
    (SELECT SUM(vote_count) FROM candidates) as total_candidate_votes;
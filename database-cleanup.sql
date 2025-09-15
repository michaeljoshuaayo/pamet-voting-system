-- PAMET Sorsogon Chapter Election Database Cleanup Script
-- WARNING: This will delete ALL election data and tables!
-- Use this script when you want to completely reset the database

-- Drop all policies first (to avoid dependency issues)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.voter_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.voter_profiles;
DROP POLICY IF EXISTS "Everyone can view positions" ON public.positions;
DROP POLICY IF EXISTS "Only admins can manage positions" ON public.positions;
DROP POLICY IF EXISTS "Everyone can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Only admins can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can view their own votes" ON public.election_votes;
DROP POLICY IF EXISTS "Users can cast votes" ON public.election_votes;
DROP POLICY IF EXISTS "Admins can view all votes" ON public.election_votes;
DROP POLICY IF EXISTS "Everyone can view election settings" ON public.election_settings;
DROP POLICY IF EXISTS "Only admins can manage election settings" ON public.election_settings;

-- Drop all functions
DROP FUNCTION IF EXISTS create_voter_account(text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS increment_candidate_vote_count(uuid);
DROP FUNCTION IF EXISTS mark_voter_as_voted(uuid);

-- Drop all indexes
DROP INDEX IF EXISTS idx_voter_profiles_user_id;
DROP INDEX IF EXISTS idx_candidates_position_id;
DROP INDEX IF EXISTS idx_election_votes_voter_id;
DROP INDEX IF EXISTS idx_election_votes_position_id;
DROP INDEX IF EXISTS idx_election_votes_candidate_id;

-- Drop tables in proper order (respecting foreign key dependencies)
-- Drop dependent tables first
DROP TABLE IF EXISTS public.election_votes CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.election_settings CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.voter_profiles CASCADE;

-- Optional: Clean up auth users (CAREFUL! This removes ALL users)
-- Uncomment the line below ONLY if you want to delete all authentication users
-- DELETE FROM auth.users;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed successfully!';
    RAISE NOTICE 'All election tables, policies, functions, and indexes have been dropped.';
    RAISE NOTICE 'You can now run the database-setup.sql script to recreate everything.';
END $$;
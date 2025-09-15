-- PAMET Election System - Abstain Vote Tracking Update
-- Run this in your Supabase SQL Editor to add abstain vote counting functionality
-- This assumes you've already run the initial database-setup-new.sql

-- Function to get abstain votes count for a position
CREATE OR REPLACE FUNCTION public.get_abstain_votes_count(position_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  abstain_count integer;
BEGIN
  SELECT COUNT(*)
  INTO abstain_count
  FROM election_votes
  WHERE position_id = position_id_param
    AND candidate_id IS NULL;
  
  RETURN COALESCE(abstain_count, 0);
END;
$$;

-- Function to get total votes count for a position (including abstains)
CREATE OR REPLACE FUNCTION public.get_total_votes_count(position_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT COUNT(*)
  INTO total_count
  FROM election_votes
  WHERE position_id = position_id_param;
  
  RETURN COALESCE(total_count, 0);
END;
$$;

-- Function to get detailed voting statistics for a position
CREATE OR REPLACE FUNCTION public.get_position_voting_stats(position_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  candidate_votes integer;
  abstain_votes integer;
  total_votes integer;
  result json;
BEGIN
  -- Count votes for candidates (not abstains)
  SELECT COUNT(*)
  INTO candidate_votes
  FROM election_votes
  WHERE position_id = position_id_param
    AND candidate_id IS NOT NULL;
  
  -- Count abstain votes
  SELECT COUNT(*)
  INTO abstain_votes
  FROM election_votes
  WHERE position_id = position_id_param
    AND candidate_id IS NULL;
  
  -- Total votes
  total_votes := candidate_votes + abstain_votes;
  
  result := json_build_object(
    'candidate_votes', COALESCE(candidate_votes, 0),
    'abstain_votes', COALESCE(abstain_votes, 0),
    'total_votes', COALESCE(total_votes, 0)
  );
  
  RETURN result;
END;
$$;

-- Test the functions (optional - you can run this to verify they work)
-- SELECT get_abstain_votes_count((SELECT id FROM positions LIMIT 1));
-- SELECT get_total_votes_count((SELECT id FROM positions LIMIT 1));
-- SELECT get_position_voting_stats((SELECT id FROM positions LIMIT 1));
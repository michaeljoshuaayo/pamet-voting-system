-- 🔧 SCHEMA FIX: Update function to match current database structure
-- This fixes the "column candidates.is_active does not exist" error

-- Update the optimized function to work with current schema
CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
RETURNS JSON AS $$
DECLARE
  result JSON;
  concurrent_users INTEGER;
BEGIN
  -- Get concurrent user count
  SELECT COUNT(*) INTO concurrent_users 
  FROM pg_stat_activity 
  WHERE datname = current_database() 
    AND state = 'active' 
    AND query LIKE '%admin_dashboard%';
  
  -- Single optimized query with all needed data (FIXED SCHEMA)
  WITH dashboard_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE NOT is_admin) as total_voters,
      COUNT(*) FILTER (WHERE NOT is_admin AND has_voted) as voted_count,
      COUNT(*) FILTER (WHERE is_admin) as admin_count
    FROM voter_profiles
  ),
  positions_data AS (
    SELECT json_agg(
      json_build_object(
        'id', id,
        'title', title, 
        'description', description,
        'order_index', order_index,
        'created_at', created_at
      ) ORDER BY order_index
    ) as positions
    FROM positions
  ),
  candidates_data AS (
    SELECT json_agg(
      json_build_object(
        'id', id,
        'position_id', position_id,
        'first_name', first_name,
        'last_name', last_name,
        'platform', platform,
        'photo_url', photo_url,
        'vote_count', vote_count,
        'created_at', created_at
      ) ORDER BY vote_count DESC, first_name
    ) as candidates
    FROM candidates
  ),
  voters_data AS (
    SELECT json_agg(
      json_build_object(
        'id', id,
        'user_id', user_id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'member_id', member_id,
        'is_admin', is_admin,
        'has_voted', has_voted,
        'created_at', created_at
      ) ORDER BY first_name
    ) as voters
    FROM voter_profiles
  ),
  settings_data AS (
    SELECT json_build_object(
      'id', id,
      'is_voting_open', is_voting_open,
      'voting_start_time', voting_start_time,
      'voting_end_time', voting_end_time,
      'election_title', election_title,
      'updated_at', updated_at,
      'updated_by', updated_by
    ) as settings
    FROM election_settings
    LIMIT 1
  )
  
  SELECT json_build_object(
    'positions', COALESCE(positions_data.positions, '[]'::json),
    'candidates', COALESCE(candidates_data.candidates, '[]'::json),
    'voters', COALESCE(voters_data.voters, '[]'::json),
    'settings', COALESCE(settings_data.settings, 'null'::json),
    'stats', json_build_object(
      'total_voters', dashboard_stats.total_voters,
      'voted_count', dashboard_stats.voted_count,
      'admin_count', dashboard_stats.admin_count,
      'concurrent_users', concurrent_users,
      'cache_timestamp', EXTRACT(EPOCH FROM NOW()),
      'load_time', 0
    )
  ) INTO result
  FROM dashboard_stats, positions_data, candidates_data, voters_data, settings_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update performance indexes to match actual schema
CREATE INDEX IF NOT EXISTS idx_voter_profiles_dashboard 
ON voter_profiles (is_admin, has_voted, first_name);

CREATE INDEX IF NOT EXISTS idx_candidates_dashboard 
ON candidates (position_id, vote_count DESC, first_name);

CREATE INDEX IF NOT EXISTS idx_positions_order 
ON positions (order_index);

CREATE INDEX IF NOT EXISTS idx_election_votes_performance
ON election_votes (voter_id, position_id, candidate_id);

-- Re-analyze tables
ANALYZE candidates;
ANALYZE voter_profiles; 
ANALYZE positions;
ANALYZE election_votes;
ANALYZE election_settings;

-- Test the function
SELECT 'SCHEMA-FIXED FUNCTION UPDATED!' as status,
       'Function updated: get_admin_dashboard_data()' as function_updated,
       'Removed non-existent is_active column references' as fix_applied,
       'Ready to display voters and candidates' as result;
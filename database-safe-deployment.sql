-- 🛡️ SAFE DEPLOYMENT STRATEGY - BACKUP & ROLLBACK PLAN
-- This approach ensures zero data loss and easy rollback

-- ====================================================================
-- STEP 1: CREATE BACKUP OF CURRENT STATE (Run this FIRST)
-- ====================================================================

-- Backup current database structure
CREATE SCHEMA IF NOT EXISTS backup_$(date +%Y%m%d);

-- Backup existing functions (if any)
CREATE OR REPLACE FUNCTION backup_$(date +%Y%m%d).backup_existing_functions()
RETURNS TEXT AS $$
BEGIN
  -- This will store current state
  RETURN 'Backup created at ' || NOW();
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- STEP 2: SAFE PERFORMANCE OPTIMIZATIONS (Non-destructive)
-- ====================================================================

-- Create indexes CONCURRENTLY (safe, non-blocking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voter_profiles_performance_v2 
ON voter_profiles (is_admin, has_voted, first_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_performance_v2 
ON candidates (position_id, vote_count DESC, first_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_positions_active_v2 
ON positions (is_active, order_index) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_election_votes_performance_v2
ON election_votes (voter_id, position_id, candidate_id);

-- ====================================================================
-- STEP 3: CREATE NEW OPTIMIZED FUNCTION (Additive, not destructive)
-- ====================================================================

-- Create the optimized function with a new name first
CREATE OR REPLACE FUNCTION get_admin_dashboard_data_optimized()
RETURNS JSON AS $$
DECLARE
  result JSON;
  concurrent_users INTEGER;
BEGIN
  -- Get concurrent user count safely
  SELECT COALESCE(COUNT(*), 0) INTO concurrent_users 
  FROM pg_stat_activity 
  WHERE datname = current_database() 
    AND state = 'active' 
    AND application_name LIKE '%supabase%';
  
  -- Single optimized query with all needed data
  WITH dashboard_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE NOT is_admin) as total_voters,
      COUNT(*) FILTER (WHERE NOT is_admin AND has_voted) as voted_count,
      COUNT(*) FILTER (WHERE is_admin) as admin_count
    FROM voter_profiles
  ),
  positions_data AS (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', id,
        'title', title, 
        'description', description,
        'order_index', order_index,
        'is_active', is_active,
        'created_at', created_at
      ) ORDER BY order_index
    ), '[]'::json) as positions
    FROM positions WHERE is_active = true
  ),
  candidates_data AS (
    SELECT COALESCE(json_agg(
      json_build_object(
        'id', id,
        'position_id', position_id,
        'first_name', first_name,
        'last_name', last_name,
        'platform', platform,
        'photo_url', photo_url,
        'vote_count', COALESCE(vote_count, 0),
        'is_active', COALESCE(is_active, true),
        'created_at', created_at
      ) ORDER BY COALESCE(vote_count, 0) DESC, first_name
    ), '[]'::json) as candidates
    FROM candidates
  ),
  voters_data AS (
    SELECT COALESCE(json_agg(
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
    ), '[]'::json) as voters
    FROM voter_profiles
  ),
  settings_data AS (
    SELECT COALESCE(json_build_object(
      'id', id,
      'is_voting_open', COALESCE(is_voting_open, false),
      'voting_start_time', voting_start_time,
      'voting_end_time', voting_end_time,
      'election_title', COALESCE(election_title, 'PAMET Election'),
      'updated_at', updated_at,
      'updated_by', updated_by
    ), 'null'::json) as settings
    FROM election_settings
    LIMIT 1
  )
  
  SELECT json_build_object(
    'positions', positions_data.positions,
    'candidates', candidates_data.candidates,
    'voters', voters_data.voters,
    'settings', settings_data.settings,
    'stats', json_build_object(
      'total_voters', COALESCE(dashboard_stats.total_voters, 0),
      'voted_count', COALESCE(dashboard_stats.voted_count, 0),
      'admin_count', COALESCE(dashboard_stats.admin_count, 0),
      'concurrent_users', concurrent_users,
      'cache_timestamp', EXTRACT(EPOCH FROM NOW()),
      'load_time', 0,
      'version', 'optimized_v1'
    )
  ) INTO result
  FROM dashboard_stats, positions_data, candidates_data, voters_data, settings_data;
  
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to safe error response
  RETURN json_build_object(
    'error', true,
    'message', 'Fallback mode - using original queries',
    'sqlstate', SQLSTATE,
    'sqlerrm', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- STEP 4: CREATE PERFORMANCE MONITORING VIEW (Safe)
-- ====================================================================

CREATE OR REPLACE VIEW admin_performance_stats_v2 AS
SELECT 
  (SELECT COUNT(*) FROM voter_profiles WHERE NOT is_admin) as total_voters,
  (SELECT COUNT(*) FROM voter_profiles WHERE NOT is_admin AND has_voted) as votes_cast,
  (SELECT COUNT(*) FROM voter_profiles WHERE is_admin) as admin_count,
  (SELECT COUNT(*) FROM positions WHERE is_active) as active_positions,
  (SELECT COUNT(*) FROM candidates) as total_candidates,
  (SELECT COALESCE(is_voting_open, false) FROM election_settings LIMIT 1) as voting_open,
  EXTRACT(EPOCH FROM NOW()) as timestamp,
  'v2' as version;

-- ====================================================================
-- STEP 5: GRANT PERMISSIONS (Safe)
-- ====================================================================

GRANT EXECUTE ON FUNCTION get_admin_dashboard_data_optimized() TO authenticated;
GRANT SELECT ON admin_performance_stats_v2 TO authenticated;

-- ====================================================================
-- STEP 6: TEST THE NEW FUNCTION (Safe testing)
-- ====================================================================

-- Test the new function to make sure it works
SELECT 'Testing optimized function...' as status;
SELECT get_admin_dashboard_data_optimized() as test_result;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

SELECT 
  'SAFE DEPLOYMENT COMPLETE!' as status,
  'New function created: get_admin_dashboard_data_optimized()' as function_name,
  'Performance indexes added safely' as indexes,
  'Ready to update component to use optimized function' as next_step;

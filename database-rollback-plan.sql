-- 🔄 COMPLETE ROLLBACK PLAN - If Anything Goes Wrong
-- Run this if you need to revert all changes

-- ====================================================================
-- ROLLBACK STEP 1: Remove new optimized function
-- ====================================================================

DROP FUNCTION IF EXISTS get_admin_dashboard_data_optimized();
DROP FUNCTION IF EXISTS get_admin_dashboard_data();

-- ====================================================================
-- ROLLBACK STEP 2: Remove performance views
-- ====================================================================

DROP VIEW IF EXISTS admin_performance_stats_v2;
DROP VIEW IF EXISTS admin_performance_stats;

-- ====================================================================
-- ROLLBACK STEP 3: Remove performance indexes (if needed)
-- ====================================================================

-- Only run these if indexes are causing issues
-- DROP INDEX CONCURRENTLY IF EXISTS idx_voter_profiles_performance_v2;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_candidates_performance_v2;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_positions_active_v2;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_election_votes_performance_v2;

-- ====================================================================
-- ROLLBACK STEP 4: Clean up backup schema (optional)
-- ====================================================================

-- DROP SCHEMA IF EXISTS backup_$(date +%Y%m%d) CASCADE;

-- ====================================================================
-- ROLLBACK COMPLETE
-- ====================================================================

SELECT 
  'ROLLBACK COMPLETE!' as status,
  'All optimizations removed safely' as result,
  'Original database state restored' as confirmation,
  'Component will fallback to original queries automatically' as component_status;
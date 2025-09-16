-- Database Performance Optimization for PAMET Voting System
-- Add indexes to improve query performance

-- Indexes for faster data retrieval
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_first_name ON candidates(first_name);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_user_id ON voter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_email ON voter_profiles(email);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_is_admin ON voter_profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_voter_profiles_has_voted ON voter_profiles(has_voted);
CREATE INDEX IF NOT EXISTS idx_election_votes_voter_id ON election_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate_id ON election_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_position_id ON election_votes(position_id);
CREATE INDEX IF NOT EXISTS idx_positions_order_index ON positions(order_index);
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_voter_profiles_admin_voted ON voter_profiles(is_admin, has_voted);
CREATE INDEX IF NOT EXISTS idx_election_votes_voter_position ON election_votes(voter_id, position_id);

-- Optimized view for admin dashboard data
CREATE OR REPLACE VIEW admin_dashboard_summary AS
SELECT 
  (SELECT COUNT(*) FROM voter_profiles WHERE NOT is_admin) as total_voters,
  (SELECT COUNT(*) FROM voter_profiles WHERE NOT is_admin AND has_voted) as votes_cast,
  (SELECT COUNT(*) FROM voter_profiles WHERE is_admin) as admin_count,
  (SELECT COUNT(*) FROM positions WHERE is_active) as active_positions,
  (SELECT COUNT(*) FROM candidates) as total_candidates,
  (SELECT is_voting_open FROM election_settings LIMIT 1) as voting_open;

-- Optimized function to get voter statistics
CREATE OR REPLACE FUNCTION get_voter_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_voters', COUNT(*) FILTER (WHERE NOT is_admin),
    'votes_cast', COUNT(*) FILTER (WHERE NOT is_admin AND has_voted),
    'admin_count', COUNT(*) FILTER (WHERE is_admin),
    'voting_percentage', 
      CASE 
        WHEN COUNT(*) FILTER (WHERE NOT is_admin) > 0 
        THEN ROUND(
          (COUNT(*) FILTER (WHERE NOT is_admin AND has_voted)::decimal / 
           COUNT(*) FILTER (WHERE NOT is_admin)) * 100, 2
        )
        ELSE 0 
      END
  )
  INTO result
  FROM voter_profiles;
  
  RETURN result;
END;
$$;

-- Optimized function to get position results with candidate vote counts
CREATE OR REPLACE FUNCTION get_position_results()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  WITH position_votes AS (
    SELECT 
      p.id as position_id,
      p.title as position_title,
      p.order_index,
      c.id as candidate_id,
      c.first_name,
      c.last_name,
      c.platform,
      c.photo_url,
      COUNT(ev.id) as vote_count,
      COUNT(ev_abstain.id) as abstain_count
    FROM positions p
    LEFT JOIN candidates c ON c.position_id = p.id
    LEFT JOIN election_votes ev ON ev.candidate_id = c.id
    LEFT JOIN election_votes ev_abstain ON ev_abstain.position_id = p.id AND ev_abstain.candidate_id IS NULL
    WHERE p.is_active = true
    GROUP BY p.id, p.title, p.order_index, c.id, c.first_name, c.last_name, c.platform, c.photo_url
    ORDER BY p.order_index, c.first_name
  )
  SELECT json_agg(
    json_build_object(
      'position_id', position_id,
      'position_title', position_title,
      'order_index', order_index,
      'candidates', candidates,
      'abstain_count', abstain_count
    )
  )
  INTO result
  FROM (
    SELECT 
      position_id,
      position_title,
      order_index,
      json_agg(
        json_build_object(
          'id', candidate_id,
          'first_name', first_name,
          'last_name', last_name,
          'platform', platform,
          'photo_url', photo_url,
          'vote_count', vote_count
        ) ORDER BY vote_count DESC, first_name
      ) FILTER (WHERE candidate_id IS NOT NULL) as candidates,
      MAX(abstain_count) as abstain_count
    FROM position_votes
    GROUP BY position_id, position_title, order_index
    ORDER BY order_index
  ) grouped_results;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Enable Row Level Security (RLS) policies for better performance
ALTER TABLE voter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voters (they can only see their own data)
CREATE POLICY "Voters can view their own profile" ON voter_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Voters can update their own profile" ON voter_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for votes (voters can only see their own votes)
CREATE POLICY "Voters can view their own votes" ON election_votes
  FOR SELECT USING (
    voter_id IN (
      SELECT id FROM voter_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Voters can insert their own votes" ON election_votes
  FOR INSERT WITH CHECK (
    voter_id IN (
      SELECT id FROM voter_profiles WHERE user_id = auth.uid()
    )
  );

-- Public read access for positions and candidates
CREATE POLICY "Anyone can view active positions" ON positions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view candidates" ON candidates
  FOR SELECT USING (true);

-- Admin policies (admins can do everything)
CREATE POLICY "Admins have full access to voter_profiles" ON voter_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM voter_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins have full access to election_votes" ON election_votes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM voter_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins have full access to positions" ON positions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM voter_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins have full access to candidates" ON candidates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM voter_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
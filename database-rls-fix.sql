-- PAMET Sorsogon Chapter Election System Database Fix
-- This script fixes the RLS policy infinite recursion issue

-- First, drop all existing policies to fix the recursion
DROP POLICY IF EXISTS "Public read access for positions" ON positions;
DROP POLICY IF EXISTS "Admin full access to positions" ON positions;
DROP POLICY IF EXISTS "Public read access for candidates" ON candidates;
DROP POLICY IF EXISTS "Admin full access to candidates" ON candidates;
DROP POLICY IF EXISTS "Users can read own profile" ON voter_profiles;
DROP POLICY IF EXISTS "Admin can manage voter profiles" ON voter_profiles;
DROP POLICY IF EXISTS "Users can manage own votes" ON election_votes;
DROP POLICY IF EXISTS "Admin can read all votes" ON election_votes;
DROP POLICY IF EXISTS "Admin can manage election settings" ON election_settings;

-- Create improved RLS Policies without circular references

-- Positions: Public read access
CREATE POLICY "Everyone can read positions" ON positions FOR SELECT USING (true);

-- Candidates: Public read access  
CREATE POLICY "Everyone can read candidates" ON candidates FOR SELECT USING (true);

-- Voter profiles: Users can read their own profile, service role can manage all
CREATE POLICY "Users can read own profile" ON voter_profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all voter profiles" ON voter_profiles 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow authenticated users to read voter profiles for admin checks
CREATE POLICY "Authenticated users can read voter profiles for admin checks" ON voter_profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Election votes: Users can insert their own votes, service role can manage all
CREATE POLICY "Users can insert own votes" ON election_votes 
FOR INSERT 
WITH CHECK (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.id = election_votes.voter_id)
);

CREATE POLICY "Users can read own votes" ON election_votes 
FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.id = election_votes.voter_id)
);

CREATE POLICY "Service role can manage all votes" ON election_votes 
FOR ALL 
USING (auth.role() = 'service_role');

-- Election settings: Public read, service role can manage
CREATE POLICY "Everyone can read election settings" ON election_settings FOR SELECT USING (true);
CREATE POLICY "Service role can manage election settings" ON election_settings 
FOR ALL 
USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON positions TO authenticated;
GRANT SELECT ON candidates TO authenticated;
GRANT SELECT, INSERT ON voter_profiles TO authenticated;
GRANT SELECT, INSERT ON election_votes TO authenticated;
GRANT SELECT ON election_settings TO authenticated;

-- Additional grants for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

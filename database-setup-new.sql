-- PAMET Sorsogon Chapter Election System Database Setup
-- Run this in your Supabase SQL Editor

-- Create positions table
CREATE TABLE positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create candidates table
CREATE TABLE candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  platform text,
  photo_url text,
  vote_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create voter_profiles table
CREATE TABLE voter_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  contact_number text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  member_id text,
  is_admin boolean DEFAULT false,
  has_voted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create election_votes table
CREATE TABLE election_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id uuid REFERENCES voter_profiles(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL,
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(voter_id, position_id)
);

-- Create election_settings table
CREATE TABLE election_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active boolean DEFAULT false,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert actual PAMET Sorsogon Chapter positions and candidates
INSERT INTO positions (title, description, order_index) VALUES
('President', 'Chief Executive Officer of the chapter', 1),
('Vice President', 'Second in command and support to the President', 2),
('Secretary', 'Records keeper and correspondence manager', 3),
('Auditor', 'Financial auditor and compliance officer', 4),
('Treasurer', 'Financial manager and budget oversight', 5),
('Public Information Officer - JUCASOM', 'Communications and public relations for Junior Chamber of Sonographers', 6),
('Public Information Officer - BIMS', 'Communications and public relations for Biomedical Imaging and Medical Sonography', 7),
('Public Information Officer - GUIPRIBAR', 'Communications and public relations for Guild of Professional Radiologic Technologists', 8),
('Public Information Officer - CSOLAR', 'Communications and public relations for Council of Licensed Radiologic Technologists', 9);

-- Insert candidates based on the official list with correct facilities from member data
INSERT INTO candidates (position_id, first_name, last_name, platform, photo_url) VALUES
-- President
((SELECT id FROM positions WHERE title = 'President'), 'Aileen', 'Lopez', 'Metro Health Specialists Hospital', '/candidates/Aileen.jpg'),

-- Vice President
((SELECT id FROM positions WHERE title = 'Vice President'), 'Claire', 'Carrascal', 'Sorsogon Provincial Hospital-FHS', '/candidates/Claire.jpg'),
((SELECT id FROM positions WHERE title = 'Vice President'), 'Joseph', 'Gillego', 'Metro Health Specialists Hospital Inc.', NULL),

-- Secretary
((SELECT id FROM positions WHERE title = 'Secretary'), 'Maria Theresa', 'Baylon', 'RHU Barcelona', NULL),
((SELECT id FROM positions WHERE title = 'Secretary'), 'Arnold Kenneth', 'Borromeo', 'Sorsogon Provincial Hospital', '/candidates/Arnold.jpg'),

-- Auditor
((SELECT id FROM positions WHERE title = 'Auditor'), 'Evelyn', 'Lee', 'Irosin District Hospital', '/candidates/Evelyn.jpg'),

-- Treasurer
((SELECT id FROM positions WHERE title = 'Treasurer'), 'Mairie Gelyne', 'Garalde', 'Gubat Distict Hospital/SPH', NULL),

-- JUCASOM (now PIO - JUCASOM)
((SELECT id FROM positions WHERE title = 'Public Information Officer - JUCASOM'), 'Rean', 'Gracilla', 'RHU Juban', NULL),
((SELECT id FROM positions WHERE title = 'Public Information Officer - JUCASOM'), 'Norlane Jane', 'Hao', 'Donsol District Hospital/SPH', '/candidates/Norlane.jpg'),

-- BIMS (now PIO - BIMS)
((SELECT id FROM positions WHERE title = 'Public Information Officer - BIMS'), 'Mernadith', 'Garcera', 'Matnog Medicare Hospital', '/candidates/Meredith.jpg'),
((SELECT id FROM positions WHERE title = 'Public Information Officer - BIMS'), 'Jan Albert', 'Apuhin', 'Irosin District Hospital', NULL),

-- GUIPRIBAR (now PIO - GUIPRIBAR)
((SELECT id FROM positions WHERE title = 'Public Information Officer - GUIPRIBAR'), 'Patrick Lorenz', 'Garcera', 'Gubat Distict Hospital', '/candidates/Patrick.jpg'),

-- CSOLAR (now PIO - CSOLAR)
((SELECT id FROM positions WHERE title = 'Public Information Officer - CSOLAR'), 'Ivy Gail', 'Bajamundi', 'Castilla District Hospital', NULL);

-- Note: Run pamet-members-insert.sql separately to add all 115 PAMET members as voters

-- Enable Row Level Security (RLS)
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Positions: Public read, admin write
CREATE POLICY "Public read access for positions" ON positions FOR SELECT USING (true);
CREATE POLICY "Admin full access to positions" ON positions FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.is_admin = true)
);

-- Candidates: Public read, admin write
CREATE POLICY "Public read access for candidates" ON candidates FOR SELECT USING (true);
CREATE POLICY "Admin full access to candidates" ON candidates FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.is_admin = true)
);

-- Voter profiles: Users can read own, admin can manage all
CREATE POLICY "Users can read own profile" ON voter_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can manage voter profiles" ON voter_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles vp WHERE vp.user_id = auth.uid() AND vp.is_admin = true)
);

-- Election_votes: Users can manage own votes, admin can read all
CREATE POLICY "Users can manage own votes" ON election_votes FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.id = election_votes.voter_id)
);
CREATE POLICY "Admin can read all votes" ON election_votes FOR SELECT USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.is_admin = true)
);

-- Election settings: Admin only
CREATE POLICY "Admin can manage election settings" ON election_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.is_admin = true)
);

-- Insert initial election settings
INSERT INTO election_settings (is_active) VALUES (false);

-- Create functions for vote management
CREATE OR REPLACE FUNCTION increment_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if candidate_id is not null (not an abstain vote)
  IF NEW.candidate_id IS NOT NULL THEN
    UPDATE candidates 
    SET vote_count = vote_count + 1 
    WHERE id = NEW.candidate_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrement if candidate_id is not null (not an abstain vote)
  IF OLD.candidate_id IS NOT NULL THEN
    UPDATE candidates 
    SET vote_count = vote_count - 1 
    WHERE id = OLD.candidate_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for vote counting
CREATE TRIGGER trigger_increment_vote_count
  AFTER INSERT ON election_votes
  FOR EACH ROW
  EXECUTE FUNCTION increment_vote_count();

CREATE TRIGGER trigger_decrement_vote_count
  AFTER DELETE ON election_votes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_vote_count();

-- Function to create voter account
CREATE OR REPLACE FUNCTION public.create_voter_account(
  email_param text,
  password_param text,
  first_name_param text,
  last_name_param text,
  member_id_param text DEFAULT NULL,
  is_admin_param boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email_param,
    crypt(password_param, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "manual", "providers": ["manual"]}',
    '{}',
    false,
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO user_id;

  -- Create voter profile
  INSERT INTO public.voter_profiles (
    user_id,
    email,
    first_name,
    last_name,
    member_id,
    is_admin
  ) VALUES (
    user_id,
    email_param,
    first_name_param,
    last_name_param,
    member_id_param,
    is_admin_param
  );

  result := json_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'Voter account created successfully'
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN result;
END;
$$;

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

-- PAMET Sorsogon Chapter Election Database Setup
-- Copy and paste this into your Supabase SQL editor

-- Create custom user profiles table for voters
CREATE TABLE IF NOT EXISTS public.voter_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    member_id text UNIQUE,
    is_admin boolean DEFAULT false,
    has_voted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create positions table (President, Vice President, etc.)
CREATE TABLE IF NOT EXISTS public.positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL UNIQUE,
    description text,
    order_index integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    platform text,
    photo_url text,
    vote_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.election_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    voter_id uuid NOT NULL REFERENCES public.voter_profiles(id) ON DELETE CASCADE,
    position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
    candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(voter_id, position_id) -- One vote per position per voter
);

-- Create election settings table
CREATE TABLE IF NOT EXISTS public.election_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    is_voting_open boolean DEFAULT false,
    voting_start_time timestamp with time zone,
    voting_end_time timestamp with time zone,
    election_title text DEFAULT 'PAMET Sorsogon Chapter Election',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by uuid REFERENCES public.voter_profiles(id)
);

-- Function to create voter account (simplified - no email confirmation)
CREATE OR REPLACE FUNCTION create_voter_account(
    voter_email text,
    voter_password text,
    voter_first_name text,
    voter_last_name text,
    voter_member_id text DEFAULT NULL,
    make_admin boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Create auth user with email confirmed automatically
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_sent_at
    ) VALUES (
        gen_random_uuid(),
        voter_email,
        crypt(voter_password, gen_salt('bf')),
        now(), -- Auto-confirm email
        now(),
        now(),
        now()
    ) RETURNING id INTO new_user_id;

    -- Create voter profile
    INSERT INTO public.voter_profiles (
        user_id,
        email,
        first_name,
        last_name,
        member_id,
        is_admin
    ) VALUES (
        new_user_id,
        voter_email,
        voter_first_name,
        voter_last_name,
        voter_member_id,
        make_admin
    );

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION increment_candidate_vote_count(candidate_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.candidates 
    SET vote_count = vote_count + 1 
    WHERE id = candidate_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark voter as voted
CREATE OR REPLACE FUNCTION mark_voter_as_voted(voter_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.voter_profiles 
    SET has_voted = true 
    WHERE id = voter_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE public.voter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.election_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voter_profiles
CREATE POLICY "Users can view their own profile" ON public.voter_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.voter_profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Users can update their own profile" ON public.voter_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert voter profiles" ON public.voter_profiles FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update all profiles" ON public.voter_profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS Policies for positions
CREATE POLICY "Everyone can view positions" ON public.positions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage positions" ON public.positions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS Policies for candidates
CREATE POLICY "Everyone can view candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Only admins can manage candidates" ON public.candidates FOR ALL USING (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS Policies for election_votes
CREATE POLICY "Users can view their own votes" ON public.election_votes FOR SELECT USING (
    voter_id IN (SELECT id FROM public.voter_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can cast votes" ON public.election_votes FOR INSERT WITH CHECK (
    voter_id IN (SELECT id FROM public.voter_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can view all votes" ON public.election_votes FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- RLS Policies for election_settings
CREATE POLICY "Everyone can view election settings" ON public.election_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage election settings" ON public.election_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.voter_profiles WHERE user_id = auth.uid() AND is_admin = true)
);

-- Insert default positions
INSERT INTO public.positions (title, description, order_index) VALUES
('President', 'Chapter President', 1),
('Vice President', 'Chapter Vice President', 2),
('Secretary', 'Chapter Secretary', 3),
('Treasurer', 'Chapter Treasurer', 4),
('Auditor', 'Chapter Auditor', 5),
('PRO', 'Public Relations Officer', 6)
ON CONFLICT (title) DO NOTHING;

-- Insert default election settings
INSERT INTO public.election_settings (is_voting_open, election_title) VALUES
(false, 'PAMET Sorsogon Chapter Election 2025')
ON CONFLICT DO NOTHING;

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_voter_profiles_user_id ON public.voter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position_id ON public.candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_voter_id ON public.election_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_position_id ON public.election_votes(position_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate_id ON public.election_votes(candidate_id);

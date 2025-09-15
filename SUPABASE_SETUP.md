# 🚀 Supabase Setup Guide

## Issue Found
Your current Supabase URL `uzmtwshcjoyugjpjjtpe.supabase.co` is not resolving (domain doesn't exist).

## Steps to Fix:

### 1. Check Existing Project
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in to your account
3. Check if your project exists

### 2. If Project Exists - Update Credentials
1. Go to **Settings** → **API**
2. Copy the **Project URL**
3. Copy the **anon/public** key
4. Update your `.env.local` file

### 3. If Project Doesn't Exist - Create New One
1. Click **"New Project"**
2. Choose organization
3. Set project name: `pamet-voting-system`
4. Set password (remember this!)
5. Choose region closest to you
6. Click **"Create new project"**

### 4. Setup Database Schema
After creating project, go to **SQL Editor** and run:

```sql
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
  vote_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create voter_profiles table
CREATE TABLE voter_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  member_id text,
  is_admin boolean DEFAULT false,
  has_voted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create votes table
CREATE TABLE votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_id uuid REFERENCES voter_profiles(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(voter_id, candidate_id)
);

-- Create election_settings table
CREATE TABLE election_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active boolean DEFAULT false,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default positions
INSERT INTO positions (title, description, order_index) VALUES
('President', 'Chief Executive Officer of the chapter', 1),
('Vice President', 'Second in command and support to the President', 2),
('Secretary', 'Records keeper and correspondence manager', 3),
('Treasurer', 'Financial manager and budget oversight', 4),
('Auditor', 'Financial auditor and compliance officer', 5),
('Public Relations Officer', 'Communications and public relations', 6),
('Board Member 1', 'Board of Directors Member Position 1', 7),
('Board Member 2', 'Board of Directors Member Position 2', 8);

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access for positions" ON positions FOR SELECT USING (true);
CREATE POLICY "Public read access for candidates" ON candidates FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON positions FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.is_admin = true)
);
CREATE POLICY "Admin full access" ON candidates FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles WHERE voter_profiles.user_id = auth.uid() AND voter_profiles.is_admin = true)
);
CREATE POLICY "Users can read own profile" ON voter_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can manage voter profiles" ON voter_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM voter_profiles vp WHERE vp.user_id = auth.uid() AND vp.is_admin = true)
);
```

### 5. Update Environment Variables
Update your `.env.local` with the new credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT_URL.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_SERVICE_ROLE_KEY
```

### 6. Test Connection
After updating, restart your dev server:
```bash
npm run dev
```

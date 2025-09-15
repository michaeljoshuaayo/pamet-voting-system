-- Fix election_settings table schema
-- This script ensures the table has the correct columns expected by the application

-- First, check if the table exists and has the wrong schema
-- If the table exists with wrong columns, we'll drop and recreate it
-- If it doesn't exist, we'll create it with the correct schema

-- Drop the table if it exists with wrong schema
DROP TABLE IF EXISTS public.election_settings;

-- Create election_settings table with correct schema
CREATE TABLE public.election_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    is_voting_open boolean DEFAULT false,
    voting_start_time timestamp with time zone,
    voting_end_time timestamp with time zone,
    election_title text DEFAULT 'PAMET Sorsogon Chapter Election',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by uuid REFERENCES public.voter_profiles(id)
);

-- Insert a default settings record
INSERT INTO public.election_settings (
    is_voting_open,
    election_title,
    updated_at
) VALUES (
    false,
    'PAMET Sorsogon Chapter Election 2025',
    timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.election_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for election_settings
-- Allow read access to authenticated users
CREATE POLICY "Allow read access to election_settings" ON public.election_settings
    FOR SELECT TO authenticated USING (true);

-- Allow admins to update election settings
CREATE POLICY "Allow admin update to election_settings" ON public.election_settings
    FOR UPDATE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.voter_profiles 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

-- Allow admins to insert election settings
CREATE POLICY "Allow admin insert to election_settings" ON public.election_settings
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.voter_profiles 
            WHERE user_id = auth.uid() AND is_admin = true
        )
    );

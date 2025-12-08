-- RLS Policies for bookings table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- First, drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated inserts" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Photographers can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Photographers can view all" ON bookings;
DROP POLICY IF EXISTS "Photographers can update all bookings" ON bookings;
DROP POLICY IF EXISTS "Photographers can update all" ON bookings;

-- Enable RLS on bookings table (if not already enabled)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow ANY authenticated user to insert bookings
-- This is the simplest policy - just checks if user is logged in
CREATE POLICY "Allow authenticated inserts"
ON bookings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow users to view bookings where email matches their auth email
CREATE POLICY "Users can view own bookings"
ON bookings
FOR SELECT
TO authenticated
USING (
  email = (SELECT email::text FROM auth.users WHERE id = auth.uid())
);

-- Policy 3: Allow users to update their own bookings
CREATE POLICY "Users can update own bookings"
ON bookings
FOR UPDATE
TO authenticated
USING (
  email = (SELECT email::text FROM auth.users WHERE id = auth.uid())
);

-- Policy 4: Allow photographers/admins to view all bookings
CREATE POLICY "Photographers can view all"
ON bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role' = 'photographer' OR raw_user_meta_data->>'role' = 'admin')
  )
);

-- Policy 5: Allow photographers/admins to update all bookings
CREATE POLICY "Photographers can update all"
ON bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role' = 'photographer' OR raw_user_meta_data->>'role' = 'admin')
  )
);


-- Fix booking policies
-- Run this in Supabase SQL Editor

-- Add a SELECT policy so users can read their own bookings after insert
CREATE POLICY "Users can select own bookings"
ON bookings
FOR SELECT
TO authenticated
USING (
  email = (SELECT email::text FROM auth.users WHERE id = auth.uid())
);

-- Also allow anon to select (if needed for your use case)
-- CREATE POLICY "Anon can select bookings"
-- ON bookings
-- FOR SELECT
-- TO anon
-- USING (true);


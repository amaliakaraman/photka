-- Fix RLS policy to allow welcome messages and AI support messages
-- The welcome message is inserted with sender_id = AI_SUPPORT_UUID
-- But the current policy requires auth.uid() = sender_id, which fails

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Create new insert policy that allows:
-- 1. Users sending their own messages (auth.uid() = sender_id)
-- 2. AI support messages in user's support booking (sender_id = AI UUID, booking matches user's support booking)
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can send their own messages
    auth.uid() = sender_id
    OR
    -- Allow AI support messages in user's support booking
    (sender_id = '00000000-0000-0000-0000-000000000001'::uuid 
     AND receiver_id IS NULL 
     AND booking_id::text = ('00000000-0000-0000-0000-' || substring(auth.uid()::text from 25)))
  );

-- Also update the SELECT policy to ensure users can see AI messages in their support chat
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Allow AI support messages" ON messages;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- User can see messages they sent
    auth.uid() = sender_id
    OR
    -- User can see messages sent to them
    auth.uid() = receiver_id
    OR
    -- User can see messages in their support booking (receiver_id is NULL for support)
    (receiver_id IS NULL 
     AND booking_id::text = ('00000000-0000-0000-0000-' || substring(auth.uid()::text from 25)))
  );


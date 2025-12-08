-- Fix RLS policies for support chat messages
-- The AI support UUID (00000000-0000-0000-0000-000000000001) doesn't exist in auth.users
-- So we need to allow messages where receiver_id is this special UUID

-- First, drop the foreign key constraint on receiver_id (or make it nullable)
-- Actually, we can't easily drop foreign keys, so we need to work around it

-- Option 1: Allow messages where receiver_id is the AI UUID
-- Update the insert policy to allow AI support messages

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Create new insert policy that allows sending to AI support
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND (
      -- Normal case: receiver is a real user
      EXISTS (SELECT 1 FROM auth.users WHERE id = receiver_id)
      OR
      -- Special case: receiver is AI support
      receiver_id = '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

-- Also update select policy to include AI messages
DROP POLICY IF EXISTS "Users can view own messages" ON messages;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR receiver_id = '00000000-0000-0000-0000-000000000001'::uuid
  );


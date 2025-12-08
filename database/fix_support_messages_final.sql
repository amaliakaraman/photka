-- Final fix for support chat messages
-- The AI UUID doesn't exist in auth.users, causing foreign key constraint failures
-- Solution: Make receiver_id nullable for support messages

-- Step 1: Make receiver_id nullable
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Step 2: Update the constraint to allow NULL (sender and receiver can be same if receiver is NULL)
-- Actually, the existing constraint should still work - NULL != anything

-- Step 3: Update RLS policies to handle NULL receiver_id
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can view own messages" ON messages;

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR (receiver_id IS NULL AND sender_id = auth.uid()) -- Support messages
  );

-- Now support messages can use receiver_id = NULL for AI responses
-- User messages will use receiver_id = NULL, and AI responses will also use NULL
-- We'll identify AI messages by sender_id = AI_SUPPORT_UUID


-- Add DELETE policy for messages table
-- This allows users to delete messages from their support conversations

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete support messages" ON messages;

-- Create policy to allow users to delete messages where:
-- 1. They are the sender (covers their own messages), OR
-- 2. The message is in a support booking (session_type = 'support') where they are the owner
CREATE POLICY "Users can delete support messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    -- User can delete their own messages
    auth.uid() = sender_id
    OR
    -- User can delete messages in support bookings that belong to them
    -- Check if the booking exists and belongs to this user
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = messages.booking_id 
      AND bookings.session_type = 'support'
      AND bookings.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );


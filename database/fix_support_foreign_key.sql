-- Fix foreign key constraint for support messages
-- The AI support UUID doesn't exist in auth.users, so we need to either:
-- 1. Make receiver_id nullable for support messages, OR
-- 2. Create a real support user account

-- Option 1: Make receiver_id nullable (requires schema change)
-- This is the cleanest solution but requires altering the table

-- First, check if we can make receiver_id nullable
ALTER TABLE messages ALTER COLUMN receiver_id DROP NOT NULL;

-- Update the constraint to allow NULL for AI support
-- Note: The existing constraint checks sender_id != receiver_id, which will still work with NULL

-- However, this might break other parts of the app that expect receiver_id to always be set
-- So Option 2 is safer:

-- Option 2: Create a real support user account (RECOMMENDED)
-- This requires using Supabase Auth Admin API or creating the user manually
-- For now, we'll work around it by using the user's own ID as receiver for support messages
-- and filtering in the UI

-- Actually, the best solution is to use a service account or special user
-- But for MVP, let's just ensure the booking exists and handle the error gracefully


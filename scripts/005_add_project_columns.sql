-- Add missing columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS progress DECIMAL(5,2) DEFAULT 0.00;

-- Update projects table to match API expectations
-- Verify the constraints and structure match the API requirements
-- Events table already has correct structure (start_time, end_time instead of date)
-- Messages table uses sender_id, not author_id (already correct)
-- Announcements table is correct

-- All other tables are correctly structured as per the schema

-- Add missing columns to team_members table
ALTER TABLE IF EXISTS team_members 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS avatar TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Available';

-- Add missing columns to projects table
ALTER TABLE IF EXISTS projects 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Add missing columns to events table  
ALTER TABLE IF EXISTS events 
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Meeting';

-- Add missing columns to messages table
ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Add missing columns to announcements table to match expected format
ALTER TABLE IF EXISTS announcements 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'update' CHECK (type IN ('update', 'poll', 'question')),
ADD COLUMN IF NOT EXISTS attached_project UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Update announcements - migrate old type values
UPDATE announcements 
SET type = 'update' 
WHERE type IN ('info', 'alert', 'milestone');

-- Add missing columns and constraints to tasks table
ALTER TABLE IF EXISTS tasks 
ADD COLUMN IF NOT EXISTS assignee_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS submitted_link TEXT,
ADD COLUMN IF NOT EXISTS submission_status TEXT CHECK (submission_status IN ('pending', 'approved', 'rejected'));

-- Update tasks status values to match expected format
UPDATE tasks 
SET status = CASE 
  WHEN status = 'done' THEN 'completed' 
  ELSE status 
END;

-- Add constraint check for new status values
ALTER TABLE IF EXISTS tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE IF EXISTS tasks 
ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in-progress', 'review', 'completed'));

-- Add member_ids column to chat_groups for tracking group members
ALTER TABLE IF EXISTS chat_groups 
ADD COLUMN IF NOT EXISTS member_ids UUID[] DEFAULT '{}';

-- Add user_name column to activities table
ALTER TABLE IF EXISTS activities 
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Backfill user_name in activities from profiles
UPDATE activities a
SET user_name = COALESCE((SELECT name FROM profiles WHERE id = a.user_id), 'Unknown')
WHERE user_name IS NULL AND user_id IS NOT NULL;

-- Backfill author_id and author_name in messages from existing data
UPDATE messages m
SET author_id = COALESCE(m.author_id, m.sender_id),
    author_name = COALESCE(m.author_name, m.sender_name)
WHERE (m.author_id IS NULL OR m.author_name IS NULL) AND (m.sender_id IS NOT NULL OR m.sender_name IS NOT NULL);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_attached_project ON announcements(attached_project);
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);

-- ============================================================================
-- ONE&ALL DASHBOARD - ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- This script sets up RLS policies for team-based access.
-- All team members can view and modify their team's data.
-- Run this AFTER 001_create_tables.sql
-- ============================================================================

-- ============================================================================
-- PROFILES POLICIES
-- Users can view all profiles (for team member display)
-- Users can only update their own profile
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- TEAMS POLICIES
-- Users can view teams they are members of
-- Users can create new teams
-- Team members can update their team
-- Only owners can delete teams
-- ============================================================================
DROP POLICY IF EXISTS "teams_select" ON teams;
DROP POLICY IF EXISTS "teams_insert" ON teams;
DROP POLICY IF EXISTS "teams_update" ON teams;
DROP POLICY IF EXISTS "teams_delete" ON teams;

CREATE POLICY "teams_select" ON teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "teams_insert" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "teams_update" ON teams
  FOR UPDATE USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "teams_delete" ON teams
  FOR DELETE USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ============================================================================
-- TEAM_MEMBERS POLICIES
-- Team members can view other members in their teams
-- Team admins/owners can add members
-- Users can remove themselves, owners can remove anyone
-- ============================================================================
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;

CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT WITH CHECK (
    -- Allow if user is admin/owner of the team, OR if they're adding themselves (for team creation trigger)
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    OR user_id = auth.uid()
  );

CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE USING (
    user_id = auth.uid() 
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'owner')
  );

-- ============================================================================
-- PROJECTS POLICIES
-- All team members can CRUD projects in their teams
-- ============================================================================
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- TASKS POLICIES
-- All team members can CRUD tasks in their teams
-- ============================================================================
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- EVENTS POLICIES
-- All team members can CRUD events in their teams
-- ============================================================================
DROP POLICY IF EXISTS "events_select" ON events;
DROP POLICY IF EXISTS "events_insert" ON events;
DROP POLICY IF EXISTS "events_update" ON events;
DROP POLICY IF EXISTS "events_delete" ON events;

CREATE POLICY "events_select" ON events
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "events_delete" ON events
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- ANNOUNCEMENTS POLICIES
-- All team members can CRUD announcements in their teams
-- ============================================================================
DROP POLICY IF EXISTS "announcements_select" ON announcements;
DROP POLICY IF EXISTS "announcements_insert" ON announcements;
DROP POLICY IF EXISTS "announcements_update" ON announcements;
DROP POLICY IF EXISTS "announcements_delete" ON announcements;

CREATE POLICY "announcements_select" ON announcements
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "announcements_insert" ON announcements
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "announcements_update" ON announcements
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "announcements_delete" ON announcements
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- CHAT_GROUPS POLICIES
-- All team members can CRUD chat groups in their teams
-- ============================================================================
DROP POLICY IF EXISTS "chat_groups_select" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_insert" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_update" ON chat_groups;
DROP POLICY IF EXISTS "chat_groups_delete" ON chat_groups;

CREATE POLICY "chat_groups_select" ON chat_groups
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "chat_groups_insert" ON chat_groups
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "chat_groups_update" ON chat_groups
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "chat_groups_delete" ON chat_groups
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- ============================================================================
-- MESSAGES POLICIES
-- All team members can send and view messages in their teams
-- Users can only edit/delete their own messages
-- ============================================================================
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- ============================================================================
-- ACTIVITIES POLICIES
-- All team members can view activities in their teams
-- Activities are inserted by triggers/system, but allow authenticated insert
-- ============================================================================
DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;

CREATE POLICY "activities_select" ON activities
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "activities_insert" ON activities
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

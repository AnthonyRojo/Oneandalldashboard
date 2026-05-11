-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_lookup_idx
  ON ai_chat_sessions(team_id, user_id, agent_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS ai_chat_messages_session_idx
  ON ai_chat_messages(session_id, created_at ASC);

-- Auto-update updated_at on sessions
CREATE OR REPLACE FUNCTION update_ai_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_message_updates_session
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_ai_session_timestamp();

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions"
  ON ai_chat_sessions FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users see messages in own sessions"
  ON ai_chat_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM ai_chat_sessions WHERE user_id = auth.uid()
    )
  );

-- TiltCheck Tilt Events Table
-- Stores tilt detection events from Discord bot
-- Run this migration in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.tilt_events (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  signals JSONB NOT NULL,
  tilt_score DECIMAL(3, 2) NOT NULL,
  context TEXT DEFAULT 'discord-dm',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tilt_events_user_id ON public.tilt_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tilt_events_timestamp ON public.tilt_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tilt_events_user_timestamp ON public.tilt_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tilt_events_tilt_score ON public.tilt_events(tilt_score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tilt_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - allow users to see their own tilt events
-- (optional - only if you want to restrict access via RLS)
-- CREATE POLICY "Users can see their own tilt events"
--   ON public.tilt_events
--   FOR SELECT
--   USING (
--     (SELECT auth.uid()::TEXT) = user_id
--     OR
--     (SELECT role FROM auth.users WHERE id = auth.uid()) = 'admin'
--   );

-- Create policy - only allow backend/service account to insert
-- (optional - for production security)
-- CREATE POLICY "Only backend can insert tilt events"
--   ON public.tilt_events
--   FOR INSERT
--   WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tilt_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tilt_events_updated_at
BEFORE UPDATE ON public.tilt_events
FOR EACH ROW
EXECUTE FUNCTION update_tilt_events_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.tilt_events IS 'Stores tilt detection events from TiltCheck Discord bot';
COMMENT ON COLUMN public.tilt_events.user_id IS 'Discord user ID';
COMMENT ON COLUMN public.tilt_events.timestamp IS 'When the tilt was detected';
COMMENT ON COLUMN public.tilt_events.signals IS 'Array of detected tilt signals (rapid-messages, rage-keywords, etc)';
COMMENT ON COLUMN public.tilt_events.tilt_score IS 'Calculated tilt score (0-5)';
COMMENT ON COLUMN public.tilt_events.context IS 'Where the tilt was detected (discord-dm or discord-guild)';

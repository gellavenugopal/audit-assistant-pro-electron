-- Create table to track active tally bridge sessions
CREATE TABLE public.tally_bridge_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tally_bridge_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions (for connection verification)
CREATE POLICY "Anyone can check sessions"
ON public.tally_bridge_sessions
FOR SELECT
USING (true);

-- Allow authenticated users to manage their sessions
CREATE POLICY "Users can insert their sessions"
ON public.tally_bridge_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their sessions"
ON public.tally_bridge_sessions
FOR DELETE
USING (true);

CREATE POLICY "Users can update sessions"
ON public.tally_bridge_sessions
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_tally_bridge_sessions_code ON public.tally_bridge_sessions(session_code);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tally_bridge_sessions;
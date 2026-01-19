-- Create table for request/response message passing
CREATE TABLE public.tally_bridge_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL,
  xml_request TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_data TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tally_bridge_requests ENABLE ROW LEVEL SECURITY;

-- Allow all operations for this table (internal communication)
CREATE POLICY "Allow all operations on bridge requests"
ON public.tally_bridge_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_tally_bridge_requests_session ON public.tally_bridge_requests(session_code, status);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tally_bridge_requests;

-- Auto-cleanup old requests (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_bridge_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.tally_bridge_requests 
  WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_bridge_requests_trigger
AFTER INSERT ON public.tally_bridge_requests
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_bridge_requests();
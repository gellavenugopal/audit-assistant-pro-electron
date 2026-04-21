-- Modify engagements FK to explicitly use RESTRICT to prevent orphan engagements
-- This prevents client deletion if any engagements reference it

-- First drop the existing FK
ALTER TABLE public.engagements
DROP CONSTRAINT IF EXISTS engagements_client_id_fkey;

-- Re-add with explicit ON DELETE RESTRICT
ALTER TABLE public.engagements
ADD CONSTRAINT engagements_client_id_fkey
FOREIGN KEY (client_id)
REFERENCES public.clients(id)
ON DELETE RESTRICT;

-- Add index if not exists for better query performance
CREATE INDEX IF NOT EXISTS idx_engagements_client_id ON public.engagements(client_id);

-- Add comment
COMMENT ON CONSTRAINT engagements_client_id_fkey ON public.engagements IS 'Prevents deletion of clients that have engagements. Use client deactivation instead.';
-- Add user_id column to partners table to link partner records to actual users
ALTER TABLE public.partners
ADD COLUMN user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for efficient lookup by user_id
CREATE INDEX idx_partners_user_id ON public.partners(user_id);

-- Add partial unique constraint to prevent duplicate user links
CREATE UNIQUE INDEX idx_partners_user_id_unique ON public.partners(user_id) WHERE user_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.partners.user_id IS 'Links this partner compliance record to an authenticated user with partner role';
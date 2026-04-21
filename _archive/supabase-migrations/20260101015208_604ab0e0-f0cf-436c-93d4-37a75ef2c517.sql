-- Add is_active column to profiles table for user deactivation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill existing rows to ensure they're all active
UPDATE public.profiles SET is_active = true WHERE is_active IS NULL;

-- Add index for performance when filtering by is_active
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
-- Add phone and email columns to partners table
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text;
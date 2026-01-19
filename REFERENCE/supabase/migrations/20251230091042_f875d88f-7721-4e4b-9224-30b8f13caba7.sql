-- Add new columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS pan text,
ADD COLUMN IF NOT EXISTS cin text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS pin text;

-- Make industry required (set default for existing null values first)
UPDATE public.clients SET industry = 'Not Specified' WHERE industry IS NULL;
ALTER TABLE public.clients ALTER COLUMN industry SET NOT NULL;
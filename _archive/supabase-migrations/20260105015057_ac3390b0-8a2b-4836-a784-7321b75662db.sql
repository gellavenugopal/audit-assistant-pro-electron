-- Add address field to firm_settings for letterhead footer
ALTER TABLE public.firm_settings 
ADD COLUMN IF NOT EXISTS address TEXT;
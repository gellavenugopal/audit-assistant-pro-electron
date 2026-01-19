-- Add engagement_id column to evidence_files table
ALTER TABLE public.evidence_files 
ADD COLUMN engagement_id uuid REFERENCES public.engagements(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_evidence_files_engagement_id ON public.evidence_files(engagement_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Authenticated users can view all evidence" ON public.evidence_files;
DROP POLICY IF EXISTS "Authenticated users can insert evidence" ON public.evidence_files;
DROP POLICY IF EXISTS "Users can update their own evidence" ON public.evidence_files;
DROP POLICY IF EXISTS "Users can delete their own evidence" ON public.evidence_files;

-- Create new engagement-based RLS policies
CREATE POLICY "Users can view evidence for their engagements" 
ON public.evidence_files 
FOR SELECT 
USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can insert evidence for their engagements" 
ON public.evidence_files 
FOR INSERT 
WITH CHECK (auth.uid() = uploaded_by AND has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can update evidence for their engagements" 
ON public.evidence_files 
FOR UPDATE 
USING (has_engagement_access(auth.uid(), engagement_id));

CREATE POLICY "Users can delete evidence for their engagements" 
ON public.evidence_files 
FOR DELETE 
USING (auth.uid() = uploaded_by AND has_engagement_access(auth.uid(), engagement_id));
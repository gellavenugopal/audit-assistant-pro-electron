-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false);

-- RLS policies for evidence bucket
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'evidence');

CREATE POLICY "Authenticated users can view evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'evidence');

CREATE POLICY "Authenticated users can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track evidence metadata
CREATE TABLE public.evidence_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  linked_procedure TEXT,
  workpaper_ref TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidence_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for evidence_files
CREATE POLICY "Authenticated users can view all evidence"
ON public.evidence_files FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert evidence"
ON public.evidence_files FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own evidence"
ON public.evidence_files FOR UPDATE
TO authenticated
USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own evidence"
ON public.evidence_files FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

-- Add trigger for updated_at
CREATE TRIGGER update_evidence_files_updated_at
BEFORE UPDATE ON public.evidence_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Evidence bucket policies
CREATE POLICY "Users can upload evidence files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'evidence' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view evidence files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'evidence' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete evidence files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'evidence' AND
  auth.uid() IS NOT NULL
);

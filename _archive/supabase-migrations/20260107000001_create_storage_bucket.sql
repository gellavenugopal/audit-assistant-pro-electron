
-- Create storage bucket for audit program attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-attachments', 'audit-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can upload audit attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audit-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their firm's attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audit-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their firm's attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audit-attachments' AND
  auth.uid() IS NOT NULL
);

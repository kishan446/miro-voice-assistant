DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;

CREATE POLICY "Users can read own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
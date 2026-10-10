-- Migration: 25_verification_documents_storage_policies.sql
-- Description: Allow authenticated users to select, update, and delete only their own verification documents

DROP POLICY IF EXISTS "Authenticated Select Own Verification Documents" ON storage.objects;
CREATE POLICY "Authenticated Select Own Verification Documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated Delete Own Verification Documents" ON storage.objects;
CREATE POLICY "Authenticated Delete Own Verification Documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated Update Own Verification Documents" ON storage.objects;
CREATE POLICY "Authenticated Update Own Verification Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

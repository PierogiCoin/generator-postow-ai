-- SQL to create the 'brand-assets' bucket and set it to public
-- Run this in the Supabase SQL Editor

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the bucket
-- Allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'brand-assets' );

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'brand-assets' 
    AND auth.role() = 'authenticated'
);

-- Allow users to delete their own files
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'brand-assets' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

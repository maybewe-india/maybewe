-- Ensure reported_id is nullable on reports for post/comment moderation
ALTER TABLE public.reports ALTER COLUMN reported_id DROP NOT NULL;

-- Ensure check constraint allows NULL reported_id
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS chk_report_users_different;
ALTER TABLE public.reports ADD CONSTRAINT chk_report_users_different CHECK (reported_id IS NULL OR reporter_id <> reported_id);

-- Clean up any duplicate INSERT policies on reports
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users submit reports" ON public.reports;

CREATE POLICY "Authenticated users submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Grant table permissions to authenticated and anon so RLS policies can evaluate subqueries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts TO authenticated;
GRANT SELECT ON TABLE public.posts TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_reactions TO authenticated;
GRANT SELECT ON TABLE public.post_reactions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comments TO authenticated;
GRANT SELECT ON TABLE public.comments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blocks TO authenticated;
GRANT SELECT ON TABLE public.blocks TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.follows TO authenticated;
GRANT SELECT ON TABLE public.follows TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_media TO authenticated;
GRANT SELECT ON TABLE public.post_media TO anon;

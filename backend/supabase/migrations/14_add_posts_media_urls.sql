ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

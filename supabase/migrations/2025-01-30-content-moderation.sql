-- Content moderation: block inappropriate text on jobs and job_comments
-- This adds lightweight server-side guards (no app changes required).

-- Helper function to check text against a blocklist
CREATE OR REPLACE FUNCTION public.check_inappropriate(content text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  banned text[] := ARRAY[
    'fuck', 'shit', 'bitch', 'asshole', 'cunt',
    'nigger', 'nigga', 'fag', 'faggot',
    'kill yourself', 'suicide',
    'hate crime'
  ];
  term text;
  lc text;
BEGIN
  IF content IS NULL THEN
    RETURN;
  END IF;

  lc := lower(content);
  FOREACH term IN ARRAY banned LOOP
    IF position(term IN lc) > 0 THEN
      RAISE EXCEPTION 'Content may violate our guidelines. Please edit and try again.'
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$$;

-- Trigger for jobs (title, description)
CREATE OR REPLACE FUNCTION public.jobs_content_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.check_inappropriate(NEW.title);
  PERFORM public.check_inappropriate(NEW.description);
  RETURN NEW;
END;
$$;

-- Trigger for job_comments (comment)
CREATE OR REPLACE FUNCTION public.job_comments_content_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.check_inappropriate(NEW.comment);
  RETURN NEW;
END;
$$;

-- Attach triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'jobs_content_guard_trigger'
  ) THEN
    CREATE TRIGGER jobs_content_guard_trigger
    BEFORE INSERT OR UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.jobs_content_guard();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'job_comments_content_guard_trigger'
  ) THEN
    CREATE TRIGGER job_comments_content_guard_trigger
    BEFORE INSERT OR UPDATE ON public.job_comments
    FOR EACH ROW EXECUTE FUNCTION public.job_comments_content_guard();
  END IF;
END$$;


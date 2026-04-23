ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS year INTEGER;

CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_topic_year ON public.questions(topic_id, year);
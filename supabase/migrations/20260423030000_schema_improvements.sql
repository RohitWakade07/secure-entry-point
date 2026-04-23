
-- =====================================================
-- Schema Improvements Migration
-- =====================================================

-- 1. Tests: add description, is_published flag, subject_id
ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id);

-- 2. Questions: add marks & negative_marks for GATE-style scoring
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS marks NUMERIC NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS negative_marks NUMERIC NOT NULL DEFAULT 1;

-- 3. Attempts: add status column (in_progress / completed)
ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed'));

-- 4. Practice sessions table
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    questions_answered INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    total_time INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
  ON public.practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers and admins can view all practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

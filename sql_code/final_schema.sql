-- ==========================================
-- Migration: 20260402112002_e3355edc-8ce2-40f5-a404-561b80bc9cf0.sql
-- ==========================================


-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    branch TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Topics table
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    topic_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view topics" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage topics" ON public.topics FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'MSQ', 'NAT')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can insert own questions" ON public.questions FOR INSERT WITH CHECK (auth.uid() = teacher_id AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Teachers can update own questions" ON public.questions FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can delete own questions" ON public.questions FOR DELETE USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all questions" ON public.questions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Options table
CREATE TABLE public.options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view options" ON public.options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage options" ON public.options FOR ALL USING (
    EXISTS (SELECT 1 FROM public.questions q WHERE q.id = question_id AND q.teacher_id = auth.uid())
);
CREATE POLICY "Admins can manage all options" ON public.options FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Tests table
CREATE TABLE public.tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    duration INT NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tests" ON public.tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create tests" ON public.tests FOR INSERT WITH CHECK (
    auth.uid() = created_by AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
);

-- Test questions join
CREATE TABLE public.test_questions (
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (test_id, question_id)
);

ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view test questions" ON public.test_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can manage test questions" ON public.test_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_id AND t.created_by = auth.uid())
);

-- Attempts table
CREATE TABLE public.attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    score FLOAT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attempts" ON public.attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own attempts" ON public.attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins and teachers can view all attempts" ON public.attempts FOR SELECT USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Answers table
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    selected_option_id UUID REFERENCES public.options(id),
    is_correct BOOLEAN,
    time_taken INT
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own answers" ON public.answers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);
CREATE POLICY "Users can insert own answers" ON public.answers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
);
CREATE POLICY "Admins and teachers can view all answers" ON public.answers FOR SELECT USING (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

-- Seed some default subjects
INSERT INTO public.subjects (subject_name) VALUES 
  ('Computer Science & IT'),
  ('Electronics & Communication'),
  ('Electrical Engineering'),
  ('Mechanical Engineering'),
  ('Civil Engineering');


-- ==========================================
-- Migration: 20260402112600_130a0ab0-2931-4ee0-95a2-c0adb17f0276.sql
-- ==========================================


CREATE TABLE public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, question_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookmarks" ON public.bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks FOR DELETE USING (auth.uid() = user_id);


-- ==========================================
-- Migration: 20260423030000_schema_improvements.sql
-- ==========================================


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


-- ==========================================
-- Migration: 20260423034957_b0498533-5aca-4805-a003-2b1e734b78be.sql
-- ==========================================

-- Duplicate migration: These changes were already applied in 20260423030000_schema_improvements.sql
-- We've cleared this file so it doesn't throw a duplicate policy error.

-- ==========================================
-- Migration: 20260423035311_eb17115b-2ad1-4547-8219-9229271b971b.sql
-- ==========================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS year INTEGER;

CREATE INDEX IF NOT EXISTS idx_questions_year ON public.questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_topic_year ON public.questions(topic_id, year);

-- ==========================================
-- Migration: 20260423041230_a844b7d6-9596-41b5-a47f-3fe8661268a5.sql
-- ==========================================

ALTER TABLE public.attempts REPLICA IDENTITY FULL;
ALTER TABLE public.answers REPLICA IDENTITY FULL;
ALTER TABLE public.practice_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.bookmarks REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.practice_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- =====================================================
-- GAMIFICATION LEADERBOARD SYSTEM MIGRATION
-- Comprehensive schema for ranking, achievements, and gamified experience
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

CREATE TYPE public.leaderboard_period AS ENUM ('weekly', 'monthly');
CREATE TYPE public.badge_type AS ENUM (
  'top_10', 'top_100', 'top_500', 
  'rising_star', 'consistency_king', 'speed_demon', 
  'accuracy_master', 'improvement_champion',
  'weekly_champion', 'monthly_champion',
  'streak_7', 'streak_14', 'streak_30',
  'milestone_50', 'milestone_100', 'milestone_500'
);
CREATE TYPE public.achievement_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- =====================================================
-- 2. USER GAMIFICATION PROFILE
-- =====================================================

CREATE TABLE public.user_gamification_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_xp INT NOT NULL DEFAULT 0,
    reward_points INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    longest_streak INT NOT NULL DEFAULT 0,
    last_activity_date TIMESTAMPTZ,
    total_tests_completed INT NOT NULL DEFAULT 0,
    overall_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
    overall_speed INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gamification_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own gamification profile" 
  ON public.user_gamification_profile FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can view all gamification profiles" 
  ON public.user_gamification_profile FOR SELECT 
  TO authenticated USING (true);
CREATE POLICY "System can update profiles"
  ON public.user_gamification_profile FOR UPDATE
  USING (true);
CREATE POLICY "System can insert profiles"
  ON public.user_gamification_profile FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_user_gamification_total_xp ON public.user_gamification_profile(total_xp DESC);
CREATE INDEX idx_user_gamification_updated_at ON public.user_gamification_profile(updated_at DESC);

-- =====================================================
-- 3. LEADERBOARD TABLES (Weekly & Monthly Snapshots)
-- =====================================================

CREATE TABLE public.leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period public.leaderboard_period NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT true,
    snapshot_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (period, period_start)
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view leaderboards"
  ON public.leaderboards FOR SELECT 
  TO authenticated USING (true);

CREATE INDEX idx_leaderboards_period ON public.leaderboards(period, is_current);
CREATE INDEX idx_leaderboards_dates ON public.leaderboards(period_start, period_end);

-- =====================================================
-- LEADERBOARD ENTRIES (User Rankings per Period)
-- =====================================================

CREATE TABLE public.leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID REFERENCES public.leaderboards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rank INT NOT NULL,
    total_score NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_marks INT NOT NULL DEFAULT 0,
    accuracy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    avg_speed INT NOT NULL DEFAULT 0,
    tests_completed INT NOT NULL DEFAULT 0,
    consistency_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    improvement_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    difficulty_adjusted_score NUMERIC(10,2) NOT NULL DEFAULT 0,
    weighted_final_score NUMERIC(10,2) NOT NULL DEFAULT 0,
    percentile NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (leaderboard_id, user_id)
);

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view leaderboard entries"
  ON public.leaderboard_entries FOR SELECT 
  TO authenticated USING (true);

CREATE INDEX idx_leaderboard_entries_rank ON public.leaderboard_entries(leaderboard_id, rank);
CREATE INDEX idx_leaderboard_entries_score ON public.leaderboard_entries(leaderboard_id, weighted_final_score DESC);
CREATE INDEX idx_leaderboard_entries_user ON public.leaderboard_entries(user_id, leaderboard_id);

-- =====================================================
-- 4. USER PERFORMANCE HISTORY (For Trend Analysis)
-- =====================================================

CREATE TABLE public.user_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
    test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
    score NUMERIC(10,2) NOT NULL,
    max_possible_score NUMERIC(10,2) NOT NULL,
    accuracy_percentage NUMERIC(5,2) NOT NULL,
    time_taken INT NOT NULL,
    difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    questions_correct INT NOT NULL,
    questions_total INT NOT NULL,
    xp_earned INT NOT NULL DEFAULT 0,
    reward_points_earned INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (attempt_id)
);

ALTER TABLE public.user_performance_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own performance history"
  ON public.user_performance_history FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own performance history"
  ON public.user_performance_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_performance_user_date ON public.user_performance_history(user_id, submitted_at DESC);
CREATE INDEX idx_performance_accuracy ON public.user_performance_history(user_id, accuracy_percentage);

-- =====================================================
-- 5. ACHIEVEMENT & BADGE SYSTEM
-- =====================================================

CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_type public.badge_type NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    rarity public.achievement_rarity NOT NULL,
    required_condition JSONB NOT NULL,
    xp_reward INT NOT NULL DEFAULT 0,
    reward_points INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view achievements"
  ON public.achievements FOR SELECT 
  TO authenticated USING (true);

-- =====================================================
-- USER ACHIEVEMENTS (Earned Badges)
-- =====================================================

CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Everyone can view all user achievements"
  ON public.user_achievements FOR SELECT 
  TO authenticated USING (true);
CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT 
  WITH CHECK (true);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_date ON public.user_achievements(achieved_at DESC);

-- =====================================================
-- 6. REWARD & PROGRESSION SYSTEM
-- =====================================================

CREATE TABLE public.user_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('xp', 'points', 'badge', 'milestone')),
    amount INT NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    source_attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE,
    unlocked_features TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own rewards"
  ON public.user_rewards FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "System can insert rewards"
  ON public.user_rewards FOR INSERT 
  WITH CHECK (true);

CREATE INDEX idx_user_rewards_user_date ON public.user_rewards(user_id, created_at DESC);

-- =====================================================
-- 7. STREAK TRACKING
-- =====================================================

CREATE TABLE public.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    current_streak_count INT NOT NULL DEFAULT 0,
    longest_streak_count INT NOT NULL DEFAULT 0,
    last_test_date TIMESTAMPTZ,
    streak_type TEXT NOT NULL CHECK (streak_type IN ('daily', 'weekly')),
    consecutive_days INT NOT NULL DEFAULT 0,
    UNIQUE (user_id, streak_type)
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own streaks"
  ON public.user_streaks FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Everyone can view all streaks"
  ON public.user_streaks FOR SELECT 
  TO authenticated USING (true);
CREATE POLICY "System can manage streaks"
  ON public.user_streaks FOR ALL 
  WITH CHECK (true);

CREATE INDEX idx_user_streaks_user ON public.user_streaks(user_id);

-- =====================================================
-- 8. ANTI-CHEATING DETECTION SYSTEM
-- =====================================================

CREATE TABLE public.anomaly_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
    anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
        'score_spike',
        'duplicate_attempt',
        'impossible_accuracy',
        'speed_anomaly',
        'pattern_abuse',
        'suspicious_improvement'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    evidence JSONB,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.anomaly_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view anomaly logs"
  ON public.anomaly_logs FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert anomaly logs"
  ON public.anomaly_logs FOR INSERT 
  WITH CHECK (true);

CREATE INDEX idx_anomaly_logs_user ON public.anomaly_logs(user_id, created_at DESC);
CREATE INDEX idx_anomaly_logs_flagged ON public.anomaly_logs(is_flagged, severity);
CREATE INDEX idx_anomaly_logs_type ON public.anomaly_logs(anomaly_type);

-- =====================================================
-- 9. RANKING METADATA & SNAPSHOTS
-- =====================================================

CREATE TABLE public.ranking_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID REFERENCES public.leaderboards(id) ON DELETE CASCADE NOT NULL,
    snapshot_data JSONB NOT NULL,
    top_10_users JSONB NOT NULL,
    total_users_ranked INT NOT NULL,
    calculation_duration_ms INT,
    is_finalized BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (leaderboard_id)
);

ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view ranking snapshots"
  ON public.ranking_snapshots FOR SELECT 
  TO authenticated USING (true);

-- =====================================================
-- 10. SYNC & SCHEDULING STATE
-- =====================================================

CREATE TABLE public.ranking_job_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL UNIQUE,
    job_type TEXT NOT NULL CHECK (job_type IN ('weekly_ranking', 'monthly_ranking', 'anomaly_detection', 'streak_update')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
    period_type public.leaderboard_period,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    error_message TEXT,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    execution_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_job_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view job state"
  ON public.ranking_job_state FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can manage job state"
  ON public.ranking_job_state FOR ALL 
  WITH CHECK (true);

CREATE INDEX idx_job_state_next_run ON public.ranking_job_state(next_run_at, status);

-- =====================================================
-- 11. TRIGGER FUNCTIONS
-- =====================================================

-- Update gamification profile updated_at
CREATE TRIGGER update_gamification_profile_updated_at
  BEFORE UPDATE ON public.user_gamification_profile
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update leaderboard entries updated_at
CREATE TRIGGER update_leaderboard_entries_updated_at
  BEFORE UPDATE ON public.leaderboard_entries
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create gamification profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_gamification_profile (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_streaks (user_id, streak_type)
  VALUES (NEW.id, 'daily'), (NEW.id, 'weekly');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_gamification_created ON auth.users;
CREATE TRIGGER on_auth_user_gamification_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_gamification();

-- =====================================================
-- 12. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_leaderboard_entries_percentile ON public.leaderboard_entries(leaderboard_id, percentile DESC);
CREATE INDEX idx_performance_test ON public.user_performance_history(test_id, submitted_at DESC);
CREATE INDEX idx_performance_difficulty ON public.user_performance_history(difficulty_level, submitted_at DESC);
CREATE INDEX idx_anomaly_user_type ON public.anomaly_logs(user_id, anomaly_type);

-- =====================================================
-- 13. REALTIME PUBLICATION
-- =====================================================

BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gamification_profile;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking_snapshots;
COMMIT;

-- =====================================================
-- 14. INITIAL ACHIEVEMENTS DATA
-- =====================================================

INSERT INTO public.achievements (badge_type, name, description, rarity, required_condition, xp_reward, reward_points)
VALUES
  ('top_10', 'Top 10 Achiever', 'Ranked in top 10 in any leaderboard period', 'rare', '{"rank": {"lte": 10}}', 500, 100),
  ('top_100', 'Elite Performer', 'Ranked in top 100 in any leaderboard period', 'uncommon', '{"rank": {"lte": 100}}', 250, 50),
  ('top_500', 'Rising Contender', 'Ranked in top 500 in any leaderboard period', 'common', '{"rank": {"lte": 500}}', 100, 25),
  ('rising_star', 'Rising Star', 'Improved ranking by 50+ positions in consecutive periods', 'rare', '{"improvement": {"gte": 50}}', 400, 80),
  ('consistency_king', 'Consistency King', 'Maintained top 50 rank in both weekly and monthly leaderboards', 'rare', '{"consistency_score": {"gte": 85}}', 450, 90),
  ('speed_demon', 'Speed Demon', 'Average speed < 2 min per question with > 80% accuracy', 'uncommon', '{"avg_speed": {"lt": 120}, "accuracy": {"gte": 80}}', 300, 60),
  ('accuracy_master', 'Accuracy Master', 'Maintained > 90% accuracy across 10+ tests', 'rare', '{"accuracy": {"gte": 90}, "tests_completed": {"gte": 10}}', 400, 80),
  ('improvement_champion', 'Improvement Champion', 'Improved overall accuracy by 20+ percentage points', 'epic', '{"improvement": {"gte": 20}}', 600, 120),
  ('weekly_champion', 'Weekly Champion', 'Won weekly leaderboard', 'epic', '{"weekly_rank": 1}', 750, 150),
  ('monthly_champion', 'Monthly Champion', 'Won monthly leaderboard', 'legendary', '{"monthly_rank": 1}', 1000, 200),
  ('streak_7', 'Week Warrior', 'Maintained 7-day test streak', 'common', '{"streak": {"gte": 7}}', 150, 30),
  ('streak_14', 'Two Week Warrior', 'Maintained 14-day test streak', 'uncommon', '{"streak": {"gte": 14}}', 300, 60),
  ('streak_30', 'Month Master', 'Maintained 30-day test streak', 'epic', '{"streak": {"gte": 30}}', 750, 150),
  ('milestone_50', '50 Tests Milestone', 'Completed 50 tests', 'common', '{"tests_completed": 50}', 100, 20),
  ('milestone_100', 'Century Achiever', 'Completed 100 tests', 'uncommon', '{"tests_completed": 100}', 250, 50),
  ('milestone_500', 'Elite Test Taker', 'Completed 500 tests', 'epic', '{"tests_completed": 500}', 750, 150)
ON CONFLICT (badge_type) DO NOTHING;

-- =====================================================
-- END OF GAMIFICATION MIGRATION
-- =====================================================

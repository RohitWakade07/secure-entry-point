-- =====================================================
-- SCHEDULED RANKING & GAMIFICATION JOBS
-- Cron functions for weekly/monthly recalculations and maintenance
-- =====================================================

-- =====================================================
-- 1. WEEKLY RANKING CALCULATION JOB
-- =====================================================

CREATE OR REPLACE FUNCTION public.schedule_weekly_ranking_job()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start TIMESTAMPTZ;
  v_week_end TIMESTAMPTZ;
  v_leaderboard_id UUID;
  v_result RECORD;
  v_job_record RECORD;
BEGIN
  -- Calculate week boundaries (Monday to Sunday)
  v_week_start := DATE_TRUNC('week', now() AT TIME ZONE 'UTC');
  v_week_end := v_week_start + INTERVAL '7 days' - INTERVAL '1 second';

  -- Check if job already ran this week
  SELECT * INTO v_job_record
  FROM public.ranking_job_state
  WHERE job_type = 'weekly_ranking'
    AND DATE_TRUNC('week', last_run_at) = DATE_TRUNC('week', now());

  IF FOUND AND v_job_record.status = 'completed' THEN
    RETURN true; -- Already completed this week
  END IF;

  -- Start job
  INSERT INTO public.ranking_job_state (
    job_id, job_type, status, period_type, period_start, period_end, next_run_at
  )
  VALUES (
    'weekly_' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
    'weekly_ranking',
    'running',
    'weekly',
    v_week_start,
    v_week_end,
    v_week_start + INTERVAL '7 days'
  )
  ON CONFLICT (job_id) DO UPDATE
  SET status = 'running', last_run_at = now()
  RETURNING id INTO v_job_record;

  -- Create leaderboard period
  v_leaderboard_id := public.create_leaderboard_period('weekly', v_week_start, v_week_end);

  -- Calculate rankings
  SELECT * INTO v_result
  FROM public.calculate_leaderboard_rankings(v_leaderboard_id);

  -- Update job status
  UPDATE public.ranking_job_state
  SET 
    status = 'completed',
    last_run_at = now(),
    execution_count = execution_count + 1,
    error_message = NULL
  WHERE job_type = 'weekly_ranking'
    AND period_start = v_week_start;

  RETURN v_result.success;
EXCEPTION WHEN OTHERS THEN
  -- Log error and update status
  UPDATE public.ranking_job_state
  SET 
    status = 'failed',
    error_message = SQLERRM,
    last_run_at = now()
  WHERE job_type = 'weekly_ranking'
    AND period_start = v_week_start;
  
  RAISE WARNING 'Weekly ranking job failed: %', SQLERRM;
  RETURN false;
END;
$$;

-- =====================================================
-- 2. MONTHLY RANKING CALCULATION JOB
-- =====================================================

CREATE OR REPLACE FUNCTION public.schedule_monthly_ranking_job()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start TIMESTAMPTZ;
  v_month_end TIMESTAMPTZ;
  v_leaderboard_id UUID;
  v_result RECORD;
  v_job_record RECORD;
BEGIN
  -- Calculate month boundaries
  v_month_start := DATE_TRUNC('month', now() AT TIME ZONE 'UTC');
  v_month_end := DATE_TRUNC('month', now() AT TIME ZONE 'UTC' + INTERVAL '1 month') - INTERVAL '1 second';

  -- Check if job already ran this month
  SELECT * INTO v_job_record
  FROM public.ranking_job_state
  WHERE job_type = 'monthly_ranking'
    AND DATE_TRUNC('month', last_run_at) = DATE_TRUNC('month', now());

  IF FOUND AND v_job_record.status = 'completed' THEN
    RETURN true; -- Already completed this month
  END IF;

  -- Start job
  INSERT INTO public.ranking_job_state (
    job_id, job_type, status, period_type, period_start, period_end, next_run_at
  )
  VALUES (
    'monthly_' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
    'monthly_ranking',
    'running',
    'monthly',
    v_month_start,
    v_month_end,
    v_month_start + INTERVAL '1 month'
  )
  ON CONFLICT (job_id) DO UPDATE
  SET status = 'running', last_run_at = now()
  RETURNING id INTO v_job_record;

  -- Create leaderboard period
  v_leaderboard_id := public.create_leaderboard_period('monthly', v_month_start, v_month_end);

  -- Calculate rankings
  SELECT * INTO v_result
  FROM public.calculate_leaderboard_rankings(v_leaderboard_id);

  -- Award monthly champion badge
  PERFORM public.award_period_champion('monthly', v_leaderboard_id);

  -- Update job status
  UPDATE public.ranking_job_state
  SET 
    status = 'completed',
    last_run_at = now(),
    execution_count = execution_count + 1,
    error_message = NULL
  WHERE job_type = 'monthly_ranking'
    AND period_start = v_month_start;

  RETURN v_result.success;
EXCEPTION WHEN OTHERS THEN
  -- Log error and update status
  UPDATE public.ranking_job_state
  SET 
    status = 'failed',
    error_message = SQLERRM,
    last_run_at = now()
  WHERE job_type = 'monthly_ranking'
    AND period_start = v_month_start;
  
  RAISE WARNING 'Monthly ranking job failed: %', SQLERRM;
  RETURN false;
END;
$$;

-- =====================================================
-- 3. ANOMALY DETECTION JOB
-- =====================================================

CREATE OR REPLACE FUNCTION public.schedule_anomaly_detection_job()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_size INT := 100;
  v_processed INT := 0;
  v_flagged_count INT := 0;
  v_user_id UUID;
  v_attempt_id UUID;
  v_anomaly_result RECORD;
BEGIN
  -- Process recent attempts that haven't been checked yet
  FOR v_user_id, v_attempt_id IN
    SELECT uph.user_id, uph.attempt_id
    FROM public.user_performance_history uph
    LEFT JOIN public.anomaly_logs al ON al.attempt_id = uph.attempt_id
    WHERE al.id IS NULL -- Not yet checked
      AND uph.submitted_at > now() - INTERVAL '24 hours'
    LIMIT v_batch_size
  LOOP
    -- Get test ID for this attempt
    DECLARE
      v_test_id UUID;
      v_score NUMERIC;
    BEGIN
      SELECT a.test_id, a.score
      INTO v_test_id, v_score
      FROM public.attempts a
      WHERE a.id = v_attempt_id;

      -- Run anomaly checks
      SELECT * INTO v_anomaly_result
      FROM public.check_attempt_anomalies(v_user_id, v_attempt_id, v_test_id, v_score);

      IF v_anomaly_result.has_anomalies AND v_anomaly_result.max_severity IN ('critical', 'high') THEN
        -- Flag high-severity anomalies for manual review
        UPDATE public.anomaly_logs
        SET is_flagged = true
        WHERE attempt_id = v_attempt_id
          AND severity IN ('critical', 'high');
        
        v_flagged_count := v_flagged_count + 1;
      END IF;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error checking anomalies for attempt %: %', v_attempt_id, SQLERRM;
    END;
  END LOOP;

  -- Log job completion
  INSERT INTO public.ranking_job_state (
    job_id, job_type, status, last_run_at, execution_count, error_message
  )
  VALUES (
    'anomaly_' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
    'anomaly_detection',
    'completed',
    now(),
    1,
    'Processed ' || v_processed || ' attempts, flagged ' || v_flagged_count || ' anomalies'
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.ranking_job_state (
    job_id, job_type, status, last_run_at, error_message
  )
  VALUES (
    'anomaly_' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
    'anomaly_detection',
    'failed',
    now(),
    SQLERRM
  );
  
  RAISE WARNING 'Anomaly detection job failed: %', SQLERRM;
  RETURN false;
END;
$$;

-- =====================================================
-- 4. STREAK UPDATE JOB
-- =====================================================

CREATE OR REPLACE FUNCTION public.schedule_streak_update_job()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_streak_broken INT := 0;
  v_weekly_streak_broken INT := 0;
BEGIN
  -- Check for broken daily streaks
  UPDATE public.user_streaks
  SET current_streak_count = 0
  WHERE streak_type = 'daily'
    AND last_test_date < (now() - INTERVAL '24 hours')
    AND current_streak_count > 0;

  GET DIAGNOSTICS v_daily_streak_broken = ROW_COUNT;

  -- Check for broken weekly streaks
  UPDATE public.user_streaks
  SET current_streak_count = 0
  WHERE streak_type = 'weekly'
    AND last_test_date < (now() - INTERVAL '7 days')
    AND current_streak_count > 0;

  GET DIAGNOSTICS v_weekly_streak_broken = ROW_COUNT;

  -- Reset weekly streaks if all weeks passed
  UPDATE public.user_streaks
  SET current_streak_count = 0
  WHERE streak_type = 'weekly'
    AND DATE_TRUNC('week', last_test_date) < DATE_TRUNC('week', now());

  -- Log job
  INSERT INTO public.ranking_job_state (
    job_id, job_type, status, last_run_at, error_message
  )
  VALUES (
    'streak_' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
    'streak_update',
    'completed',
    now(),
    'Broke ' || v_daily_streak_broken || ' daily + ' || v_weekly_streak_broken || ' weekly streaks'
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.ranking_job_state (
    job_id, job_type, status, last_run_at, error_message
  )
  VALUES (
    'streak_' || to_char(now(), 'YYYY-MM-DD-HH24-MI-SS'),
    'streak_update',
    'failed',
    now(),
    SQLERRM
  );
  
  RAISE WARNING 'Streak update job failed: %', SQLERRM;
  RETURN false;
END;
$$;

-- =====================================================
-- 5. AWARD PERIOD CHAMPIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.award_period_champion(
  p_period public.leaderboard_period,
  p_leaderboard_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champion_user_id UUID;
  v_achievement_type TEXT;
  v_achievement_id UUID;
BEGIN
  -- Get the rank 1 user
  SELECT user_id INTO v_champion_user_id
  FROM public.leaderboard_entries
  WHERE leaderboard_id = p_leaderboard_id
    AND rank = 1;

  IF v_champion_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Determine achievement type
  v_achievement_type := CASE 
    WHEN p_period = 'weekly' THEN 'weekly_champion'
    WHEN p_period = 'monthly' THEN 'monthly_champion'
    ELSE 'weekly_champion'
  END;

  -- Get achievement ID
  SELECT id INTO v_achievement_id
  FROM public.achievements
  WHERE badge_type = v_achievement_type;

  IF v_achievement_id IS NOT NULL THEN
    -- Award achievement
    INSERT INTO public.user_achievements (user_id, achievement_id)
    VALUES (v_champion_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    -- Award XP and points
    IF p_period = 'weekly' THEN
      PERFORM public.updateUserXp(v_champion_user_id, 750);
      PERFORM public.updateRewardPoints(v_champion_user_id, 150);
    ELSE
      PERFORM public.updateUserXp(v_champion_user_id, 1000);
      PERFORM public.updateRewardPoints(v_champion_user_id, 200);
    END IF;
  END IF;
END;
$$;

-- =====================================================
-- 6. GENERAL JOB SCHEDULER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.execute_scheduled_jobs()
RETURNS TABLE (
  job_name TEXT,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekly_result BOOLEAN;
  v_monthly_result BOOLEAN;
  v_anomaly_result BOOLEAN;
  v_streak_result BOOLEAN;
BEGIN
  -- Weekly ranking (every Monday at 00:00 UTC)
  IF EXTRACT(ISODOW FROM now() AT TIME ZONE 'UTC') = 1
    AND EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC') = 0 THEN
    v_weekly_result := public.schedule_weekly_ranking_job();
    RETURN QUERY SELECT 'weekly_ranking'::TEXT, v_weekly_result, 
      CASE WHEN v_weekly_result THEN 'Weekly rankings calculated'
        ELSE 'Failed to calculate weekly rankings' END;
  END IF;

  -- Monthly ranking (1st of month at 00:00 UTC)
  IF EXTRACT(DAY FROM now() AT TIME ZONE 'UTC') = 1
    AND EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC') = 0 THEN
    v_monthly_result := public.schedule_monthly_ranking_job();
    RETURN QUERY SELECT 'monthly_ranking'::TEXT, v_monthly_result,
      CASE WHEN v_monthly_result THEN 'Monthly rankings calculated'
        ELSE 'Failed to calculate monthly rankings' END;
  END IF;

  -- Anomaly detection (every 6 hours)
  v_anomaly_result := public.schedule_anomaly_detection_job();
  RETURN QUERY SELECT 'anomaly_detection'::TEXT, v_anomaly_result,
    CASE WHEN v_anomaly_result THEN 'Anomaly detection completed'
      ELSE 'Anomaly detection failed' END;

  -- Streak updates (every 24 hours)
  IF EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC') = 1 THEN
    v_streak_result := public.schedule_streak_update_job();
    RETURN QUERY SELECT 'streak_update'::TEXT, v_streak_result,
      CASE WHEN v_streak_result THEN 'Streaks updated'
        ELSE 'Streak update failed' END;
  END IF;
END;
$$;

-- =====================================================
-- 7. HELPER FUNCTIONS FOR XP & POINTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.updateUserXp(
  p_user_id UUID,
  p_amount INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp INT;
BEGIN
  UPDATE public.user_gamification_profile
  SET total_xp = total_xp + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_xp INTO v_new_xp;

  RETURN COALESCE(v_new_xp, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.updateRewardPoints(
  p_user_id UUID,
  p_amount INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_points INT;
BEGIN
  UPDATE public.user_gamification_profile
  SET reward_points = reward_points + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING reward_points INTO v_new_points;

  RETURN COALESCE(v_new_points, 0);
END;
$$;

-- =====================================================
-- END OF SCHEDULED JOBS
-- =====================================================

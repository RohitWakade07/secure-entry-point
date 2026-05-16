-- =====================================================
-- RANKING CALCULATION RPC FUNCTIONS
-- Comprehensive functions for calculating leaderboard rankings
-- =====================================================

-- =====================================================
-- 1. METRIC CALCULATION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_user_metrics(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS TABLE (
  total_marks INT,
  accuracy_percentage NUMERIC,
  avg_speed INT,
  tests_completed INT,
  consistency_score NUMERIC,
  improvement_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_marks INT := 0;
  v_accuracy_percentage NUMERIC := 0;
  v_avg_speed INT := 0;
  v_tests_completed INT := 0;
  v_consistency_score NUMERIC := 0;
  v_improvement_score NUMERIC := 0;
  v_total_questions INT := 0;
  v_correct_answers INT := 0;
  v_total_time INT := 0;
  v_first_score NUMERIC;
  v_last_score NUMERIC;
  v_score_variance NUMERIC;
  v_high_scores INT;
BEGIN
  -- Get performance data for the period
  SELECT 
    COALESCE(SUM(uph.score)::INT, 0),
    COALESCE(SUM(uph.questions_correct), 0),
    COALESCE(SUM(uph.questions_total), 0),
    COALESCE(SUM(uph.time_taken), 0),
    COUNT(DISTINCT uph.attempt_id)
  INTO v_total_marks, v_correct_answers, v_total_questions, v_total_time, v_tests_completed
  FROM public.user_performance_history uph
  WHERE uph.user_id = p_user_id
    AND uph.submitted_at >= p_period_start
    AND uph.submitted_at <= p_period_end;

  -- Calculate accuracy percentage
  IF v_total_questions > 0 THEN
    v_accuracy_percentage := (v_correct_answers::NUMERIC / v_total_questions) * 100;
  END IF;

  -- Calculate average speed (seconds per question)
  IF v_total_questions > 0 THEN
    v_avg_speed := CASE WHEN v_total_time > 0 THEN (v_total_time / v_total_questions) ELSE 0 END;
  END IF;

  -- Calculate consistency score (how stable are scores across tests)
  -- Higher consistency = more reliable performance
  IF v_tests_completed > 1 THEN
    WITH score_data AS (
      SELECT uph.score
      FROM public.user_performance_history uph
      WHERE uph.user_id = p_user_id
        AND uph.submitted_at >= p_period_start
        AND uph.submitted_at <= p_period_end
      ORDER BY uph.submitted_at
    ),
    score_stats AS (
      SELECT 
        AVG(score) as avg_score,
        STDDEV_POP(score) as stddev
      FROM score_data
    )
    SELECT 
      CASE 
        WHEN stddev IS NULL OR stddev = 0 THEN 100
        ELSE GREATEST(0, LEAST(100, 100 - (stddev / NULLIF(avg_score, 0)) * 50))
      END
    INTO v_consistency_score
    FROM score_stats;
  ELSE
    v_consistency_score := 50; -- Default for single test
  END IF;

  -- Calculate improvement score (trend analysis)
  -- Positive trend = improving performance
  IF v_tests_completed >= 2 THEN
    WITH score_data AS (
      SELECT 
        ROW_NUMBER() OVER (ORDER BY submitted_at) as rn,
        score
      FROM public.user_performance_history uph
      WHERE uph.user_id = p_user_id
        AND uph.submitted_at >= p_period_start
        AND uph.submitted_at <= p_period_end
    )
    SELECT 
      score INTO v_first_score
    FROM score_data 
    WHERE rn = 1;
    
    SELECT 
      score INTO v_last_score
    FROM score_data 
    WHERE rn = v_tests_completed;

    IF v_first_score > 0 THEN
      v_improvement_score := ((v_last_score - v_first_score) / v_first_score) * 100;
      v_improvement_score := LEAST(100, GREATEST(-100, v_improvement_score));
    ELSE
      v_improvement_score := 0;
    END IF;
  ELSE
    v_improvement_score := 50; -- Default for single test
  END IF;

  RETURN QUERY SELECT 
    v_total_marks,
    v_accuracy_percentage,
    v_avg_speed,
    v_tests_completed,
    v_consistency_score,
    v_improvement_score;
END;
$$;

-- =====================================================
-- 2. SCORE CALCULATION WITH DIFFICULTY ADJUSTMENT
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_difficulty_adjusted_score(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_easy_score NUMERIC := 0;
  v_medium_score NUMERIC := 0;
  v_hard_score NUMERIC := 0;
  v_easy_count INT := 0;
  v_medium_count INT := 0;
  v_hard_count INT := 0;
  v_adjusted_score NUMERIC := 0;
BEGIN
  -- Get scores by difficulty level
  SELECT 
    COALESCE(SUM(CASE WHEN uph.difficulty_level = 'easy' THEN uph.score ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN uph.difficulty_level = 'medium' THEN uph.score ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN uph.difficulty_level = 'hard' THEN uph.score ELSE 0 END), 0),
    COUNT(CASE WHEN uph.difficulty_level = 'easy' THEN 1 END),
    COUNT(CASE WHEN uph.difficulty_level = 'medium' THEN 1 END),
    COUNT(CASE WHEN uph.difficulty_level = 'hard' THEN 1 END)
  INTO v_easy_score, v_medium_score, v_hard_score, v_easy_count, v_medium_count, v_hard_count
  FROM public.user_performance_history uph
  WHERE uph.user_id = p_user_id
    AND uph.submitted_at >= p_period_start
    AND uph.submitted_at <= p_period_end;

  -- Calculate weighted score with difficulty multipliers
  -- Easy: 1x, Medium: 1.5x, Hard: 2x
  v_adjusted_score := 
    (v_easy_score * 1.0) +
    (v_medium_score * 1.5) +
    (v_hard_score * 2.0);

  RETURN v_adjusted_score;
END;
$$;

-- =====================================================
-- 3. FINAL WEIGHTED SCORE CALCULATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_final_weighted_score(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_score NUMERIC := 0;
  v_accuracy_score NUMERIC := 0;
  v_speed_score NUMERIC := 0;
  v_consistency_score NUMERIC := 0;
  v_improvement_score NUMERIC := 0;
  v_difficulty_adjusted NUMERIC := 0;
  v_tests_completed INT := 0;
  v_metrics RECORD;
  v_final_score NUMERIC := 0;
BEGIN
  -- Get basic metrics
  SELECT * INTO v_metrics
  FROM public.calculate_user_metrics(p_user_id, p_period_start, p_period_end);

  v_total_score := v_metrics.total_marks;
  v_accuracy_score := v_metrics.accuracy_percentage;
  v_consistency_score := v_metrics.consistency_score;
  v_improvement_score := v_metrics.improvement_score;
  v_tests_completed := v_metrics.tests_completed;
  v_difficulty_adjusted := public.calculate_difficulty_adjusted_score(p_user_id, p_period_start, p_period_end);

  -- Calculate speed score (lower time = higher score)
  -- Normalize to 0-100 where <60 sec/question = 100
  IF v_metrics.avg_speed > 0 THEN
    v_speed_score := GREATEST(0, LEAST(100, 100 - (v_metrics.avg_speed / 3.6))); -- 3.6 = 360/100
  ELSE
    v_speed_score := 50;
  END IF;

  -- Weighted formula:
  -- 40% base score, 20% accuracy, 15% speed, 15% consistency, 10% improvement
  -- Multiply by difficulty adjustment factor (max 1.5 for hard questions only)
  -- Require minimum 1 test completed
  
  IF v_tests_completed = 0 THEN
    RETURN 0;
  END IF;

  v_final_score := 
    (v_total_score * 0.40) +
    (v_accuracy_score * 0.20) +
    (v_speed_score * 0.15) +
    (v_consistency_score * 0.15) +
    (GREATEST(0, v_improvement_score + 100) / 2 * 0.10); -- Scale improvement to 0-100

  -- Apply difficulty adjustment bonus (up to 1.5x if user mainly does hard questions)
  IF v_difficulty_adjusted > 0 THEN
    v_final_score := v_final_score * LEAST(1.5, 1.0 + (v_difficulty_adjusted / (v_total_score + 1) * 0.5));
  END IF;

  RETURN v_final_score;
END;
$$;

-- =====================================================
-- 4. CREATE/UPDATE LEADERBOARD PERIOD
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_leaderboard_period(
  p_period public.leaderboard_period,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leaderboard_id UUID;
BEGIN
  INSERT INTO public.leaderboards (period, period_start, period_end, is_current)
  VALUES (p_period, p_period_start, p_period_end, true)
  ON CONFLICT (period, period_start) DO UPDATE
  SET is_current = true
  RETURNING id INTO v_leaderboard_id;

  -- Mark previous periods as non-current
  UPDATE public.leaderboards
  SET is_current = false
  WHERE period = p_period
    AND period_start < p_period_start;

  RETURN v_leaderboard_id;
END;
$$;

-- =====================================================
-- 5. CALCULATE AND UPDATE RANKINGS
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_leaderboard_rankings(
  p_leaderboard_id UUID
)
RETURNS TABLE (
  total_entries INT,
  calculation_duration_ms INT,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_calc_start TIMESTAMPTZ := now();
  v_total_entries INT := 0;
  v_user_id UUID;
  v_rank INT := 1;
  v_prev_score NUMERIC := -1;
  v_score NUMERIC;
  v_metrics RECORD;
  v_duration INT;
  v_total_users INT := 0;
BEGIN
  -- Get leaderboard details
  SELECT period_start, period_end
  INTO v_period_start, v_period_end
  FROM public.leaderboards
  WHERE id = p_leaderboard_id;

  IF v_period_start IS NULL THEN
    RETURN QUERY SELECT 0, 0, false;
    RETURN;
  END IF;

  -- Delete existing entries for this leaderboard
  DELETE FROM public.leaderboard_entries
  WHERE leaderboard_id = p_leaderboard_id;

  -- Get all users who completed at least 1 test in the period
  FOR v_user_id IN
    SELECT DISTINCT uph.user_id
    FROM public.user_performance_history uph
    WHERE uph.submitted_at >= v_period_start
      AND uph.submitted_at <= v_period_end
    ORDER BY (
      SELECT public.calculate_final_weighted_score(uph.user_id, v_period_start, v_period_end)
    ) DESC
  LOOP
    -- Get all metrics for the user
    SELECT * INTO v_metrics
    FROM public.calculate_user_metrics(v_user_id, v_period_start, v_period_end);

    -- Calculate final score
    v_score := public.calculate_final_weighted_score(v_user_id, v_period_start, v_period_end);

    -- Only include users with valid data
    IF v_metrics.tests_completed > 0 THEN
      v_total_users := v_total_users + 1;

      -- Update rank (handle ties)
      IF v_score < v_prev_score THEN
        v_rank := v_total_users;
      END IF;
      v_prev_score := v_score;

      -- Insert leaderboard entry
      INSERT INTO public.leaderboard_entries (
        leaderboard_id,
        user_id,
        rank,
        total_score,
        total_marks,
        accuracy_percentage,
        avg_speed,
        tests_completed,
        consistency_score,
        improvement_score,
        difficulty_adjusted_score,
        weighted_final_score,
        percentile
      )
      VALUES (
        p_leaderboard_id,
        v_user_id,
        v_rank,
        v_score,
        v_metrics.total_marks,
        v_metrics.accuracy_percentage,
        v_metrics.avg_speed,
        v_metrics.tests_completed,
        v_metrics.consistency_score,
        v_metrics.improvement_score,
        public.calculate_difficulty_adjusted_score(v_user_id, v_period_start, v_period_end),
        v_score,
        CASE WHEN v_total_users > 0 THEN ((v_rank - 1)::NUMERIC / v_total_users) * 100 ELSE 0 END
      );

      v_total_entries := v_total_entries + 1;
    END IF;
  END LOOP;

  -- Update percentiles
  WITH ranked_entries AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY weighted_final_score DESC) as row_num,
      COUNT(*) OVER () as total_count
    FROM public.leaderboard_entries
    WHERE leaderboard_id = p_leaderboard_id
  )
  UPDATE public.leaderboard_entries le
  SET percentile = (re.row_num::NUMERIC / NULLIF(re.total_count, 0)) * 100
  FROM ranked_entries re
  WHERE le.id = re.id;

  v_duration := EXTRACT(EPOCH FROM (now() - v_calc_start))::INT * 1000;

  -- Store snapshot
  INSERT INTO public.ranking_snapshots (leaderboard_id, snapshot_data, top_10_users, total_users_ranked, calculation_duration_ms)
  SELECT 
    p_leaderboard_id,
    jsonb_build_object(
      'calculation_time', v_duration,
      'total_users', v_total_users,
      'period_start', v_period_start,
      'period_end', v_period_end
    ),
    jsonb_agg(
      jsonb_build_object(
        'rank', le.rank,
        'user_id', le.user_id,
        'score', le.weighted_final_score,
        'accuracy', le.accuracy_percentage
      )
      ORDER BY le.rank
    ),
    v_total_users,
    v_duration
  FROM public.leaderboard_entries le
  WHERE le.leaderboard_id = p_leaderboard_id
    AND le.rank <= 10;

  RETURN QUERY SELECT v_total_entries, v_duration, true;
END;
$$;

-- =====================================================
-- 6. GET CURRENT LEADERBOARD
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_leaderboard(
  p_period public.leaderboard_period
)
RETURNS TABLE (
  rank INT,
  user_id UUID,
  user_name TEXT,
  weighted_final_score NUMERIC,
  total_marks INT,
  accuracy_percentage NUMERIC,
  tests_completed INT,
  consistency_score NUMERIC,
  improvement_score NUMERIC,
  percentile NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    le.rank,
    le.user_id,
    COALESCE(p.full_name, 'Anonymous') as user_name,
    le.weighted_final_score,
    le.total_marks,
    le.accuracy_percentage,
    le.tests_completed,
    le.consistency_score,
    le.improvement_score,
    le.percentile
  FROM public.leaderboard_entries le
  LEFT JOIN public.profiles p ON p.user_id = le.user_id
  WHERE le.leaderboard_id = (
    SELECT id FROM public.leaderboards
    WHERE period = p_period AND is_current = true
    LIMIT 1
  )
  ORDER BY le.rank
  LIMIT 500; -- Limit to top 500 for performance
END;
$$;

-- =====================================================
-- 7. GET USER RANK
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_leaderboard_rank(
  p_user_id UUID,
  p_period public.leaderboard_period
)
RETURNS TABLE (
  rank INT,
  weighted_final_score NUMERIC,
  total_marks INT,
  accuracy_percentage NUMERIC,
  tests_completed INT,
  percentile NUMERIC,
  total_users INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leaderboard_id UUID;
  v_total_users INT;
BEGIN
  -- Get current leaderboard for the period
  SELECT id INTO v_leaderboard_id
  FROM public.leaderboards
  WHERE period = p_period AND is_current = true;

  SELECT COUNT(*) INTO v_total_users
  FROM public.leaderboard_entries
  WHERE leaderboard_id = v_leaderboard_id;

  RETURN QUERY
  SELECT 
    le.rank,
    le.weighted_final_score,
    le.total_marks,
    le.accuracy_percentage,
    le.tests_completed,
    le.percentile,
    v_total_users
  FROM public.leaderboard_entries le
  WHERE le.leaderboard_id = v_leaderboard_id
    AND le.user_id = p_user_id;
END;
$$;

-- =====================================================
-- END OF RANKING FUNCTIONS
-- =====================================================

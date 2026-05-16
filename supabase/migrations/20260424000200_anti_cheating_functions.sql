-- =====================================================
-- ANTI-CHEATING DETECTION FUNCTIONS
-- Comprehensive anomaly detection for leaderboard integrity
-- =====================================================

-- =====================================================
-- 1. SCORE SPIKE DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_score_spike(
  p_user_id UUID,
  p_attempt_id UUID,
  p_current_score NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_avg NUMERIC;
  v_previous_stddev NUMERIC;
  v_spike_threshold NUMERIC;
  v_is_spike BOOLEAN := false;
BEGIN
  -- Get previous scores statistics (last 10 attempts)
  SELECT 
    AVG(uph.score),
    STDDEV_POP(uph.score)
  INTO v_previous_avg, v_previous_stddev
  FROM (
    SELECT uph.score
    FROM public.user_performance_history uph
    WHERE uph.user_id = p_user_id
      AND uph.attempt_id != p_attempt_id
    ORDER BY uph.submitted_at DESC
    LIMIT 10
  ) uph;

  -- If no previous data, cannot detect spike
  IF v_previous_avg IS NULL OR v_previous_avg = 0 THEN
    RETURN false;
  END IF;

  -- Spike threshold: 2.5 standard deviations from mean
  -- or 100% improvement over previous average
  v_spike_threshold := GREATEST(
    v_previous_avg + (v_previous_stddev * 2.5),
    v_previous_avg * 2.0
  );

  IF p_current_score > v_spike_threshold THEN
    v_is_spike := true;
  END IF;

  -- Log if spike detected
  IF v_is_spike THEN
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'score_spike',
      'high',
      'Unusual score increase detected',
      jsonb_build_object(
        'previous_avg', v_previous_avg,
        'current_score', p_current_score,
        'spike_threshold', v_spike_threshold,
        'std_dev', v_previous_stddev
      )
    );
  END IF;

  RETURN v_is_spike;
END;
$$;

-- =====================================================
-- 2. DUPLICATE ATTEMPT DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_duplicate_attempts(
  p_user_id UUID,
  p_test_id UUID,
  p_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_attempts INT;
  v_duplicate_found BOOLEAN := false;
  v_identical_answers INT;
  v_total_answers INT;
BEGIN
  -- Count previous attempts on the same test
  SELECT COUNT(*)
  INTO v_previous_attempts
  FROM public.attempts a
  WHERE a.user_id = p_user_id
    AND a.test_id = p_test_id
    AND a.id != p_attempt_id
    AND a.created_at > now() - INTERVAL '24 hours';

  -- If more than 5 attempts in 24 hours, potential cheating
  IF v_previous_attempts > 5 THEN
    v_duplicate_found := true;
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'duplicate_attempt',
      'medium',
      'Multiple attempts on same test within 24 hours',
      jsonb_build_object(
        'test_id', p_test_id,
        'attempts_24h', v_previous_attempts
      )
    );
    RETURN true;
  END IF;

  -- Check for identical answer patterns
  SELECT 
    COUNT(*) FILTER (WHERE ans.selected_option_id IS NOT NULL),
    COUNT(*)
  INTO v_identical_answers, v_total_answers
  FROM public.answers ans
  WHERE ans.attempt_id = p_attempt_id;

  -- If too few answers selected, might be skipping
  IF v_total_answers > 0 AND v_identical_answers < (v_total_answers * 0.3) THEN
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'duplicate_attempt',
      'low',
      'Many questions skipped/unanswered',
      jsonb_build_object(
        'answered', v_identical_answers,
        'total', v_total_answers,
        'percentage', (v_identical_answers::NUMERIC / v_total_answers * 100)::INT
      )
    );
  END IF;

  RETURN v_duplicate_found;
END;
$$;

-- =====================================================
-- 3. IMPOSSIBLE ACCURACY DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_impossible_accuracy(
  p_user_id UUID,
  p_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accuracy NUMERIC;
  v_user_avg_accuracy NUMERIC;
  v_user_std_dev NUMERIC;
  v_deviation_std NUMERIC;
  v_is_anomalous BOOLEAN := false;
  v_total_answers INT;
  v_correct_answers INT;
BEGIN
  -- Get current attempt's accuracy
  SELECT 
    COUNT(*) FILTER (WHERE ans.is_correct),
    COUNT(*)
  INTO v_correct_answers, v_total_answers
  FROM public.answers ans
  WHERE ans.attempt_id = p_attempt_id;

  IF v_total_answers = 0 THEN
    RETURN false;
  END IF;

  v_accuracy := (v_correct_answers::NUMERIC / v_total_answers) * 100;

  -- Get user's historical accuracy statistics
  SELECT 
    AVG(uph.accuracy_percentage),
    STDDEV_POP(uph.accuracy_percentage)
  INTO v_user_avg_accuracy, v_user_std_dev
  FROM public.user_performance_history uph
  WHERE uph.user_id = p_user_id
    AND uph.attempt_id != p_attempt_id;

  -- If insufficient history, use lenient threshold
  IF v_user_avg_accuracy IS NULL THEN
    RETURN false;
  END IF;

  -- Check deviation (>3 std devs is highly suspicious for accuracy)
  v_deviation_std := ABS(v_accuracy - v_user_avg_accuracy) / NULLIF(v_user_std_dev, 0);

  IF v_deviation_std > 3.0 THEN
    v_is_anomalous := true;
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'impossible_accuracy',
      'critical',
      'Accuracy extremely deviated from user pattern (>3σ)',
      jsonb_build_object(
        'current_accuracy', v_accuracy::INT,
        'user_avg', v_user_avg_accuracy::INT,
        'std_dev', v_user_std_dev::INT,
        'deviation_sigma', v_deviation_std::NUMERIC(5,2)
      )
    );
  END IF;

  RETURN v_is_anomalous;
END;
$$;

-- =====================================================
-- 4. SPEED ANOMALY DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_speed_anomaly(
  p_user_id UUID,
  p_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_duration INT;
  v_user_avg_speed INT;
  v_questions_count INT;
  v_min_possible_time INT;
  v_is_anomalous BOOLEAN := false;
BEGIN
  -- Get current attempt duration
  SELECT EXTRACT(EPOCH FROM (a.end_time - a.start_time))::INT
  INTO v_attempt_duration
  FROM public.attempts a
  WHERE a.id = p_attempt_id;

  IF v_attempt_duration IS NULL OR v_attempt_duration < 10 THEN
    RETURN false; -- Ignore incomplete attempts
  END IF;

  -- Get questions count in the test
  SELECT COUNT(*)
  INTO v_questions_count
  FROM public.answers ans
  WHERE ans.attempt_id = p_attempt_id;

  -- Get user's average time per question
  SELECT AVG(uph.time_taken)
  INTO v_user_avg_speed
  FROM public.user_performance_history uph
  WHERE uph.user_id = p_user_id
    AND uph.attempt_id != p_attempt_id;

  IF v_user_avg_speed IS NULL THEN
    v_user_avg_speed := 120; -- Default 2 minutes per question
  END IF;

  -- Calculate minimum possible time (30 sec per question minimum)
  v_min_possible_time := v_questions_count * 30;

  -- If actual time < 60% of normal speed AND < minimum viable time
  IF v_attempt_duration < (v_user_avg_speed * v_questions_count * 0.6)
    AND v_attempt_duration < v_min_possible_time
  THEN
    v_is_anomalous := true;
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'speed_anomaly',
      'high',
      'Test completed suspiciously fast (possibly automated)',
      jsonb_build_object(
        'actual_duration_sec', v_attempt_duration,
        'expected_duration_sec', (v_user_avg_speed * v_questions_count)::INT,
        'minimum_viable_sec', v_min_possible_time,
        'questions', v_questions_count
      )
    );
  END IF;

  RETURN v_is_anomalous;
END;
$$;

-- =====================================================
-- 5. PATTERN ABUSE DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_pattern_abuse(
  p_user_id UUID,
  p_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repeated_options INT;
  v_total_answers INT;
  v_is_anomalous BOOLEAN := false;
  v_common_option_count INT;
BEGIN
  -- Count answers for current attempt
  SELECT COUNT(*)
  INTO v_total_answers
  FROM public.answers ans
  WHERE ans.attempt_id = p_attempt_id;

  IF v_total_answers < 5 THEN
    RETURN false;
  END IF;

  -- Find the most selected option
  SELECT COUNT(*)
  INTO v_common_option_count
  FROM public.answers ans
  WHERE ans.attempt_id = p_attempt_id
  GROUP BY ans.selected_option_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- If same option selected for >40% of questions, suspicious
  IF v_common_option_count > (v_total_answers * 0.4) THEN
    v_is_anomalous := true;
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'pattern_abuse',
      'medium',
      'Suspicious pattern: Same option selected too frequently',
      jsonb_build_object(
        'same_option_count', v_common_option_count,
        'total_answers', v_total_answers,
        'percentage', (v_common_option_count::NUMERIC / v_total_answers * 100)::INT
      )
    );
  END IF;

  RETURN v_is_anomalous;
END;
$$;

-- =====================================================
-- 6. SUSPICIOUS IMPROVEMENT DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.detect_suspicious_improvement(
  p_user_id UUID,
  p_attempt_id UUID,
  p_current_score NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_avg NUMERIC;
  v_improvement_percentage NUMERIC;
  v_is_suspicious BOOLEAN := false;
  v_recent_attempts INT;
BEGIN
  -- Get previous average (last 5 attempts)
  SELECT 
    AVG(uph.score),
    COUNT(*)
  INTO v_previous_avg, v_recent_attempts
  FROM (
    SELECT uph.score
    FROM public.user_performance_history uph
    WHERE uph.user_id = p_user_id
      AND uph.attempt_id != p_attempt_id
    ORDER BY uph.submitted_at DESC
    LIMIT 5
  ) uph;

  IF v_previous_avg IS NULL OR v_previous_avg = 0 THEN
    RETURN false;
  END IF;

  -- Calculate improvement percentage
  v_improvement_percentage := ((p_current_score - v_previous_avg) / v_previous_avg) * 100;

  -- Flag suspicious improvement (>150% in single attempt)
  IF v_improvement_percentage > 150 THEN
    v_is_suspicious := true;
    INSERT INTO public.anomaly_logs (
      user_id, attempt_id, anomaly_type, severity, description, evidence
    )
    VALUES (
      p_user_id,
      p_attempt_id,
      'suspicious_improvement',
      'high',
      'Suspiciously large score improvement in single attempt',
      jsonb_build_object(
        'previous_avg', v_previous_avg::INT,
        'current_score', p_current_score::INT,
        'improvement_percentage', v_improvement_percentage::INT,
        'recent_attempts', v_recent_attempts
      )
    );
  END IF;

  RETURN v_is_suspicious;
END;
$$;

-- =====================================================
-- 7. COMPREHENSIVE ANOMALY CHECK
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_attempt_anomalies(
  p_user_id UUID,
  p_attempt_id UUID,
  p_test_id UUID,
  p_score NUMERIC
)
RETURNS TABLE (
  has_anomalies BOOLEAN,
  anomaly_count INT,
  max_severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anomaly_count INT := 0;
  v_max_severity TEXT := 'low';
  v_spike_detected BOOLEAN;
  v_duplicate_detected BOOLEAN;
  v_impossible_acc_detected BOOLEAN;
  v_speed_detected BOOLEAN;
  v_pattern_detected BOOLEAN;
  v_improvement_detected BOOLEAN;
BEGIN
  -- Run all anomaly detection checks
  v_spike_detected := public.detect_score_spike(p_user_id, p_attempt_id, p_score);
  IF v_spike_detected THEN v_anomaly_count := v_anomaly_count + 1; END IF;

  v_duplicate_detected := public.detect_duplicate_attempts(p_user_id, p_test_id, p_attempt_id);
  IF v_duplicate_detected THEN v_anomaly_count := v_anomaly_count + 1; END IF;

  v_impossible_acc_detected := public.detect_impossible_accuracy(p_user_id, p_attempt_id);
  IF v_impossible_acc_detected THEN v_anomaly_count := v_anomaly_count + 1; END IF;

  v_speed_detected := public.detect_speed_anomaly(p_user_id, p_attempt_id);
  IF v_speed_detected THEN v_anomaly_count := v_anomaly_count + 1; END IF;

  v_pattern_detected := public.detect_pattern_abuse(p_user_id, p_attempt_id);
  IF v_pattern_detected THEN v_anomaly_count := v_anomaly_count + 1; END IF;

  v_improvement_detected := public.detect_suspicious_improvement(p_user_id, p_attempt_id, p_score);
  IF v_improvement_detected THEN v_anomaly_count := v_anomaly_count + 1; END IF;

  -- Determine max severity based on detections
  IF v_impossible_acc_detected OR (v_anomaly_count >= 3) THEN
    v_max_severity := 'critical';
  ELSIF v_spike_detected OR v_speed_detected OR v_improvement_detected THEN
    v_max_severity := 'high';
  ELSIF v_pattern_detected OR v_duplicate_detected THEN
    v_max_severity := 'medium';
  ELSE
    v_max_severity := 'low';
  END IF;

  RETURN QUERY SELECT 
    (v_anomaly_count > 0)::BOOLEAN,
    v_anomaly_count,
    v_max_severity;
END;
$$;

-- =====================================================
-- 8. MARK ANOMALY AS REVIEWED
-- =====================================================

CREATE OR REPLACE FUNCTION public.review_anomaly(
  p_anomaly_id UUID,
  p_action TEXT,
  p_notes TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.anomaly_logs
  SET 
    is_verified = true,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    action_taken = p_action
  WHERE id = p_anomaly_id;

  RETURN FOUND;
END;
$$;

-- =====================================================
-- 9. AUTO-VALIDATE SCORE SUBMISSION
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_score_submission(
  p_user_id UUID,
  p_attempt_id UUID,
  p_test_id UUID,
  p_score NUMERIC
)
RETURNS TABLE (
  is_valid BOOLEAN,
  has_anomalies BOOLEAN,
  severity TEXT,
  should_flag BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anomaly_result RECORD;
BEGIN
  -- Run comprehensive anomaly check
  SELECT * INTO v_anomaly_result
  FROM public.check_attempt_anomalies(p_user_id, p_attempt_id, p_test_id, p_score);

  -- Auto-flag if critical severity or multiple anomalies
  RETURN QUERY SELECT 
    NOT v_anomaly_result.has_anomalies OR v_anomaly_result.max_severity NOT IN ('critical'),
    v_anomaly_result.has_anomalies,
    v_anomaly_result.max_severity,
    (v_anomaly_result.anomaly_count >= 3 OR v_anomaly_result.max_severity = 'critical')::BOOLEAN;
END;
$$;

-- =====================================================
-- END OF ANTI-CHEATING FUNCTIONS
-- =====================================================

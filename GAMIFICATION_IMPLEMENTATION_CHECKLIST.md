# Gamification System - Implementation Checklist

## Phase 1: Database Setup ✅

### Migrations
- [ ] **Migration 000000**: Apply gamification schema
  ```bash
  supabase migration up 20260424000000
  ```
  Verifies:
  - [ ] 8 new tables created
  - [ ] 16 achievements inserted
  - [ ] RLS policies enabled
  - [ ] Realtime publications created

- [ ] **Migration 000100**: Apply ranking functions
  ```bash
  supabase migration up 20260424000100
  ```
  Verifies:
  - [ ] calculate_user_metrics() function created
  - [ ] calculate_final_weighted_score() function created
  - [ ] calculate_leaderboard_rankings() function created
  - [ ] get_current_leaderboard() function created

- [ ] **Migration 000200**: Apply anti-cheating functions
  ```bash
  supabase migration up 20260424000200
  ```
  Verifies:
  - [ ] detect_score_spike() function created
  - [ ] detect_duplicate_attempts() function created
  - [ ] check_attempt_anomalies() function created
  - [ ] validate_score_submission() function created

- [ ] **Migration 000300**: Apply scheduled jobs
  ```bash
  supabase migration up 20260424000300
  ```
  Verifies:
  - [ ] schedule_weekly_ranking_job() function created
  - [ ] schedule_monthly_ranking_job() function created
  - [ ] schedule_anomaly_detection_job() function created
  - [ ] execute_scheduled_jobs() function created

### Verification
- [ ] Query created tables:
  ```sql
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name LIKE '%gamification%';
  -- Should return 8
  ```

- [ ] Verify achievements inserted:
  ```sql
  SELECT COUNT(*) FROM public.achievements;
  -- Should return 16
  ```

- [ ] Check RLS policies:
  ```sql
  SELECT COUNT(*) FROM pg_policies;
  -- Should have policies for all gamification tables
  ```

---

## Phase 2: Frontend Component Setup ✅

### Component Files
- [ ] **RankBadges.tsx** - Badge display component
  - [ ] Displays top 10, 100, 500 badges
  - [ ] Shows accuracy master badge (>=90%)
  - [ ] Shows speed demon badge (<120s/q)
  - [ ] Shows consistency king badge

- [ ] **StreakIndicator.tsx** - Streak tracking component
  - [ ] Displays current streak count
  - [ ] Shows longest streak
  - [ ] Displays milestone messages (7/14/30)
  - [ ] Shows "last activity" date

- [ ] **UserProfileCard.tsx** - Profile stats component
  - [ ] Displays rank number
  - [ ] Shows XP level and progress bar
  - [ ] Displays accuracy percentage
  - [ ] Shows tests completed count
  - [ ] Shows reward points
  - [ ] Displays current streak
  - [ ] Shows reward tier (1-5)

- [ ] **PercentileComparison.tsx** - Percentile display
  - [ ] Displays user percentile with gradient
  - [ ] Shows users above/below counts
  - [ ] Shows percentile tier label
  - [ ] Displays motivation message

- [ ] **LeaderboardEntry.tsx** - Rank row component
  - [ ] Shows rank number (1-500)
  - [ ] Displays rank badges for top 3
  - [ ] Shows user name
  - [ ] Displays score
  - [ ] Shows accuracy percentage
  - [ ] Displays tests completed
  - [ ] Shows consistency score
  - [ ] Displays improvement trend
  - [ ] Has animated entrance
  - [ ] Highlights current user

- [ ] **LeaderboardFilters.tsx** - Filter/sort controls
  - [ ] Period tabs (Weekly/Monthly)
  - [ ] Filter type buttons (Global/Friends/Nearby)
  - [ ] Sort dropdown (Score/Accuracy/Consistency/Improvement)
  - [ ] Metric explanation badges

- [ ] **RewardUnlocks.tsx** - Reward animation component
  - [ ] Shows new rewards with animation
  - [ ] Displays XP and points summary
  - [ ] Lists recent unlocks with expand/collapse
  - [ ] Shows reward tier visualization
  - [ ] Shows next reward hints

### Page File
- [ ] **LeaderboardPage.tsx** - Main dashboard page
  - [ ] Header with live/offline status badge
  - [ ] 3-column stats section (Profile, Percentile, Rewards)
  - [ ] Badges section showing achievements
  - [ ] Filters section with all controls
  - [ ] Leaderboard table with pagination
  - [ ] Share ranking button
  - [ ] Error handling with fallback UI
  - [ ] Loading states with skeleton
  - [ ] Real-time vs fallback data handling

---

## Phase 3: API & Integration Layer ✅

### API File
- [ ] **leaderboard-api.ts** - Complete API layer
  - [ ] Leaderboard functions
    - [ ] getCurrentLeaderboard()
    - [ ] getUserRank()
    - [ ] getLeaderboardRangeByRank()
  - [ ] Profile functions
    - [ ] getUserGameStats()
    - [ ] updateUserXp()
    - [ ] updateRewardPoints()
  - [ ] Performance tracking
    - [ ] recordPerformanceHistory()
    - [ ] getUserPerformanceHistory()
  - [ ] Streak management
    - [ ] updateUserStreak()
  - [ ] Validation
    - [ ] validateAttempt()
    - [ ] getAnomalyLogs()
  - [ ] Achievements
    - [ ] checkAndAwardAchievements()
  - [ ] Subscriptions
    - [ ] subscribeToLeaderboardChanges()
    - [ ] subscribeToUserStats()

### Hooks File
- [ ] **useLeaderboard.ts** - Custom hooks
  - [ ] useLeaderboard(period) hook
  - [ ] useUserRank(period) hook
  - [ ] useUserGameStats() hook
  - [ ] useStreak() hook
  - [ ] usePerformanceHistory(limit) hook
  - [ ] useLeaderboardPeriods() hook
  - [ ] useRealTimeLeaderboard(period) hook

---

## Phase 4: Routing & Navigation ✅

### App Configuration
- [ ] Add leaderboard route to router
  ```typescript
  {
    path: "/leaderboard",
    element: <LeaderboardPage />,
    protected: true  // Requires authentication
  }
  ```

### Navigation Component
- [ ] Add leaderboard link to navigation menu
  ```typescript
  <NavLink 
    to="/leaderboard" 
    label="Leaderboards" 
    icon={Trophy} 
  />
  ```

### Breadcrumbs (if applicable)
- [ ] Add leaderboard to breadcrumb navigation
- [ ] Ensure proper hierarchy: Dashboard → Leaderboards

---

## Phase 5: Test Engine Integration 🔄

### TestEnginePage Updates
- [ ] Import required functions:
  ```typescript
  import {
    recordPerformanceHistory,
    validateAttempt,
    checkAndAwardAchievements,
    updateUserStreak
  } from '@/integrations/supabase/leaderboard-api';
  ```

- [ ] On test submission, add performance recording:
  ```typescript
  const validation = await validateAttempt(userId, attemptId, testId, score);
  if (!validation.shouldFlag || userConfirmed) {
    await recordPerformanceHistory(/* ... */);
    await updateUserStreak(userId, 'daily');
    await checkAndAwardAchievements(userId, metrics);
  }
  ```

- [ ] Display anti-cheating warnings if needed
- [ ] Show XP/points earned in test results
- [ ] Add achievement unlock notifications

### PerformancePage Updates
- [ ] Add gamification stats section:
  ```typescript
  import { UserProfileCard, RankBadges, StreakIndicator } from '@/features/gamification';
  ```
  
- [ ] Display user gamification profile:
  ```typescript
  <UserProfileCard rank={rank} stats={stats} />
  ```

- [ ] Show achievements/badges
- [ ] Display leaderboard link

---

## Phase 6: Job Scheduling Setup 🚀

### Option A: Supabase Edge Functions (Recommended)

- [ ] Create Edge Function:
  ```bash
  supabase functions new run-ranking-jobs
  ```

- [ ] Implement function (see GAMIFICATION_SETUP_GUIDE.md)

- [ ] Deploy function:
  ```bash
  supabase functions deploy run-ranking-jobs
  ```

- [ ] Set up external trigger (cron-job.org, GitHub Actions, etc.)
  - Endpoint: `https://your-domain.supabase.co/functions/v1/run-ranking-jobs`
  - Frequency: Daily (or hourly for more frequent updates)

### Option B: External Cron Service

- [ ] Use cron-job.org
  - [ ] Create account at cron-job.org
  - [ ] Create new scheduled job
  - [ ] Set URL to: `https://your-domain/api/ranking-jobs`
  - [ ] Set frequency: Daily at 00:00 UTC
  - [ ] Enable notifications for failures

### Option C: Manual Testing (Development)

- [ ] Test job execution manually:
  ```typescript
  const { data, error } = await supabase.rpc('execute_scheduled_jobs');
  console.log(data);
  ```

- [ ] Verify job_state table is updated:
  ```sql
  SELECT * FROM public.ranking_job_state 
  ORDER BY last_run_at DESC LIMIT 5;
  ```

---

## Phase 7: Configuration & Customization

### Ranking Weights
- [ ] Review current ranking formula (40/20/15/15/10)
- [ ] Adjust if needed based on your priorities
- [ ] Test impact with sample data

### Achievement Criteria
- [ ] Review 16 default achievements
- [ ] Customize XP/point rewards if needed
- [ ] Add custom badges for specific use cases

### Anti-Cheating Thresholds
- [ ] Review anomaly detection thresholds
- [ ] Adjust spike detection multipliers (1.5-3.0)
- [ ] Set appropriate speed minimums
- [ ] Configure pattern abuse detection sensitivity

---

## Phase 8: Testing & Validation

### Database Tests
- [ ] Run sample ranking calculation:
  ```sql
  SELECT * FROM public.calculate_leaderboard_rankings(leaderboard_id);
  ```

- [ ] Test anomaly detection:
  ```sql
  SELECT * FROM public.check_attempt_anomalies(user_id, attempt_id, test_id, score);
  ```

- [ ] Verify achievement awards:
  ```sql
  SELECT * FROM public.user_achievements 
  WHERE achieved_at > now() - INTERVAL '1 day';
  ```

- [ ] Check streak updates:
  ```sql
  SELECT * FROM public.user_streaks 
  ORDER BY updated_at DESC LIMIT 10;
  ```

### Frontend Tests
- [ ] [ ] LeaderboardPage loads without errors
- [ ] [ ] Leaderboard data displays correctly
- [ ] [ ] Real-time updates work (make test change, check update)
- [ ] [ ] Filters work (period, type, sort)
- [ ] [ ] Pagination works
- [ ] [ ] Share button works
- [ ] [ ] Achievement badges display correctly
- [ ] [ ] Streak indicator shows correct values
- [ ] [ ] User profile card shows accurate data
- [ ] [ ] Percentile comparison displays correctly

### Integration Tests
- [ ] [ ] Complete test → Performance recorded → Rank updated
- [ ] [ ] Achievement unlocked → Badge displayed → XP awarded
- [ ] [ ] Streak updated correctly on consecutive tests
- [ ] [ ] Anti-cheating flags suspicious attempts
- [ ] [ ] Multiple users visible on leaderboard
- [ ] [ ] Rankings recalculate correctly

### Performance Tests
- [ ] [ ] Leaderboard loads in <500ms
- [ ] [ ] 500 entries render smoothly
- [ ] [ ] Pagination doesn't cause lag
- [ ] [ ] Real-time updates are smooth
- [ ] [ ] No memory leaks in subscriptions

---

## Phase 9: Deployment Preparation

### Code Review
- [ ] [ ] All TypeScript types are correct
- [ ] [ ] No console.logs left in production code
- [ ] [ ] Error handling is comprehensive
- [ ] [ ] Security best practices followed
- [ ] [ ] RLS policies are correct

### Documentation Review
- [ ] [ ] GAMIFICATION_QUICKSTART.md is accurate
- [ ] [ ] GAMIFICATION_SETUP_GUIDE.md is complete
- [ ] [ ] GAMIFICATION_README.md has all details
- [ ] [ ] Inline code comments are clear

### Environment Setup
- [ ] [ ] SUPABASE_URL is correct
- [ ] [ ] SUPABASE_ANON_KEY is correct
- [ ] [ ] All functions are published (no drafts)
- [ ] [ ] RLS policies are enabled in production

### Monitoring Setup
- [ ] [ ] Set up error logging
- [ ] [ ] Configure anomaly log alerts
- [ ] [ ] Monitor ranking job execution
- [ ] [ ] Track API performance metrics

---

## Phase 10: Go-Live Checklist

### Pre-Launch
- [ ] [ ] All migrations applied to production database
- [ ] [ ] All components deployed to production
- [ ] [ ] Job scheduler is running
- [ ] [ ] Monitoring is active
- [ ] [ ] Team is trained on new features
- [ ] [ ] Documentation is accessible

### Launch Day
- [ ] [ ] Feature flag enabled (if using)
- [ ] [ ] Leaderboard route is accessible
- [ ] [ ] Test integration is working
- [ ] [ ] Real-time updates are active
- [ ] [ ] Admin can review anomalies

### Post-Launch
- [ ] [ ] Monitor error logs for issues
- [ ] [ ] Check anomaly detection for false positives
- [ ] [ ] Verify rankings update correctly
- [ ] [ ] Collect user feedback
- [ ] [ ] Make adjustments as needed

---

## Phase 11: Ongoing Maintenance

### Daily
- [ ] [ ] Check ranking job execution logs
- [ ] [ ] Monitor database performance
- [ ] [ ] Review flagged anomalies

### Weekly
- [ ] [ ] Review leaderboard accuracy
- [ ] [ ] Check achievement distribution
- [ ] [ ] Verify streak calculations
- [ ] [ ] Monitor disk usage

### Monthly
- [ ] [ ] Analyze user engagement metrics
- [ ] [ ] Review anti-cheating effectiveness
- [ ] [ ] Optimize slow queries
- [ ] [ ] Archive old rankings
- [ ] [ ] Adjust achievement criteria if needed

### Quarterly
- [ ] [ ] Plan new gamification features
- [ ] [ ] Review system performance
- [ ] [ ] Update documentation
- [ ] [ ] Plan major versions

---

## Troubleshooting Checklist

### If leaderboard is empty:
- [ ] Check user_gamification_profile table has records
- [ ] Verify user_performance_history has test records
- [ ] Run `calculate_leaderboard_rankings()` manually
- [ ] Check for RLS policy issues

### If rankings not updating:
- [ ] Verify ranking_job_state for failed jobs
- [ ] Check cron job execution logs
- [ ] Run `execute_scheduled_jobs()` manually
- [ ] Check database error logs

### If achievements not awarded:
- [ ] Verify achievements table has 16 records
- [ ] Check achievement IDs in awards function
- [ ] Verify user_achievements table structure
- [ ] Test `checkAndAwardAchievements()` manually

### If real-time not working:
- [ ] Check realtime publication includes tables
- [ ] Verify Supabase realtime is enabled
- [ ] Check browser WebSocket connection
- [ ] Review subscription error messages

### If anomalies always flagging:
- [ ] Review current thresholds
- [ ] Lower spike detection multiplier
- [ ] Increase speed anomaly tolerance
- [ ] Review flagged attempts manually

---

## Sign-Off

- [ ] **Developer**: System fully implemented ___________
- [ ] **QA**: All tests passed ___________
- [ ] **Product Manager**: Ready for launch ___________
- [ ] **Operations**: Monitoring configured ___________

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-24  
**Status**: Ready for Implementation

---

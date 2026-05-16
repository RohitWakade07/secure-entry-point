# Gamification Leaderboard System - Complete Documentation

## 🎮 System Overview

The Gamification Leaderboard System is a comprehensive, production-ready solution for transforming your GATE preparation application into a highly competitive learning ecosystem. It tracks performance metrics, calculates dynamic rankings, awards achievements, manages streaks, and includes advanced anti-cheating mechanisms.

### Key Features

✅ **Real-Time Leaderboards**
- Weekly and monthly ranking periods
- Live updates via WebSocket subscriptions
- Automatic ranking recalculation
- Top 500 global rankings displayed

✅ **Intelligent Ranking Algorithm**
- 40% Base Score (total marks)
- 20% Accuracy Percentage
- 15% Speed (questions answered per minute)
- 15% Consistency (performance stability)
- 10% Improvement Trend
- Difficulty-adjusted scoring to prevent easy-question exploitation

✅ **Gamification Elements**
- 16+ Achievement Badges (Top 10, Accuracy Master, Speed Demon, etc.)
- XP & Reward Points progression system
- Daily and Weekly streak tracking
- Milestone celebrations (50/100/500 tests)
- Rank badges showing elite status

✅ **User Engagement**
- Percentile comparison with detailed analytics
- Friend & nearby user leaderboards
- Performance history tracking
- Motivational progress nudges
- Reward unlock animations
- Share ranking functionality

✅ **Anti-Cheating System** (6-tier detection)
1. Score Spike Detection - flags unusual score jumps
2. Duplicate Attempt Detection - detects rapid retesting
3. Impossible Accuracy Detection - statistical anomalies
4. Speed Anomaly Detection - suspiciously fast completions
5. Pattern Abuse Detection - repeated same-answer patterns
6. Suspicious Improvement Detection - unrealistic gains

✅ **Automated Scheduling**
- Weekly ranking recalculation (Mondays)
- Monthly champion awards (1st of month)
- Hourly anomaly detection sweeps
- Daily streak maintenance
- Historical record preservation

✅ **Production-Ready**
- Row Level Security (RLS) enforcement
- Real-time replication
- Indexed queries for performance
- Error logging and monitoring
- Admin review workflows
- Extensible architecture

---

## 📊 Architecture

### Database Schema (8 Core Tables)

```
┌─────────────────────────────────────────────────────────────┐
│                   user_gamification_profile                 │
│  Stores: XP, reward points, streaks, overall statistics    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        leaderboards                         │
│  Period definitions (weekly/monthly) with date ranges      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   leaderboard_entries                       │
│  User rankings, scores, metrics for each period            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              user_performance_history                       │
│  Detailed test-by-test metrics for trending & analytics    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              user_achievements & achievements               │
│  Earned badges and achievement definitions                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   user_streaks                              │
│  Daily and weekly consistency tracking                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   anomaly_logs                              │
│  Anti-cheating detection records with severity levels      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              ranking_job_state & ranking_snapshots          │
│  Scheduler state tracking and snapshot history             │
└─────────────────────────────────────────────────────────────┘
```

### RPC Functions (20+ Critical Functions)

**Ranking Calculations:**
- `calculate_user_metrics()` - Computes all performance metrics
- `calculate_difficulty_adjusted_score()` - Prevents easy-question exploitation
- `calculate_final_weighted_score()` - Multi-factor ranking score
- `calculate_leaderboard_rankings()` - Full ranking generation
- `get_current_leaderboard()` - Fetch active period leaderboard
- `get_user_leaderboard_rank()` - Individual user rank retrieval

**Anti-Cheating:**
- `detect_score_spike()` - Catches unusual score jumps
- `detect_duplicate_attempts()` - Detects rapid retesting
- `detect_impossible_accuracy()` - Statistical anomaly detection
- `detect_speed_anomaly()` - Automated completion detection
- `detect_pattern_abuse()` - Same-answer pattern detection
- `detect_suspicious_improvement()` - Unrealistic gain detection
- `check_attempt_anomalies()` - Comprehensive anomaly check
- `validate_score_submission()` - Pre-submission validation

**Scheduling:**
- `schedule_weekly_ranking_job()` - Monday rankings
- `schedule_monthly_ranking_job()` - Monthly champion awards
- `schedule_anomaly_detection_job()` - Continuous monitoring
- `schedule_streak_update_job()` - Streak maintenance
- `execute_scheduled_jobs()` - Master scheduler

---

## 🚀 API Reference

### leaderboard-api.ts

#### Leaderboard Retrieval

```typescript
// Get current leaderboard for a period
const leaderboard = await getCurrentLeaderboard('weekly', 100);
// Returns: UserRank[] sorted by rank

// Get user's current rank
const userRank = await getUserRank(userId, 'monthly');
// Returns: UserRank | null with full stats

// Get specific rank range
const topUsers = await getLeaderboardRangeByRank('weekly', 1, 100);
// Returns: UserRank[] for ranks 1-100
```

#### User Gamification Profile

```typescript
// Get complete gamification stats
const stats = await getUserGameStats(userId);
// Returns: UserGameStats with XP, points, achievements, streaks

// Update XP (called after test)
const newXp = await updateUserXp(userId, 100);

// Update reward points (called after milestone)
const newPoints = await updateRewardPoints(userId, 50);
```

#### Performance Tracking

```typescript
// Record test result
await recordPerformanceHistory(
  userId,
  attemptId,
  testId,
  score,        // 0-100+
  maxScore,     // e.g., 100
  accuracy,     // 0-100 percentage
  timeTaken,    // seconds
  difficulty,   // 'easy' | 'medium' | 'hard'
  correctCount,
  totalQuestions,
  xpEarned,     // e.g., 100
  pointsEarned  // e.g., 50
);

// Get performance history
const history = await getUserPerformanceHistory(userId, 50);
// Returns: array of last 50 test results
```

#### Streak Management

```typescript
// Update/create streak on test completion
const { currentStreak, longestStreak } = await updateUserStreak(
  userId,
  'daily' // or 'weekly'
);
```

#### Anti-Cheating

```typescript
// Validate attempt before recording
const validation = await validateAttempt(userId, attemptId, testId, score);
// Returns: {
//   isValid: boolean,
//   hasAnomalies: boolean,
//   severity: 'low' | 'medium' | 'high' | 'critical',
//   shouldFlag: boolean
// }

// Get user's anomaly logs
const anomalies = await getAnomalyLogs(userId);
```

#### Achievements

```typescript
// Check and award achievements based on metrics
await checkAndAwardAchievements(userId, {
  rank: 15,
  accuracy: 92.5,
  testsCompleted: 150,
  streak: 21
});
```

#### Real-Time Subscriptions

```typescript
// Subscribe to leaderboard changes
const subscription = subscribeToLeaderboardChanges('weekly', (data) => {
  console.log('Leaderboard updated:', data);
});

// Subscribe to user stats changes
const statsSubscription = subscribeToUserStats(userId, (stats) => {
  console.log('Your stats updated:', stats);
});

// Cleanup
subscription.unsubscribe();
statsSubscription.unsubscribe();
```

---

## 🎣 Custom Hooks

### useLeaderboard(period)

```typescript
const { data, loading, error, lastUpdated, refetch } = useLeaderboard('weekly');

// data: UserRank[] - full leaderboard
// loading: boolean - fetching state
// error: string | null - error message
// lastUpdated: Date | null - when data was fetched
// refetch: () => void - manually refresh
```

### useUserRank(period)

```typescript
const { rank, loading, error } = useUserRank('weekly');

// rank: UserRank | null - user's current rank with full stats
// loading: boolean - fetching state
// error: string | null - error message
```

### useUserGameStats()

```typescript
const { stats, loading, error } = useUserGameStats();

// stats: UserGameStats | null - XP, points, achievements, streaks
// loading: boolean - fetching state
// error: string | null - error message
```

### useStreak()

```typescript
const { streaks, loading, updateStreak } = useStreak();

// streaks: { daily: {current, longest}, weekly: {...} } | null
// loading: boolean - updating state
// updateStreak: (type: 'daily' | 'weekly') => void - manual update
```

### usePerformanceHistory(limit)

```typescript
const { history, loading, error } = usePerformanceHistory(50);

// history: any[] - test results in reverse chronological order
// loading: boolean - fetching state
// error: string | null - error message
```

### useRealTimeLeaderboard(period)

```typescript
const {
  leaderboard,
  isInitializing,
  error,
  connectionStatus,
} = useRealTimeLeaderboard('weekly');

// leaderboard: UserRank[] - live-updated rankings
// isInitializing: boolean - connection establishing
// error: string | null - connection error
// connectionStatus: 'connected' | 'disconnected' | 'error'
```

---

## 🎨 Component Reference

### LeaderboardDashboard (Full Page)

Complete leaderboard experience with user stats, filters, and rankings.

```typescript
import { LeaderboardPage } from '@/features/gamification';

// Add to routing:
<Route path="/leaderboard" element={<LeaderboardPage />} />
```

### RankBadges

Visual badges showing user achievements.

```typescript
<RankBadges
  rank={15}
  accuracy={92.5}
  speed={90}  // seconds per question
  consistency={85}  // 0-100
  testsCompleted={150}
  streak={21}
/>
```

Displays: Top badges, accuracy, speed, consistency, milestone badges

### StreakIndicator

Shows current and longest streaks with progress.

```typescript
<StreakIndicator
  currentStreak={21}
  longestStreak={45}
  lastActivityDate={new Date().toISOString()}
/>
```

Features: Progress to milestone, milestone messages, streak motivation

### UserProfileCard

Comprehensive gamification profile summary.

```typescript
<UserProfileCard
  userName="John Doe"
  rank={25}
  totalXp={15000}
  rewardPoints={300}
  accuracy={92.5}
  testsCompleted={150}
  currentStreak={21}
/>
```

Shows: XP level, accuracy, tests, rewards, streak, tier progress

### PercentileComparison

Shows where user stands against all other users.

```typescript
<PercentileComparison
  userPercentile={92.5}
  userRank={15}
  totalUsers={5000}
/>
```

Features: Percentile visualization, tier badge, users above/below, motivation

### RewardUnlocks

Recent achievements and reward animations.

```typescript
<RewardUnlocks
  rewards={[
    {
      id: '1',
      name: 'First Test',
      description: 'Complete your first test',
      icon: 'trophy',
      amount: 50,
      unlockedAt: date,
      isNew: true
    }
  ]}
  totalXp={15000}
  totalPoints={300}
/>
```

Shows: New rewards, milestone progress, reward tier

### LeaderboardEntry

Individual leaderboard row with animations.

```typescript
<LeaderboardEntry
  rank={1}
  userName="Top User"
  score={9500.50}
  accuracy={95.5}
  testsCompleted={200}
  consistency={92}
  improvement={15}
  percentile={99.5}
  isCurrentUser={false}
  animationDelay={0}
/>
```

### LeaderboardFilters

Period, type, and sort controls.

```typescript
<LeaderboardFilters
  period="weekly"
  onPeriodChange={(p) => setPeriod(p)}
  filterType="global"
  onFilterChange={(f) => setFilterType(f)}
  sortBy="score"
  onSortChange={(s) => setSortBy(s)}
/>
```

Options:
- Period: weekly, monthly
- Type: global, friends, nearby
- Sort: score, accuracy, consistency, improvement

---

## 🔒 Anti-Cheating Deep Dive

### Anomaly Detection Triggers

#### 1. Score Spike Detection
- **Trigger**: Score > (avg + 2.5σ) OR > avg × 2.0
- **Severity**: HIGH
- **Evidence**: Previous average, current score, threshold, std dev
- **Use Case**: Catches unauthorized content access

#### 2. Duplicate Attempt Detection
- **Trigger**: >5 attempts on same test in 24h
- **Severity**: MEDIUM
- **Evidence**: Test ID, attempts count
- **Use Case**: Detects pattern exploiting

#### 3. Impossible Accuracy Detection
- **Trigger**: Accuracy > 3σ from user's norm
- **Severity**: CRITICAL
- **Evidence**: Current accuracy, user average, sigma
- **Use Case**: Catches AI/ML assistance

#### 4. Speed Anomaly Detection
- **Trigger**: Time < 60% of normal AND < 30 sec/question
- **Severity**: HIGH
- **Evidence**: Duration, expected time, minimum viable time
- **Use Case**: Detects automation/bots

#### 5. Pattern Abuse Detection
- **Trigger**: Same option selected >40% of answers
- **Severity**: MEDIUM
- **Evidence**: Same option count, percentage
- **Use Case**: Detects answer key usage

#### 6. Suspicious Improvement Detection
- **Trigger**: Improvement > 150% in single attempt
- **Severity**: HIGH
- **Evidence**: Previous average, current score, improvement %
- **Use Case**: Catches sudden jumps

### Severity Levels

- **LOW**: Monitored, not flagged
- **MEDIUM**: Logged, flagged if multiple detections
- **HIGH**: Flagged for review, score may be excluded
- **CRITICAL**: Immediate manual review required

### Response Actions

```sql
-- Review anomalies
SELECT * FROM public.anomaly_logs
WHERE is_flagged = true AND is_verified = false
ORDER BY severity DESC;

-- Mark as reviewed
SELECT * FROM public.review_anomaly(
  anomaly_id,
  'approved',  -- 'approved', 'disqualified', 'reviewed'
  'Manual verification completed'
);
```

---

## 📈 Metrics & Analytics

### Available Metrics

```typescript
interface UserRank {
  rank: number;                    // 1-based rank
  userId: string;
  userName: string;
  finalScore: number;              // Weighted score 0-10000+
  totalMarks: number;              // Sum of all test marks
  accuracy: number;                // 0-100%
  testsCompleted: number;          // Count
  consistency: number;             // 0-100 stability score
  improvement: number;             // -100 to +100%
  percentile: number;              // 0-100 user percentile
}
```

### Performance Analysis

```typescript
const history = await getUserPerformanceHistory(userId);

const avgAccuracy = 
  history.reduce((sum, h) => sum + h.accuracy_percentage, 0) / history.length;

const accuracyTrend = 
  history.slice(0, 5).reduce((sum, h) => sum + h.accuracy_percentage, 0) / 5
  - history.slice(-5).reduce((sum, h) => sum + h.accuracy_percentage, 0) / 5;

const avgSpeed = 
  history.reduce((sum, h) => sum + h.time_taken, 0) / history.length;
```

---

## 🔧 Configuration & Customization

### Modify Ranking Weights

Edit `calculate_final_weighted_score()` in ranking functions:

```sql
-- Current formula:
v_final_score := 
  (v_total_score * 0.40) +        -- Base: 40%
  (v_accuracy_score * 0.20) +     -- Accuracy: 20%
  (v_speed_score * 0.15) +        -- Speed: 15%
  (v_consistency_score * 0.15) +  -- Consistency: 15%
  (improvement * 0.10);            -- Improvement: 10%

-- Example: Increase accuracy importance to 30%
v_final_score := 
  (v_total_score * 0.30) +
  (v_accuracy_score * 0.30) +     -- Increased from 20%
  (v_speed_score * 0.15) +
  (v_consistency_score * 0.15) +
  (improvement * 0.10);
```

### Add Custom Badges

```sql
INSERT INTO public.achievements (
  badge_type, name, description, rarity,
  required_condition, xp_reward, reward_points
)
VALUES (
  'custom_name',
  'Badge Name',
  'Achievement Description',
  'epic',
  '{"custom_field": "value"}',
  500,  -- XP reward
  100   -- Point reward
);
```

### Adjust XP/Point Rewards

```typescript
// In your test completion handler:
const xpReward = Math.round(
  accuracy * 10 +              // 0-1000 based on accuracy
  (testsCompleted * 0.5) +     // Bonus for consistency
  (improvement > 0 ? 50 : 0)   // Bonus for improvement
);

const pointReward = Math.round(accuracy * 2);  // 0-200
```

---

## 🚨 Troubleshooting

### Leaderboard Not Updating

```sql
-- Check job state
SELECT * FROM public.ranking_job_state
WHERE status = 'failed'
ORDER BY last_run_at DESC
LIMIT 5;

-- Check error message and timestamp
-- Manually trigger:
SELECT * FROM public.execute_scheduled_jobs();
```

### Users Not Appearing

```sql
-- Ensure performance history is recorded
SELECT COUNT(*) FROM public.user_performance_history;

-- Check gamification profiles exist
SELECT COUNT(*) FROM public.user_gamification_profile;

-- Verify leaderboard entry exists
SELECT * FROM public.leaderboard_entries
WHERE user_id = 'user-id'
LIMIT 1;
```

### Real-Time Not Working

```sql
-- Verify realtime publications
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Should include:
-- leaderboard_entries
-- user_gamification_profile
-- user_achievements
-- user_streaks
```

### Anomalies Not Detected

```sql
-- Check anomaly logs
SELECT * FROM public.anomaly_logs
WHERE created_at > now() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Verify anomaly detection function runs
SELECT * FROM public.ranking_job_state
WHERE job_type = 'anomaly_detection'
ORDER BY last_run_at DESC;
```

---

## 📚 Usage Examples

### Complete Test Integration

```typescript
import {
  recordPerformanceHistory,
  validateAttempt,
  checkAndAwardAchievements,
  updateUserStreak,
} from '@/features/gamification';

async function submitTestResults(
  userId: string,
  attemptId: string,
  testData: TestData,
  answers: Answers
) {
  // Calculate metrics
  const { score, accuracy, correct, total, time } = calculateMetrics(
    testData,
    answers
  );

  // Step 1: Validate (anti-cheating check)
  const validation = await validateAttempt(
    userId,
    attemptId,
    testData.id,
    score
  );

  if (validation.shouldFlag) {
    // Handle flagged attempt
    console.warn('Suspicious activity detected:', validation.severity);
    // Option: Show warning, require verification, exclude from ranking, etc.
  }

  // Step 2: Record performance
  await recordPerformanceHistory(
    userId,
    attemptId,
    testData.id,
    score,
    testData.maxScore,
    accuracy,
    time,
    calculateDifficulty(testData),
    correct,
    total,
    calculateXp(accuracy, correct, total),
    calculatePoints(accuracy)
  );

  // Step 3: Update streak
  const streakResult = await updateUserStreak(userId, 'daily');
  console.log('Streak updated:', streakResult);

  // Step 4: Check achievements
  const gameStats = await useUserGameStats();
  await checkAndAwardAchievements(userId, {
    accuracy,
    testsCompleted: gameStats.totalTestsCompleted + 1,
    streak: streakResult.currentStreak,
  });

  // Step 5: Show success with rewards
  return {
    success: true,
    xpEarned: calculateXp(accuracy, correct, total),
    pointsEarned: calculatePoints(accuracy),
    newStreak: streakResult.currentStreak,
    validation,
  };
}
```

### Display User Dashboard

```typescript
import {
  UserProfileCard,
  RankBadges,
  StreakIndicator,
  PercentileComparison,
  useUserRank,
  useUserGameStats,
} from '@/features/gamification';

function UserDashboard() {
  const { rank } = useUserRank('weekly');
  const { stats } = useUserGameStats();

  if (!rank || !stats) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      <UserProfileCard
        userName={user.name}
        rank={rank.rank}
        totalXp={stats.totalXp}
        rewardPoints={stats.rewardPoints}
        accuracy={rank.accuracy}
        testsCompleted={rank.testsCompleted}
        currentStreak={stats.currentStreak}
      />

      <StreakIndicator
        currentStreak={stats.currentStreak}
        longestStreak={stats.longestStreak}
      />

      <PercentileComparison
        userPercentile={rank.percentile}
        userRank={rank.rank}
        totalUsers={5000}
      />

      <div className="col-span-2">
        <RankBadges
          rank={rank.rank}
          accuracy={rank.accuracy}
          speed={120}
          consistency={rank.consistency}
          testsCompleted={rank.testsCompleted}
          streak={stats.currentStreak}
        />
      </div>
    </div>
  );
}
```

---

## 📞 Support

For issues or questions:
1. Check GAMIFICATION_SETUP_GUIDE.md for detailed setup
2. Review RPC function implementations for edge cases
3. Check anomaly logs for anti-cheating insights
4. Monitor ranking_job_state for scheduler issues

---

**Version**: 1.0  
**Last Updated**: 2026-04-24  
**Status**: Production Ready  
**Maintenance**: Actively maintained

---

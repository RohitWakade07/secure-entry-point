# Gamification Leaderboard System - Integration Guide

## Overview

This document provides comprehensive instructions for integrating the gamification-driven leaderboard system into your GATE preparation application. The system includes real-time rankings, achievement badges, streak tracking, XP progression, anti-cheating mechanisms, and automated scheduled jobs.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React/TypeScript)                │
├─────────────────────────────────────────────────────────────┤
│  • LeaderboardDashboard (main page)                          │
│  • RankBadges, StreakIndicator, UserProfileCard             │
│  • PercentileComparison, RewardUnlocks                       │
│  • LeaderboardEntry, LeaderboardFilters components          │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│              API LAYER (leaderboard-api.ts)                 │
├─────────────────────────────────────────────────────────────┤
│  • Leaderboard retrieval & filtering                        │
│  • User gamification stats management                       │
│  • Performance history recording                            │
│  • Real-time subscriptions                                  │
│  • Anti-cheating validation                                 │
│  • Achievement tracking                                     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│         SUPABASE BACKEND (PostgreSQL + RPC)                 │
├─────────────────────────────────────────────────────────────┤
│  Database Tables:                                            │
│  ├─ leaderboards (weekly/monthly periods)                   │
│  ├─ leaderboard_entries (user rankings)                     │
│  ├─ user_gamification_profile (stats & progression)         │
│  ├─ user_performance_history (detailed metrics)             │
│  ├─ user_achievements (earned badges)                       │
│  ├─ user_streaks (daily/weekly consistency)                 │
│  ├─ anomaly_logs (anti-cheating detection)                  │
│  └─ ranking_job_state (scheduler tracking)                  │
│                                                              │
│  RPC Functions:                                              │
│  ├─ Ranking Calculation (metrics, scores, rankings)         │
│  ├─ Anti-Cheating Detection (6 anomaly types)               │
│  ├─ Scheduled Jobs (weekly/monthly/anomaly/streak)          │
│  └─ Utility Functions (XP, points, achievements)            │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Database Setup

### 1.1 Apply Migrations

Run the following migrations in order:

```bash
# Main gamification schema
supabase migration up 20260424000000

# Ranking calculation functions
supabase migration up 20260424000100

# Anti-cheating detection functions
supabase migration up 20260424000200

# Scheduled job functions
supabase migration up 20260424000300
```

### 1.2 Verify Schema

Check that all tables were created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%gamification%' OR table_name LIKE '%leaderboard%'
OR table_name LIKE '%achievement%' OR table_name LIKE '%streak%'
OR table_name LIKE '%anomaly%';
```

### 1.3 Initialize Achievement Data

The migration automatically inserts 16 default achievements. Verify:

```sql
SELECT COUNT(*) FROM public.achievements;  -- Should return 16
```

## Step 2: Frontend Integration

### 2.1 Install Required Hooks

Add the custom hooks to your imports:

```typescript
import {
  useLeaderboard,
  useUserRank,
  useUserGameStats,
  useRealTimeLeaderboard,
  useStreak,
} from "@/hooks/useLeaderboard";
```

### 2.2 Add Leaderboard Page Route

Update your routing configuration (typically in `App.tsx` or router config):

```typescript
import LeaderboardPage from "@/pages/LeaderboardPage";

// Add to your route definitions:
{
  path: "/leaderboard",
  element: <LeaderboardPage />
}
```

### 2.3 Add Navigation Links

Update your navigation component to include:

```typescript
<NavLink to="/leaderboard" label="Leaderboards" icon={Trophy} />
```

### 2.4 Import Gamification Components

The following components are available for reuse:

```typescript
import { LeaderboardDashboard } from "@/pages/LeaderboardPage";
import { RankBadges } from "@/components/gamification/RankBadges";
import { StreakIndicator } from "@/components/gamification/StreakIndicator";
import { UserProfileCard } from "@/components/gamification/UserProfileCard";
import { PercentileComparison } from "@/components/gamification/PercentileComparison";
import { RewardUnlocks } from "@/components/gamification/RewardUnlocks";
import { LeaderboardEntry } from "@/components/gamification/LeaderboardEntry";
import { LeaderboardFilters } from "@/components/gamification/LeaderboardFilters";
```

## Step 3: Integration with Existing Test System

### 3.1 Record Performance on Test Completion

Update your TestEnginePage to record performance:

```typescript
import { 
  recordPerformanceHistory, 
  validateAttempt,
  checkAndAwardAchievements,
  updateUserStreak 
} from "@/integrations/supabase/leaderboard-api";

// After test completion:
async function handleTestCompletion(attemptId: string) {
  const userId = user.id;
  const testId = test.id;
  const score = calculateScore(answers, questions);
  const maxScore = calculateMaxScore(questions);
  const accuracy = (correctCount / totalQuestions) * 100;
  const timeTaken = Math.round((endTime - startTime) / 1000);

  // Validate for cheating
  const validation = await validateAttempt(userId, attemptId, testId, score);
  
  if (validation.shouldFlag) {
    console.warn("Anomaly detected:", validation.severity);
    // Handle suspicious activity
  }

  // Record performance
  await recordPerformanceHistory(
    userId,
    attemptId,
    testId,
    score,
    maxScore,
    accuracy,
    timeTaken,
    "medium", // difficulty determined from questions
    correctCount,
    totalQuestions,
    100, // XP earned
    50   // Reward points earned
  );

  // Update streak
  await updateUserStreak(userId, "daily");

  // Check for achievements
  await checkAndAwardAchievements(userId, {
    accuracy,
    testsCompleted: userStats.totalTestsCompleted + 1
  });
}
```

### 3.2 Display Gamification in Performance Page

Add gamification stats to existing PerformancePage:

```typescript
import { useUserGameStats, useUserRank } from "@/hooks/useLeaderboard";
import { UserProfileCard } from "@/components/gamification/UserProfileCard";

export const PerformancePage = () => {
  const { stats, loading } = useUserGameStats();
  const { rank } = useUserRank("weekly");

  return (
    <div>
      {/* Existing performance content */}
      
      {/* Add gamification profile card */}
      <UserProfileCard
        userName={user?.user_metadata?.full_name}
        rank={rank?.rank}
        totalXp={stats?.totalXp || 0}
        rewardPoints={stats?.rewardPoints || 0}
        accuracy={stats?.overallAccuracy || 0}
        testsCompleted={stats?.totalTestsCompleted || 0}
        currentStreak={stats?.currentStreak || 0}
      />
    </div>
  );
};
```

## Step 4: Scheduling Setup

### 4.1 Option A: Using Supabase Edge Functions (Recommended)

Create a new edge function:

```bash
supabase functions new run-ranking-jobs
```

File: `supabase/functions/run-ranking-jobs/index.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export default async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response("Missing env vars", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Run all scheduled jobs
    const { data, error } = await supabase.rpc("execute_scheduled_jobs");

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, jobs: data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

Deploy the function:

```bash
supabase functions deploy run-ranking-jobs
```

### 4.2 Option B: Using External Cron Service

Use services like cron-job.org or Vercel Cron to call:

```
GET https://your-domain.com/api/ranking-jobs
```

### 4.3 Option C: Manual Trigger (Development)

For testing, manually call from TypeScript:

```typescript
const { data, error } = await supabase.rpc('execute_scheduled_jobs');
```

## Step 5: Anti-Cheating Configuration

### 5.1 Anomaly Detection Thresholds

Modify thresholds in RPC functions as needed:

```typescript
// In detect_score_spike function:
v_spike_threshold := GREATEST(
  v_previous_avg + (v_previous_stddev * 2.5), // Adjust multiplier (1.5-3.0)
  v_previous_avg * 2.0  // Adjust multiplier (1.5-3.0)
);
```

### 5.2 Admin Anomaly Review

Query flagged anomalies:

```sql
SELECT * FROM public.anomaly_logs
WHERE is_flagged = true
  AND is_verified = false
ORDER BY severity DESC, created_at DESC;
```

Review and act on anomalies:

```sql
SELECT * FROM public.review_anomaly(
  p_anomaly_id,
  p_action := 'disqualified' | 'approved' | 'reviewed',
  p_notes := 'explanation'
);
```

## Step 6: Real-Time Updates

The system automatically subscribes to real-time changes. No additional setup needed for:

- Leaderboard entry updates
- User profile stat changes
- New achievements
- Ranking changes

Subscriptions are managed automatically in hooks using Supabase realtime.

## Step 7: Customization Options

### 7.1 Modify Ranking Formula

Edit `calculate_final_weighted_score` function:

```sql
-- Current weights:
v_final_score := 
  (v_total_score * 0.40) +        -- 40% base score
  (v_accuracy_score * 0.20) +     -- 20% accuracy
  (v_speed_score * 0.15) +        -- 15% speed
  (v_consistency_score * 0.15) +  -- 15% consistency
  (improvement * 0.10);            -- 10% improvement

-- Customize weights as needed
```

### 7.2 Add New Badges

```sql
INSERT INTO public.achievements (
  badge_type, name, description, rarity, 
  required_condition, xp_reward, reward_points
)
VALUES (
  'custom_badge',
  'Badge Name',
  'Badge Description',
  'epic',
  '{"custom": "condition"}',
  500,
  100
);
```

### 7.3 Adjust XP Rewards

Modify in performance history recording:

```typescript
xpEarned: Math.round(accuracy * testsCompleted * 10), // Customize calculation
pointsEarned: Math.round(accuracy * 2)  // Customize calculation
```

## Step 8: Analytics & Reporting

### 8.1 Leaderboard Analytics

```sql
-- Top performers this week
SELECT * FROM public.get_current_leaderboard('weekly')
LIMIT 10;

-- User progression
SELECT 
  DATE(submitted_at) as date,
  AVG(score) as avg_score,
  AVG(accuracy_percentage) as avg_accuracy,
  COUNT(*) as tests_taken
FROM public.user_performance_history
WHERE user_id = 'user-id'
GROUP BY DATE(submitted_at)
ORDER BY date DESC;

-- Anomaly summary
SELECT 
  anomaly_type,
  severity,
  COUNT(*) as count
FROM public.anomaly_logs
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY anomaly_type, severity;
```

### 8.2 Export Rankings

```typescript
const { data } = await supabase
  .from('leaderboard_entries')
  .select('*')
  .eq('leaderboard_id', leaderboardId)
  .order('rank');

// Export to CSV
```

## Step 9: Troubleshooting

### Issue: Leaderboard not updating

**Solution**: Check job state:

```sql
SELECT * FROM public.ranking_job_state
WHERE status = 'failed'
ORDER BY last_run_at DESC;
```

### Issue: Users not getting achievements

**Solution**: Check achievement logs:

```sql
SELECT * FROM public.user_achievements
WHERE created_at > now() - INTERVAL '24 hours'
ORDER BY achieved_at DESC;
```

### Issue: Real-time updates not working

**Solution**: Verify realtime publication:

```sql
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

## Performance Optimization

### 1. Query Optimization

Indexes are automatically created for:
- `leaderboard_entries(rank)`
- `user_performance_history(user_id, submitted_at)`
- `anomaly_logs(user_id, created_at)`
- `user_achievements(user_id)`

### 2. Caching Strategy

Implement client-side caching:

```typescript
const { data, isLoading } = useLeaderboard('weekly');

// Data is automatically refreshed on realtime updates
// Implement stale-while-revalidate pattern for optimal UX
```

### 3. Pagination

Leaderboard is paginated to top 500 by default. Modify in:

```typescript
// leaderboard-api.ts
LIMIT 500; // Adjust as needed
```

## Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS policies enabled
2. **Server-Side Validation**: All score calculations use database functions
3. **Anomaly Detection**: 6-tier anti-cheating system
4. **Admin Functions**: Protected with role-based access

## Future Extensions

The system is designed for easy extension. Examples:

- Subject-wise leaderboards
- Friend/group competitions
- Referral competitions
- Clan/team battles
- Seasonal tournaments
- AI-personalized quests
- Challenge systems

## Support & Maintenance

- Monitor `ranking_job_state` for job failures
- Review `anomaly_logs` weekly for potential fraud
- Update achievement criteria as needed
- Adjust ranking weights based on feedback

---

**Version**: 1.0  
**Last Updated**: 2026-04-24  
**Status**: Production Ready

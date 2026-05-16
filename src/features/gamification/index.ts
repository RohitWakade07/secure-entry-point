// =====================================================
// GAMIFICATION SYSTEM - BARREL EXPORTS
// Central export file for all gamification components and utilities
// =====================================================

// =====================================================
// API & Utilities
// =====================================================

export * from "@/integrations/supabase/leaderboard-api";

// =====================================================
// Hooks
// =====================================================

export {
  useLeaderboard,
  useUserRank,
  useUserGameStats,
  useStreak,
  usePerformanceHistory,
  useLeaderboardPeriods,
  useRealTimeLeaderboard,
} from "@/hooks/useLeaderboard";

// =====================================================
// Components - Gamification
// =====================================================

export { RankBadges } from "@/components/gamification/RankBadges";
export { StreakIndicator } from "@/components/gamification/StreakIndicator";
export { UserProfileCard } from "@/components/gamification/UserProfileCard";
export { PercentileComparison } from "@/components/gamification/PercentileComparison";
export { LeaderboardEntry } from "@/components/gamification/LeaderboardEntry";
export { LeaderboardFilters } from "@/components/gamification/LeaderboardFilters";
export { RewardUnlocks } from "@/components/gamification/RewardUnlocks";

// =====================================================
// Pages
// =====================================================

export { default as LeaderboardPage } from "@/pages/LeaderboardPage";

// =====================================================
// Types & Interfaces
// =====================================================

export type {
  LeaderboardPeriod,
  UserRank,
  UserGameStats,
  Achievement,
  Badge,
  AnomalyLog,
} from "@/integrations/supabase/leaderboard-api";

// =====================================================
// END OF EXPORTS
// =====================================================

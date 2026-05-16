import { supabase } from "@/integrations/supabase/client";

// =====================================================
// GAMIFICATION RANKING API UTILITIES
// =====================================================

export type LeaderboardPeriod = "weekly" | "monthly";

export interface UserRank {
  rank: number;
  userId: string;
  userName: string;
  finalScore: number;
  totalMarks: number;
  accuracy: number;
  testsCompleted: number;
  consistency: number;
  improvement: number;
  percentile: number;
}

export interface UserGameStats {
  totalXp: number;
  rewardPoints: number;
  currentStreak: number;
  longestStreak: number;
  totalTestsCompleted: number;
  overallAccuracy: number;
  achievements: Achievement[];
  badges: Badge[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  achievedAt: string;
}

export interface Badge {
  type: string;
  name: string;
  achievedAt: string;
}

export interface AnomalyLog {
  id: string;
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  isFlagged: boolean;
  isVerified: boolean;
}

// =====================================================
// 1. LEADERBOARD RETRIEVAL FUNCTIONS
// =====================================================

export async function getCurrentLeaderboard(
  period: LeaderboardPeriod,
  limit: number = 100
): Promise<UserRank[]> {
  try {
    const { data, error } = await supabase.rpc("get_current_leaderboard", {
      p_period: period,
    });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      rank: row.rank,
      userId: row.user_id,
      userName: row.user_name,
      finalScore: row.weighted_final_score,
      totalMarks: row.total_marks,
      accuracy: row.accuracy_percentage,
      testsCompleted: row.tests_completed,
      consistency: row.consistency_score,
      improvement: row.improvement_score,
      percentile: row.percentile,
    }));
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }
}

export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod
): Promise<UserRank | null> {
  try {
    const { data, error } = await supabase.rpc("get_user_leaderboard_rank", {
      p_user_id: userId,
      p_period: period,
    });

    if (error) throw error;

    if (!data || data.length === 0) return null;

    const row = data[0];
    return {
      rank: row.rank,
      userId: userId,
      userName: "",
      finalScore: row.weighted_final_score,
      totalMarks: row.total_marks,
      accuracy: row.accuracy_percentage,
      testsCompleted: row.tests_completed,
      consistency: 0,
      improvement: 0,
      percentile: row.percentile,
    };
  } catch (error) {
    console.error("Error fetching user rank:", error);
    throw error;
  }
}

export async function getLeaderboardRangeByRank(
  period: LeaderboardPeriod,
  startRank: number,
  endRank: number
): Promise<UserRank[]> {
  try {
    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select(
        `
        rank,
        user_id,
        profiles(full_name),
        weighted_final_score,
        total_marks,
        accuracy_percentage,
        tests_completed,
        consistency_score,
        improvement_score,
        percentile
      `
      )
      .eq(
        "leaderboard_id",
        supabase
          .from("leaderboards")
          .select("id")
          .eq("period", period)
          .eq("is_current", true)
      )
      .gte("rank", startRank)
      .lte("rank", endRank)
      .order("rank", { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      rank: row.rank,
      userId: row.user_id,
      userName: row.profiles?.full_name || "Anonymous",
      finalScore: row.weighted_final_score,
      totalMarks: row.total_marks,
      accuracy: row.accuracy_percentage,
      testsCompleted: row.tests_completed,
      consistency: row.consistency_score,
      improvement: row.improvement_score,
      percentile: row.percentile,
    }));
  } catch (error) {
    console.error("Error fetching leaderboard range:", error);
    throw error;
  }
}

// =====================================================
// 2. USER GAMIFICATION PROFILE
// =====================================================

export async function getUserGameStats(userId: string): Promise<UserGameStats> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("user_gamification_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) throw profileError;

    const { data: achievements, error: achievementsError } = await supabase
      .from("user_achievements")
      .select(
        `
        *,
        achievements(name, description, icon_url, rarity)
      `
      )
      .eq("user_id", userId);

    if (achievementsError) throw achievementsError;

    return {
      totalXp: profile?.total_xp || 0,
      rewardPoints: profile?.reward_points || 0,
      currentStreak: profile?.current_streak || 0,
      longestStreak: profile?.longest_streak || 0,
      totalTestsCompleted: profile?.total_tests_completed || 0,
      overallAccuracy: profile?.overall_accuracy || 0,
      achievements: (achievements || []).map((a: any) => ({
        id: a.achievement_id,
        name: a.achievements?.name || "",
        description: a.achievements?.description || "",
        icon: a.achievements?.icon_url || "",
        rarity: a.achievements?.rarity || "common",
        achievedAt: a.achieved_at,
      })),
      badges: [], // Badges are subset of achievements
    };
  } catch (error) {
    console.error("Error fetching user game stats:", error);
    throw error;
  }
}

export async function updateUserXp(userId: string, xpAmount: number) {
  try {
    const { data: current, error: fetchError } = await supabase
      .from("user_gamification_profile")
      .select("total_xp")
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const newXp = (current?.total_xp || 0) + xpAmount;

    const { error: updateError } = await supabase
      .from("user_gamification_profile")
      .update({ total_xp: newXp, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    return newXp;
  } catch (error) {
    console.error("Error updating user XP:", error);
    throw error;
  }
}

export async function updateRewardPoints(userId: string, points: number) {
  try {
    const { data: current, error: fetchError } = await supabase
      .from("user_gamification_profile")
      .select("reward_points")
      .eq("user_id", userId)
      .single();

    if (fetchError) throw fetchError;

    const newPoints = (current?.reward_points || 0) + points;

    const { error: updateError } = await supabase
      .from("user_gamification_profile")
      .update({
        reward_points: newPoints,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) throw updateError;

    return newPoints;
  } catch (error) {
    console.error("Error updating reward points:", error);
    throw error;
  }
}

// =====================================================
// 3. STREAK MANAGEMENT
// =====================================================

export async function updateUserStreak(
  userId: string,
  streakType: "daily" | "weekly"
) {
  try {
    const { data: streak, error: fetchError } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .eq("streak_type", streakType)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newCount = 1;
    let longestCount = 1;

    if (streak && streak.last_test_date) {
      const lastTestDate = new Date(streak.last_test_date);
      lastTestDate.setHours(0, 0, 0, 0);

      const timeDiff = today.getTime() - lastTestDate.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        // Streak continues
        newCount = (streak.consecutive_days || 0) + 1;
        longestCount = Math.max(newCount, streak.longest_streak_count || 0);
      } else if (daysDiff > 1) {
        // Streak breaks
        newCount = 1;
        longestCount = streak.longest_streak_count || 1;
      } else {
        // Same day
        newCount = streak.consecutive_days || 1;
        longestCount = streak.longest_streak_count || 1;
      }
    }

    const { error: updateError } = await supabase
      .from("user_streaks")
      .upsert(
        {
          user_id: userId,
          streak_type: streakType,
          current_streak_count: newCount,
          longest_streak_count: longestCount,
          consecutive_days: newCount,
          last_test_date: new Date().toISOString(),
        },
        { onConflict: "user_id,streak_type" }
      );

    if (updateError) throw updateError;

    return { currentStreak: newCount, longestStreak: longestCount };
  } catch (error) {
    console.error("Error updating streak:", error);
    throw error;
  }
}

// =====================================================
// 4. PERFORMANCE HISTORY
// =====================================================

export async function recordPerformanceHistory(
  userId: string,
  attemptId: string,
  testId: string,
  score: number,
  maxScore: number,
  accuracy: number,
  timeTaken: number,
  difficulty: string,
  questionsCorrect: number,
  questionsTotal: number,
  xpEarned: number = 0,
  pointsEarned: number = 0
) {
  try {
    const { error } = await supabase.from("user_performance_history").insert({
      user_id: userId,
      attempt_id: attemptId,
      test_id: testId,
      score: score,
      max_possible_score: maxScore,
      accuracy_percentage: accuracy,
      time_taken: timeTaken,
      difficulty_level: difficulty,
      questions_correct: questionsCorrect,
      questions_total: questionsTotal,
      xp_earned: xpEarned,
      reward_points_earned: pointsEarned,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error recording performance history:", error);
    throw error;
  }
}

export async function getUserPerformanceHistory(
  userId: string,
  limit: number = 50
) {
  try {
    const { data, error } = await supabase
      .from("user_performance_history")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Error fetching performance history:", error);
    throw error;
  }
}

// =====================================================
// 5. ANTI-CHEATING VALIDATION
// =====================================================

export async function validateAttempt(
  userId: string,
  attemptId: string,
  testId: string,
  score: number
): Promise<{
  isValid: boolean;
  hasAnomalies: boolean;
  severity: string;
  shouldFlag: boolean;
}> {
  try {
    const { data, error } = await supabase.rpc("validate_score_submission", {
      p_user_id: userId,
      p_attempt_id: attemptId,
      p_test_id: testId,
      p_score: score,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        isValid: true,
        hasAnomalies: false,
        severity: "low",
        shouldFlag: false,
      };
    }

    const result = data[0];
    return {
      isValid: result.is_valid,
      hasAnomalies: result.has_anomalies,
      severity: result.severity,
      shouldFlag: result.should_flag,
    };
  } catch (error) {
    console.error("Error validating attempt:", error);
    throw error;
  }
}

export async function getAnomalyLogs(
  userId: string
): Promise<AnomalyLog[]> {
  try {
    const { data, error } = await supabase
      .from("anomaly_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((log: any) => ({
      id: log.id,
      anomalyType: log.anomaly_type,
      severity: log.severity,
      description: log.description,
      isFlagged: log.is_flagged,
      isVerified: log.is_verified,
    }));
  } catch (error) {
    console.error("Error fetching anomaly logs:", error);
    throw error;
  }
}

// =====================================================
// 6. ACHIEVEMENTS & BADGES
// =====================================================

export async function checkAndAwardAchievements(
  userId: string,
  metrics: {
    rank?: number;
    accuracy?: number;
    testsCompleted?: number;
    streak?: number;
  }
) {
  try {
    const achievementsToCheck = [];

    if (metrics.rank && metrics.rank <= 10) {
      achievementsToCheck.push("top_10");
    }
    if (metrics.rank && metrics.rank <= 100) {
      achievementsToCheck.push("top_100");
    }
    if (metrics.accuracy && metrics.accuracy >= 90 && metrics.testsCompleted && metrics.testsCompleted >= 10) {
      achievementsToCheck.push("accuracy_master");
    }
    if (metrics.streak && metrics.streak >= 7) {
      achievementsToCheck.push("streak_7");
    }
    if (metrics.streak && metrics.streak >= 14) {
      achievementsToCheck.push("streak_14");
    }
    if (metrics.streak && metrics.streak >= 30) {
      achievementsToCheck.push("streak_30");
    }
    if (metrics.testsCompleted === 50) {
      achievementsToCheck.push("milestone_50");
    }
    if (metrics.testsCompleted === 100) {
      achievementsToCheck.push("milestone_100");
    }
    if (metrics.testsCompleted === 500) {
      achievementsToCheck.push("milestone_500");
    }

    for (const badgeType of achievementsToCheck) {
      const { data: achievement } = await supabase
        .from("achievements")
        .select("id")
        .eq("badge_type", badgeType)
        .single();

      if (achievement) {
        await supabase.from("user_achievements").upsert(
          {
            user_id: userId,
            achievement_id: achievement.id,
            achieved_at: new Date().toISOString(),
          },
          { onConflict: "user_id,achievement_id" }
        );
      }
    }
  } catch (error) {
    console.error("Error checking achievements:", error);
    // Don't throw - achievement check shouldn't block main flow
  }
}

// =====================================================
// 7. REAL-TIME SUBSCRIPTIONS
// =====================================================

export function subscribeToLeaderboardChanges(
  period: LeaderboardPeriod,
  callback: (data: UserRank[]) => void
) {
  return supabase
    .from("leaderboard_entries")
    .on("*", (payload) => {
      // Fetch updated leaderboard when changes occur
      getCurrentLeaderboard(period).then(callback);
    })
    .subscribe();
}

export function subscribeToUserStats(
  userId: string,
  callback: (stats: UserGameStats) => void
) {
  return supabase
    .from("user_gamification_profile")
    .on("UPDATE", (payload) => {
      if (payload.new.user_id === userId) {
        getUserGameStats(userId).then(callback);
      }
    })
    .subscribe();
}

// =====================================================
// END OF LEADERBOARD API UTILITIES
// =====================================================

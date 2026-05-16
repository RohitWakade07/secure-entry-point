import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCurrentLeaderboard,
  getUserRank,
  getUserGameStats,
  updateUserStreak,
  getUserPerformanceHistory,
  LeaderboardPeriod,
  UserRank,
  UserGameStats,
} from "@/integrations/supabase/leaderboard-api";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// =====================================================
// HOOK: useLeaderboard
// =====================================================

export const useLeaderboard = (period: LeaderboardPeriod = "weekly") => {
  const [data, setData] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const leaderboardData = await getCurrentLeaderboard(period, 100);
      setData(leaderboardData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leaderboard");
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLeaderboard();

    // Set up real-time subscription
    const subscription = supabase
      .from("leaderboard_entries")
      .on("*", () => {
        fetchLeaderboard(); // Refresh on any changes
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [period, fetchLeaderboard]);

  const refetch = useCallback(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, lastUpdated, refetch };
};

// =====================================================
// HOOK: useUserRank
// =====================================================

export const useUserRank = (period: LeaderboardPeriod = "weekly") => {
  const { user } = useAuth();
  const [rank, setRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRank = async () => {
      try {
        setLoading(true);
        const userRank = await getUserRank(user.id, period);
        setRank(userRank);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch rank");
        console.error("Error fetching user rank:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRank();

    // Subscribe to rank updates
    const subscription = supabase
      .from("leaderboard_entries")
      .on("UPDATE", (payload) => {
        if (payload.new.user_id === user.id) {
          fetchRank();
        }
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user, period]);

  return { rank, loading, error };
};

// =====================================================
// HOOK: useUserGameStats
// =====================================================

export const useUserGameStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserGameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);
        const gameStats = await getUserGameStats(user.id);
        setStats(gameStats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch game stats");
        console.error("Error fetching game stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to stats updates
    const subscription = supabase
      .from("user_gamification_profile")
      .on("UPDATE", (payload) => {
        if (payload.new.user_id === user.id) {
          fetchStats();
        }
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user]);

  return { stats, loading, error };
};

// =====================================================
// HOOK: useStreak
// =====================================================

export const useStreak = () => {
  const { user } = useAuth();
  const [streaks, setStreaks] = useState<
    Record<string, { current: number; longest: number }> | null
  >(null);
  const [loading, setLoading] = useState(false);

  const updateStreak = useCallback(
    async (type: "daily" | "weekly" = "daily") => {
      if (!user) return;

      try {
        setLoading(true);
        const result = await updateUserStreak(user.id, type);
        setStreaks((prev) => ({
          ...prev,
          [type]: {
            current: result.currentStreak,
            longest: result.longestStreak,
          },
        }));
      } catch (err) {
        console.error("Error updating streak:", err);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  return { streaks, loading, updateStreak };
};

// =====================================================
// HOOK: usePerformanceHistory
// =====================================================

export const usePerformanceHistory = (limit: number = 50) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getUserPerformanceHistory(user.id, limit);
        setHistory(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch history");
        console.error("Error fetching performance history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    // Subscribe to new performance entries
    const subscription = supabase
      .from("user_performance_history")
      .on("INSERT", (payload) => {
        if (payload.new.user_id === user.id) {
          setHistory((prev) => [payload.new, ...prev].slice(0, limit));
        }
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [user, limit]);

  return { history, loading, error };
};

// =====================================================
// HOOK: useLeaderboardPeriods
// =====================================================

export const useLeaderboardPeriods = () => {
  const [weeklyData, setWeeklyData] = useState<UserRank[]>([]);
  const [monthlyData, setMonthlyData] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllPeriods = async () => {
      try {
        setLoading(true);
        const [weekly, monthly] = await Promise.all([
          getCurrentLeaderboard("weekly"),
          getCurrentLeaderboard("monthly"),
        ]);
        setWeeklyData(weekly);
        setMonthlyData(monthly);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        console.error("Error fetching leaderboard periods:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPeriods();
  }, []);

  return { weeklyData, monthlyData, loading, error };
};

// =====================================================
// HOOK: useRealTimeLeaderboard
// =====================================================

export const useRealTimeLeaderboard = (
  period: LeaderboardPeriod = "weekly"
) => {
  const [leaderboard, setLeaderboard] = useState<UserRank[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "error"
  >("disconnected");

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const initializeConnection = async () => {
      try {
        setIsInitializing(true);
        setConnectionStatus("connected");

        // Initial fetch
        const initialData = await getCurrentLeaderboard(period);
        setLeaderboard(initialData);

        // Subscribe to real-time updates
        channel = supabase
          .from("leaderboard_entries")
          .on("UPDATE", () => {
            // Refresh leaderboard on any changes
            getCurrentLeaderboard(period).then(setLeaderboard);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setError(null);
            } else if (status === "CHANNEL_ERROR") {
              setConnectionStatus("error");
              setError("Failed to connect to real-time updates");
            }
          });

        setError(null);
      } catch (err) {
        setConnectionStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to initialize"
        );
        console.error("Error initializing real-time leaderboard:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeConnection();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [period]);

  return { leaderboard, isInitializing, error, connectionStatus };
};

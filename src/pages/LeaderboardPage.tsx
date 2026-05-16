import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useLeaderboard,
  useUserRank,
  useUserGameStats,
  useRealTimeLeaderboard,
} from "@/hooks/useLeaderboard";
import { LeaderboardFilters } from "@/components/gamification/LeaderboardFilters";
import { LeaderboardEntry } from "@/components/gamification/LeaderboardEntry";
import { UserProfileCard } from "@/components/gamification/UserProfileCard";
import { RankBadges } from "@/components/gamification/RankBadges";
import { PercentileComparison } from "@/components/gamification/PercentileComparison";
import { StreakIndicator } from "@/components/gamification/StreakIndicator";
import { RewardUnlocks } from "@/components/gamification/RewardUnlocks";
import {
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Share2,
  Trophy,
} from "lucide-react";
import { motion } from "framer-motion";

type LeaderboardPeriod = "weekly" | "monthly";

export default function LeaderboardDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [filterType, setFilterType] = useState<"global" | "friends" | "nearby">(
    "global"
  );
  const [sortBy, setSortBy] = useState<
    "score" | "accuracy" | "consistency" | "improvement"
  >("score");
  const [displayRange, setDisplayRange] = useState({ start: 0, end: 100 });

  const { data: leaderboard, loading: leaderboardLoading, error: leaderboardError } =
    useLeaderboard(period);
  const { rank: userRank, loading: rankLoading } = useUserRank(period);
  const { stats: gameStats, loading: statsLoading } = useUserGameStats();
  const {
    leaderboard: realTimeData,
    connectionStatus,
  } = useRealTimeLeaderboard(period);

  // Use real-time data if available, fallback to regular data
  const displayData = realTimeData.length > 0 ? realTimeData : leaderboard;

  // Sort data based on selected sort option
  const sortedData = [...displayData].sort((a, b) => {
    switch (sortBy) {
      case "accuracy":
        return b.accuracy - a.accuracy;
      case "consistency":
        return b.consistency - a.consistency;
      case "improvement":
        return b.improvement - a.improvement;
      case "score":
      default:
        return b.finalScore - a.finalScore;
    }
  });

  // Filter data based on filter type
  const filteredData = filterType === "global" ? sortedData : sortedData.slice(0, 100);

  // Paginate data for display
  const paginatedData = filteredData.slice(displayRange.start, displayRange.end);

  const totalPages = Math.ceil(filteredData.length / (displayRange.end - displayRange.start));
  const currentPage = Math.floor(displayRange.start / (displayRange.end - displayRange.start)) + 1;

  const handlePageChange = (direction: "next" | "prev") => {
    const pageSize = displayRange.end - displayRange.start;
    if (direction === "next" && currentPage < totalPages) {
      setDisplayRange({
        start: displayRange.start + pageSize,
        end: displayRange.end + pageSize,
      });
    } else if (direction === "prev" && currentPage > 1) {
      setDisplayRange({
        start: displayRange.start - pageSize,
        end: displayRange.end - pageSize,
      });
    }
  };

  // Mock rewards data (in production, fetch from backend)
  const mockRewards = [
    {
      id: "1",
      name: "First Test",
      description: "Complete your first test",
      icon: "trophy" as const,
      amount: 50,
      unlockedAt: new Date().toISOString(),
      isNew: true,
    },
    {
      id: "2",
      name: "Accuracy Pro",
      description: "Achieve 80%+ accuracy",
      icon: "star" as const,
      amount: 100,
      unlockedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leaderboards</h1>
            <p className="text-gray-600 mt-1">
              Compete with other users and climb the rankings
            </p>
          </div>
          {connectionStatus === "connected" && (
            <Badge className="bg-green-600 gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live Updates
            </Badge>
          )}
          {connectionStatus === "error" && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" />
              Offline
            </Badge>
          )}
        </div>

        {/* Errors */}
        {leaderboardError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{leaderboardError}</AlertDescription>
          </Alert>
        )}

        {/* User Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Rank Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {rankLoading ? (
              <Skeleton className="h-64" />
            ) : userRank ? (
              <UserProfileCard
                userName={user?.user_metadata?.full_name || "Anonymous"}
                rank={userRank.rank}
                totalXp={gameStats?.totalXp || 0}
                rewardPoints={gameStats?.rewardPoints || 0}
                accuracy={userRank.accuracy}
                testsCompleted={userRank.testsCompleted}
                currentStreak={gameStats?.currentStreak || 0}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-600">
                    Start taking tests to appear on the leaderboard
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Percentile Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {rankLoading ? (
              <Skeleton className="h-64" />
            ) : userRank ? (
              <PercentileComparison
                userPercentile={userRank.percentile}
                userRank={userRank.rank}
                totalUsers={displayData.length}
              />
            ) : null}
          </motion.div>

          {/* Streak & Rewards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {statsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <StreakIndicator
                  currentStreak={gameStats?.currentStreak || 0}
                  longestStreak={gameStats?.longestStreak || 0}
                  lastActivityDate={gameStats?.totalTestsCompleted ? new Date().toISOString() : undefined}
                />
              </>
            )}
          </motion.div>
        </div>

        {/* Badges */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200"
          >
            <div className="flex items-start gap-4">
              <Trophy className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-gray-900">Your Achievements</p>
                <RankBadges
                  rank={userRank.rank}
                  accuracy={userRank.accuracy}
                  speed={120} // Default speed
                  consistency={userRank.consistency}
                  testsCompleted={userRank.testsCompleted}
                  streak={gameStats?.currentStreak || 0}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Rewards Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RewardUnlocks
            rewards={mockRewards}
            totalXp={gameStats?.totalXp || 0}
            totalPoints={gameStats?.rewardPoints || 0}
          />
        </motion.div>

        {/* Filters and Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <LeaderboardFilters
            period={period}
            onPeriodChange={setPeriod}
            filterType={filterType}
            onFilterChange={setFilterType}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isLoading={leaderboardLoading}
          />

          {/* Leaderboard Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Rankings
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange("prev")}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange("next")}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {leaderboardLoading ? (
                <div className="space-y-2">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  No data available. Start taking tests to appear on the leaderboard.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-bold">Rank</TableHead>
                        <TableHead className="font-bold">User</TableHead>
                        <TableHead className="text-right font-bold">Score</TableHead>
                        <TableHead className="text-center font-bold">Tests</TableHead>
                        <TableHead className="text-center font-bold">
                          Consistency
                        </TableHead>
                        <TableHead className="text-center font-bold">
                          Trend
                        </TableHead>
                        <TableHead className="text-right font-bold">
                          Percentile
                        </TableHead>
                        {userRank && <TableHead className="text-center font-bold"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((entry, idx) => (
                        <LeaderboardEntry
                          key={entry.userId}
                          rank={entry.rank}
                          userName={entry.userName}
                          score={entry.finalScore}
                          accuracy={entry.accuracy}
                          testsCompleted={entry.testsCompleted}
                          consistency={entry.consistency}
                          improvement={entry.improvement}
                          percentile={entry.percentile}
                          isCurrentUser={
                            userRank ? entry.userId === user?.id : false
                          }
                          animationDelay={idx}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Share Section */}
        {userRank && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center"
          >
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => {
                const shareText = `I'm ranked #${userRank.rank} on the GATE leaderboard with ${userRank.finalScore.toFixed(0)} points and ${userRank.accuracy.toFixed(1)}% accuracy! Can you beat my score? 🚀`;
                navigator.share
                  ? navigator.share({
                      title: "My Leaderboard Ranking",
                      text: shareText,
                    })
                  : navigator.clipboard.writeText(shareText);
              }}
            >
              <Share2 className="w-4 h-4" />
              Share My Ranking
            </Button>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
